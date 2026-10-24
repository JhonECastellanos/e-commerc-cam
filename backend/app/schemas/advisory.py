import re
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator

DeviceKind = Literal[
    "cctv",
    "ip-camera",
    "motion",
    "opening",
    "microphone",
    "speaker",
    "touchscreen",
    "switch",
    "outlet",
    "light",
    "server",
    "network",
    "rack",
]
SCENARIO_ROOMS = {
    "casa": {
        "sala": (-3.6, 3.5, 5.8, 5),
        "cocina": (3.6, 3.5, 5.8, 5),
        "pasillo": (0, 0, 1.4, 12),
        "habitacion1": (-3.6, -2.5, 5.8, 7),
        "habitacion2": (3.6, -0.5, 5.8, 3),
        "bano": (2.1, -4, 2.8, 4),
        "bano2": (5, -4, 3, 4),
        "jardin": (0, 9, 13, 6),
        "patio": (0, -9, 13, 6),
    },
    "apartamento": {
        "sala": (-4, 3.25, 5.6, 5.1),
        "cocina": (3.6, 3.9, 6, 3.8),
        "pasillo": (-0.3, 0, 1.8, 11.6),
        "habitacion1": (-4, -3.2, 5.6, 5.2),
        "habitacion2": (1.85, -3.6, 2.5, 4.4),
        "habitacion3": (4.85, -3.6, 3.5, 4.4),
        "estudio": (4.85, 0.3, 3.5, 3.4),
        "bano": (1.85, -0.4, 2.5, 2),
        "closet": (-4, 0.05, 5.6, 1.3),
        "entrada": (1.85, 1.3, 2.5, 1.4),
    },
}


class StrictModel(BaseModel):
    model_config = ConfigDict(
        extra="forbid", str_strip_whitespace=True, allow_inf_nan=False
    )


class VirtualDeviceIn(StrictModel):
    id: str = Field(min_length=1, max_length=100)
    kind: DeviceKind
    name: str = Field(min_length=1, max_length=100)
    room: str = Field(min_length=1, max_length=40)
    x: float = Field(ge=-14, le=14)
    y: float = Field(ge=0, le=3)
    z: float = Field(ge=-14, le=14)
    rotation: float = Field(ge=0, le=360)
    on: bool
    range: float = Field(ge=1, le=15)
    angle: float = Field(ge=20, le=120)


class RuleIn(StrictModel):
    id: str = Field(min_length=1, max_length=100)
    sourceId: str
    targetId: str
    enabled: bool


class DesignIn(StrictModel):
    version: Literal[1]
    scenario: Literal["casa", "apartamento"]
    devices: list[VirtualDeviceIn] = Field(max_length=128)
    rules: list[RuleIn] = Field(max_length=128)
    infrastructure: Literal["local", "cloud", "shared"]
    unit: str = Field(max_length=80)

    @model_validator(mode="after")
    def validate_design(self):
        ids = {d.id: d for d in self.devices}
        if len(ids) != len(self.devices):
            raise ValueError("Dispositivos duplicados")
        for d in self.devices:
            room = SCENARIO_ROOMS[self.scenario].get(d.room)
            if not room:
                raise ValueError("Habitación inválida")
            x, z, w, depth = room
            if not (
                x - w / 2 <= d.x <= x + w / 2 and z - depth / 2 <= d.z <= z + depth / 2
            ):
                raise ValueError("Ubicación fuera de la habitación")
            if d.room in {"bano", "bano2", "closet"} and d.kind in {
                "cctv",
                "ip-camera",
                "microphone",
            }:
                raise ValueError("Espacio íntimo")
        for rule in self.rules:
            if (
                rule.sourceId not in ids
                or rule.targetId not in ids
                or ids[rule.sourceId].kind
                not in {"motion", "opening", "switch", "touchscreen"}
            ):
                raise ValueError("Regla inválida")
        return self


class NeedsIn(StrictModel):
    need: Literal["seguridad", "camaras", "domotica", "mejora", "integral"]
    property: Literal["casa", "apartamento", "local", "oficina", "edificio", "otro"]
    environment: Literal["interior", "exterior", "ambos", "asesoria"]
    areas: int | None = Field(default=None, ge=1, le=500)
    spaces: str = Field(default="", max_length=500)
    existing: Literal["si", "no", "desconocido"]
    connectivity: Literal["wifi", "cable", "sin_conexion", "desconocido"]
    goals: list[
        Literal[
            "accesos",
            "supervision",
            "grabacion",
            "notificaciones",
            "dispositivos",
            "iluminacion",
            "procesamiento_local",
            "integraciones",
        ]
    ] = Field(min_length=1, max_length=8)
    preference: Literal["combo", "personalizado", "asesoria"]
    priority: Literal["explorando", "planificando", "pronto"]
    installation: Literal["tomas_existentes", "electrica_integrada", "asesoria"]
    infrastructure: Literal["ninguna", "local", "cloud", "shared", "asesoria"]
    units: int = Field(default=1, ge=1, le=5000)
    support: Literal["mensual", "anual", "asesoria", "ninguno"] = "asesoria"


class ProfileIn(StrictModel):
    answers: NeedsIn
    configuration: DesignIn | None = None

    @model_validator(mode="after")
    def validate_match(self):
        if (
            self.configuration
            and self.answers.property in {"casa", "apartamento"}
            and self.configuration.scenario != self.answers.property
        ):
            raise ValueError("El diseño no corresponde al inmueble")
        return self


class ProspectIn(ProfileIn):
    name: str = Field(min_length=2, max_length=100)
    contact_method: Literal["whatsapp", "telefono", "email"]
    contact: str = Field(min_length=7, max_length=254)
    locality: str = Field(min_length=2, max_length=100)
    consent: Literal[True]
    consent_version: Literal["asesoria-2026-10-v1"]
    website: str = Field(
        default="", max_length=200
    )  # Accessible honeypot ignored by real users.

    @model_validator(mode="after")
    def validate_contact(self):
        if self.contact_method == "email":
            if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", self.contact):
                raise ValueError("Correo inválido")
        elif (
            not re.fullmatch(r"[+\d ()-]+", self.contact)
            or not 7 <= len(re.sub(r"\D", "", self.contact)) <= 15
        ):
            raise ValueError("Teléfono inválido")
        return self
