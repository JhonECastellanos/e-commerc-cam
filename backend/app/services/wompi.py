import hashlib
import hmac
import urllib.parse
from decimal import Decimal
from app.config import settings

def generar_signature(transaction_id: str, status: str, amount_cents: int, timestamp: int) -> str:
    # Wompi event checksum = SHA256(concat of signature.properties values + event timestamp + secret).
    # For our events the properties are transaction.id, transaction.status, transaction.amount_in_cents.
    raw = f"{transaction_id}{status}{amount_cents}{timestamp}{settings.womppi_webhook_secret}"
    return hashlib.sha256(raw.encode()).hexdigest()

def verificar_webhook(payload: dict) -> bool:
    try:
        data = payload.get("data", {})
        transaction = data.get("transaction", data)
        signature_obj = payload.get("signature", {})
        received_sig = signature_obj.get("checksum", "")
        transaction_id = str(transaction.get("id", ""))
        status = transaction.get("status", "")
        amount_cents = int(transaction.get("amount_in_cents", 0))
        timestamp = int(payload.get("timestamp", 0))
        computed = generar_signature(transaction_id, status, amount_cents, timestamp)
        return hmac.compare_digest(computed, received_sig)
    except Exception:
        return False

def format_amount_cop(amount: Decimal) -> int:
    return int(amount * 100)

def get_wompi_widget_url(public_key: str, amount_cents: int, reference: str, redirect_url: str) -> str:
    # redirect_url already carries its own query string, so it must be percent-encoded
    # before being embedded as a query parameter value.
    return (
        f"https://checkout.wompi.co/widget/"
        f"?public-key={public_key}"
        f"&currency=COP"
        f"&amount-in-cents={amount_cents}"
        f"&reference={urllib.parse.quote(reference, safe='')}"
        f"&redirect-url={urllib.parse.quote(redirect_url, safe='')}"
    )
