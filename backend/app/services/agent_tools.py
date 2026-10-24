from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import select

from app.models.banner import Banner
from app.models.business import AgentProposal, Appointment
from app.models.combo import Combo
from app.models.price_change_log import PriceChangeLog
from app.models.product import Product
from app.models.prospect import Prospect
from app.services.agenda import serialize, utc
from app.services.business_agent import catalogue

ENTITIES = {"product": (Product, {"name", "description", "price", "instalacion_price", "category", "active", "sort_order"}), "combo": (Combo, {"name", "equipment_price", "install_fee", "active", "is_bestseller", "is_budget"}), "banner": (Banner, {"title", "subtitle", "active", "position"}), "prospect": (Prospect, {"status", "advisor_notes"})}
MONEY = {"price", "instalacion_price", "equipment_price", "install_fee"}


def snapshot(row, fields):
    return {key: str(getattr(row, key)) if isinstance(getattr(row, key), Decimal) else getattr(row, key) for key in fields}


def clean_changes(entity, changes):
    if not isinstance(entity, str) or entity not in ENTITIES or not isinstance(changes, dict) or not changes or set(changes) - ENTITIES[entity][1]:
        raise HTTPException(422, "Acción o campos fuera de los permisos del agente")
    clean = {}
    for key, value in changes.items():
        if key in MONEY:
            try:
                number = Decimal(str(value))
                if not number.is_finite() or number < 0 or number > 9999999999 or number.as_tuple().exponent < -2:
                    raise ValueError()
                clean[key] = str(number)
            except (InvalidOperation, ValueError):
                raise HTTPException(422, "Precio inválido")
        elif key in {"active", "is_bestseller", "is_budget"}:
            if type(value) is not bool:
                raise HTTPException(422, "Se requiere un valor booleano")
            clean[key] = value
        elif key in {"position", "sort_order"}:
            if type(value) is not int or not 0 <= value <= 10000:
                raise HTTPException(422, "Posición inválida")
            clean[key] = value
        else:
            limit = {"advisor_notes": 4000, "description": 4000, "category": 100, "subtitle": 500, "status": 30}.get(key, 255)
            if not isinstance(value, str) or len(value) > limit or not value.strip():
                raise HTTPException(422, "Texto inválido")
            if key == "status" and value not in {"nuevo", "en_revision", "contactado", "cotizado", "cerrado"}:
                raise HTTPException(422, "Estado comercial inválido")
            clean[key] = value.strip()
    return clean


async def call_tool(db, user_id, name, arguments):
    if not isinstance(arguments, dict):
        raise HTTPException(422, "Argumentos inválidos")
    if name == "catalogue" and not arguments:
        return await catalogue(db)
    if name == "agenda" and not arguments:
        rows = (await db.execute(select(Appointment).order_by(Appointment.starts_at.desc()).limit(100))).scalars()
        return [serialize(row, True) for row in rows]
    if name == "prospects" and not arguments:
        rows = (await db.execute(select(Prospect).order_by(Prospect.id.desc()).limit(100))).scalars()
        return [{"id": r.id, "name": r.name, "contact": r.contact, "status": r.status, "profile": r.profile} for r in rows]
    if name != "propose_update" or set(arguments) != {"entity", "id", "changes"}:
        raise HTTPException(422, "Herramienta o argumentos no permitidos")
    entity, ident = arguments["entity"], arguments["id"]
    changes = clean_changes(entity, arguments["changes"])
    if type(ident) is not int or ident < 1:
        raise HTTPException(422, "ID inválido")
    row = await db.get(ENTITIES[entity][0], ident)
    if not row:
        raise HTTPException(404, "Registro no encontrado")
    proposal = AgentProposal(id=str(uuid4()), admin_id=user_id, tool=name, arguments={"entity": entity, "id": ident, "changes": changes}, previous=snapshot(row, changes), expires_at=datetime.now(timezone.utc) + timedelta(minutes=20))
    db.add(proposal)
    await db.commit()
    return {"proposal_id": proposal.id, "before": proposal.previous, "after": changes, "status": "pending", "message": "Revisa y confirma en administración. Todavía no se ha modificado el registro."}


async def confirm(db, user_id, ident):
    proposal = await db.get(AgentProposal, ident, with_for_update=True)
    if not proposal or proposal.admin_id != user_id:
        raise HTTPException(404, "Propuesta no encontrada")
    if proposal.status != "pending" or utc(proposal.expires_at) < datetime.now(timezone.utc):
        raise HTTPException(409, "La propuesta ya fue atendida o caducó")
    args = proposal.arguments
    changes = clean_changes(args["entity"], args["changes"])
    row = await db.get(ENTITIES[args["entity"]][0], args["id"], with_for_update=True)
    if not row or snapshot(row, changes) != proposal.previous:
        raise HTTPException(409, "El registro cambió. Genera una propuesta nueva.")
    for key, value in changes.items():
        setattr(row, key, Decimal(value) if key in MONEY else value)
    proposal.status = "applied"
    db.add(PriceChangeLog(entity_type=args["entity"], entity_id=args["id"], field_name="agent_proposal", old_value=proposal.id, new_value="applied; full diff in agent_proposals", user_id=user_id))
    await db.commit()
    return {"status": "applied", "proposal_id": ident}


TOOLS = [
    {"name": key, "description": text, "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False}}
    for key, text in [("catalogue", "Consulta catálogo comercial actual"), ("agenda", "Consulta agenda privada del administrador"), ("prospects", "Consulta solicitudes comerciales privadas")]
] + [{"name": "propose_update", "description": "Crea una propuesta. No modifica datos; requiere confirmación humana en el panel.", "inputSchema": {"type": "object", "required": ["entity", "id", "changes"], "properties": {"entity": {"enum": list(ENTITIES)}, "id": {"type": "integer", "minimum": 1}, "changes": {"type": "object", "minProperties": 1}}, "additionalProperties": False}}]
