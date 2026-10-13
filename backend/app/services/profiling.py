from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.combo import Combo
from app.schemas.advisory import ProfileIn


async def build_profile(data: ProfileIn, db: AsyncSession) -> dict:
    a = data.answers
    devices = data.configuration.devices if data.configuration else []
    cameras = sum(d.kind in {"cctv", "ip-camera"} for d in devices)
    automation = (
        a.need == "domotica"
        or bool(set(a.goals) & {"dispositivos", "iluminacion"})
        or any(d.kind in {"light", "switch", "outlet", "touchscreen"} for d in devices)
    )
    advanced = (
        a.property == "edificio"
        or a.units > 1
        or a.infrastructure == "shared"
        or bool(set(a.goals) & {"procesamiento_local", "integraciones"})
        or any(d.kind in {"rack", "server"} for d in devices)
    )
    estimate = max(a.areas or 0, cameras) or None
    reasons, pending = (
        [],
        [
            "Revisar distancias, alimentación, ubicación definitiva y alcance de instalación",
            "Confirmar equipos, disponibilidad y presupuesto con un asesor",
        ],
    )
    if not a.areas:
        pending.append("Confirmar la cantidad de áreas y puntos de vigilancia")
    if a.connectivity in {"desconocido", "sin_conexion"}:
        pending.append("Evaluar cobertura de red y necesidades de conectividad")
    if a.existing != "no":
        pending.append("Verificar compatibilidad y estado de los equipos existentes")
    custom = (
        a.preference == "personalizado"
        or a.need in {"mejora", "integral"}
        or a.existing == "si"
        or estimate is None
        or estimate > 12
        or a.environment == "asesoria"
    )
    combo_ids = []
    suggested_count = None
    if advanced:
        category = "Proyecto integral avanzado"
        reasons.append(
            "Los objetivos incluyen infraestructura, integración o varias viviendas; requieren dimensionamiento y permisos independientes."
        )
    elif automation:
        category = "Seguridad con automatización y domótica"
        reasons.append(
            "La iluminación o los dispositivos inteligentes requieren reglas e integración adicionales al CCTV."
        )
    elif custom:
        category = "Instalación de seguridad personalizada"
        reasons.append(
            "El alcance declarado, la instalación existente o la información pendiente justifican una revisión a medida."
        )
    else:
        combos = (
            (
                await db.execute(
                    select(Combo)
                    .where(
                        Combo.active.is_(True),
                        Combo.level.isnot(None),
                        Combo.cameras_count >= estimate,
                    )
                    .order_by(Combo.cameras_count, Combo.id)
                )
            )
            .scalars()
            .all()
        )
        fitting = [
            c
            for c in combos
            if c.cameras_count in {4, 8, 12}
            and (a.environment == "interior" or c.mode in {"cableado", "hibrido"})
        ]
        if fitting:
            suggested_count = fitting[0].cameras_count
            combo_ids = [c.id for c in fitting if c.cameras_count == suggested_count][
                :4
            ]
            category = (
                "Combo CCTV básico" if suggested_count == 4 else "Combo CCTV ampliado"
            )
            reasons.append(
                f"Un combo activo de {suggested_count} cámaras puede cubrir los {estimate} puntos declarados; la ubicación y especificaciones se verifican antes de cotizar."
            )
        else:
            category = "Instalación de seguridad personalizada"
            reasons.append(
                "No hay un combo activo de 4, 8 o 12 cámaras que corresponda al alcance declarado. Un asesor ajustará la propuesta."
            )
    if automation and a.installation == "electrica_integrada":
        pending.append("Visita para evaluar circuitos, cargas y alcance eléctrico")
    return {
        "category": category,
        "property": a.property,
        "main_need": a.need,
        "complexity": "alta"
        if advanced or estimate and estimate > 12
        else "media"
        if custom or automation or a.environment == "ambos"
        else "basica",
        "estimated_cameras": estimate,
        "planned_devices": len(devices),
        "installation_points": sum(d.kind not in {"server", "network", "rack"} for d in devices),
        "automation": automation,
        "infrastructure": a.infrastructure,
        "units": a.units,
        "suggested_combo_count": suggested_count,
        "combo_ids": combo_ids,
        "reasons": reasons,
        "pending": pending,
        "preliminary": True,
        "advisor_review_required": True,
    }
