from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from typing import Literal, Optional, List
from decimal import Decimal
from datetime import datetime

class BrandOut(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    sort_order: int
    active: bool

    class Config:
        from_attributes = True

class BrandUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    active: Optional[bool] = None
    sort_order: Optional[int] = None

class ComboPublic(BaseModel):
    id: int
    brand_id: int
    brand_name: Optional[str] = None
    mode: str
    resolution: str
    cameras_count: int
    final_price: Decimal
    is_bestseller: bool
    is_budget: bool
    level: Optional[str] = None
    warranty_text: str
    image_url: Optional[str] = None
    specs: Optional[dict] = None
    storage_options: Optional[dict] = None
    install_complexity: Optional[str] = None
    included_items: Optional[list] = None
    active: bool

    class Config:
        from_attributes = True

class ComboOut(BaseModel):
    id: int
    brand_id: int
    brand_name: Optional[str] = None
    mode: str
    resolution: str
    cameras_count: int
    equipment_price: Decimal
    final_price: Optional[Decimal] = None
    install_fee: Optional[Decimal] = None
    is_bestseller: bool
    is_budget: bool
    level: Optional[str] = None
    warranty_text: str
    image_url: Optional[str] = None
    specs: Optional[dict] = None
    storage_options: Optional[dict] = None
    install_complexity: Optional[str] = None
    included_items: Optional[list] = None
    active: bool

    class Config:
        from_attributes = True

class CustomComboSelection(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    brand_slug: str = Field(min_length=2, max_length=80, pattern=r"^[a-z0-9-]+$")
    mode: Literal["cableado", "inalambrico", "hibrido", "solar"] = "cableado"
    cameras_count: int = Field(ge=1, le=32)
    resolution: Literal["2MP", "3MP", "5MP", "8MP"] = "2MP"


class CustomPriceIn(CustomComboSelection):
    pass

class CustomPriceOut(BaseModel):
    total: Decimal
    deposit_50: Decimal
    balance_50: Decimal

class ComboUpdate(BaseModel):
    equipment_price: Optional[Decimal] = None
    install_fee: Optional[Decimal] = None
    is_bestseller: Optional[bool] = None
    is_budget: Optional[bool] = None
    warranty_text: Optional[str] = None
    active: Optional[bool] = None
    image_url: Optional[str] = None
    specs: Optional[dict] = None
    storage_options: Optional[dict] = None
    install_complexity: Optional[str] = None
    included_items: Optional[list] = None

class CoverageAreaOut(BaseModel):
    id: int
    name: str
    active: bool

    class Config:
        from_attributes = True

class CoverageAreaCreate(BaseModel):
    name: str

class SocialLinkOut(BaseModel):
    id: int
    platform: str
    url: str
    label: Optional[str] = None
    active: bool
    sort_order: int

    class Config:
        from_attributes = True

class SocialLinkUpdate(BaseModel):
    platform: Optional[str] = None
    url: Optional[str] = None
    label: Optional[str] = None
    active: Optional[bool] = None
    sort_order: Optional[int] = None

class SocialLinkCreate(BaseModel):
    platform: str
    url: str
    label: Optional[str] = None
    active: bool = True
    sort_order: int = 0

class OrderCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    combo_id: Optional[int] = Field(default=None, ge=1)
    customer_name: str = Field(min_length=3, max_length=120)
    customer_doc: str = Field(min_length=5, max_length=30, pattern=r"^[A-Za-z0-9.\- ]+$")
    customer_phone: str = Field(min_length=7, max_length=20, pattern=r"^[0-9+() \-]+$")
    customer_email: Optional[str] = Field(default=None, max_length=254)
    address: str = Field(min_length=5, max_length=300)
    municipality: str = Field(min_length=2, max_length=120)
    storage_choice: Optional[str] = Field(default=None, max_length=100)
    terms_accepted: bool = False
    custom_combo: Optional[CustomComboSelection] = None

    @field_validator("customer_email")
    @classmethod
    def validate_email(cls, value: Optional[str]) -> Optional[str]:
        if value and ("@" not in value or value.startswith("@") or value.endswith("@")):
            raise ValueError("Correo electrónico inválido")
        return value.lower() if value else value

    @field_validator("customer_name", "address", "municipality")
    @classmethod
    def reject_control_characters(cls, value: str) -> str:
        if any(ord(char) < 32 for char in value):
            raise ValueError("El texto contiene caracteres no permitidos")
        return value

    @model_validator(mode="after")
    def validate_product_selection(self):
        if bool(self.combo_id) == bool(self.custom_combo):
            raise ValueError("Selecciona exactamente un combo del catálogo o una configuración personalizada")
        return self

class OrderOut(BaseModel):
    id: int
    reference: str
    combo_id: Optional[int] = None
    customer_name: str
    customer_doc: str
    customer_phone: str
    customer_email: Optional[str] = None
    address: str
    municipality: str
    total: Decimal
    deposit_50: Decimal
    balance_50: Decimal
    storage_choice: Optional[str] = None
    storage_price: Optional[Decimal] = None
    status: str
    wompi_transaction_id: Optional[str] = None
    pdf_path: Optional[str] = None
    custom_combo_data: Optional[dict] = None
    created_at: datetime
    combo: Optional[ComboOut] = None

    class Config:
        from_attributes = True

class OrderPublicOut(BaseModel):
    reference: str
    total: Decimal
    deposit_50: Decimal
    balance_50: Decimal
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class OrderStatusUpdate(BaseModel):
    status: str

class NotificationOut(BaseModel):
    id: int
    type: str
    title: str
    message: Optional[str] = None
    order_id: Optional[int] = None
    read: bool
    created_at: datetime

    class Config:
        from_attributes = True

class SettingOut(BaseModel):
    key: str
    value: str
    description: Optional[str] = None

    class Config:
        from_attributes = True

class SettingUpdate(BaseModel):
    value: str

class DashboardOut(BaseModel):
    total_sales_month: Decimal
    total_sales_all: Decimal
    orders_by_status: dict
    sales_by_brand: List[dict]
    sales_by_mode: List[dict]
    top_combos: List[dict]
    avg_ticket: Decimal
    top_municipalities: List[dict]
    installed_count: int

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"

class LoginIn(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def validate_login_email(cls, value: str) -> str:
        if "@" not in value:
            raise ValueError("Correo electrónico inválido")
        return value.lower()

class WompiWebhookIn(BaseModel):
    event: str
    data: dict
    environment: str
    signature: dict
    timestamp: int
    sent_at: str

class BannerOut(BaseModel):
    id: int
    title: str
    subtitle: Optional[str] = None
    image_url: str
    video_url: Optional[str] = None
    link_url: Optional[str] = None
    position: int
    active: bool

    class Config:
        from_attributes = True

class ProductOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    price: Optional[float] = None
    image_url: Optional[str] = None
    category: Optional[str] = None
    active: bool
    sort_order: int

    class Config:
        from_attributes = True

class PriceChangeLogOut(BaseModel):
    id: int
    user_id: int
    entity_type: str
    entity_id: int
    field_name: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    created_at: datetime
    user_name: Optional[str] = None

    class Config:
        from_attributes = True
