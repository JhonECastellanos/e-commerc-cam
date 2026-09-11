import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from decimal import Decimal

def generar_acuerdo_reserva(
    order_reference: str,
    fecha: str,
    cliente_nombre: str,
    cliente_documento: str,
    direccion: str,
    municipio: str,
    telefono: str,
    marca: str,
    modo_instalacion: str,
    resolucion: str,
    numero_camaras: int,
    precio_total: Decimal,
    valor_anticipo: Decimal,
    fecha_pago: str,
    valor_saldo: Decimal,
    condicion_pago_saldo: str,
    terms_accepted_at: str,
    terms_accepted_ip: str,
    business_name: str = "[COMPLETAR]",
    business_nit: str = "[COMPLETAR]",
    business_contact: str = "[COMPLETAR]",
    cancellation_policy: str = "[DEFINIR]",
    installation_lead_days: str = "[DEFINIR]",
    labor_warranty_months: str = "[DEFINIR]",
    output_dir: str = "uploads/agreements",
) -> str:
    os.makedirs(output_dir, exist_ok=True)
    filename = f"acuerdo_{order_reference}.pdf"
    filepath = os.path.join(output_dir, filename)

    doc = SimpleDocTemplate(filepath, pagesize=A4,
                            topMargin=2*cm, bottomMargin=2*cm,
                            leftMargin=2*cm, rightMargin=2*cm)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("Title2", parent=styles["Title"], spaceAfter=12)
    subtitle_style = ParagraphStyle("Sub", parent=styles["Heading2"], spaceBefore=12, spaceAfter=6)
    normal_style = ParagraphStyle("Normal2", parent=styles["Normal"], spaceAfter=4, leading=14)

    elements = []

    elements.append(Paragraph("ACUERDO DE RESERVA DE SERVICIO DE INSTALACIÓN", title_style))
    elements.append(Spacer(1, 0.5*cm))

    data = [
        [Paragraph(f"<b>Fecha:</b> {fecha}", normal_style)],
        [Paragraph(f"<b>Referencia de orden:</b> {order_reference}", normal_style)],
    ]
    tbl = Table(data, colWidths=[16*cm])
    tbl.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    elements.append(tbl)
    elements.append(Spacer(1, 0.5*cm))

    elements.append(Paragraph("DATOS DEL CLIENTE", subtitle_style))
    cliente_data = [
        [Paragraph(f"<b>Nombre:</b> {cliente_nombre}", normal_style)],
        [Paragraph(f"<b>Documento:</b> {cliente_documento}", normal_style)],
        [Paragraph(f"<b>Dirección de instalación:</b> {direccion}, {municipio}", normal_style)],
        [Paragraph(f"<b>Teléfono / WhatsApp:</b> {telefono}", normal_style)],
    ]
    tbl = Table(cliente_data, colWidths=[16*cm])
    tbl.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    elements.append(tbl)
    elements.append(Spacer(1, 0.3*cm))

    elements.append(Paragraph("DATOS DEL PRESTADOR DEL SERVICIO", subtitle_style))
    prestador_data = [
        [Paragraph(f"<b>Nombre/Razón social:</b> {business_name}", normal_style)],
        [Paragraph(f"<b>NIT/Documento:</b> {business_nit}", normal_style)],
        [Paragraph(f"<b>Contacto:</b> {business_contact}", normal_style)],
    ]
    tbl = Table(prestador_data, colWidths=[16*cm])
    tbl.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    elements.append(tbl)
    elements.append(Spacer(1, 0.3*cm))

    elements.append(Paragraph("DESCRIPCIÓN DEL SERVICIO", subtitle_style))
    modo_labels = {
        "cableado": "🔌 Cableado CCTV+DVR",
        "inalambrico": "📶 Inalámbrico WiFi",
        "hibrido": "🛡️ Híbrido/perímetro inteligente",
        "solar": "☀️ Solar/PoE",
    }
    modo_str = modo_labels.get(modo_instalacion, modo_instalacion)
    servicio_data = [
        [Paragraph(f"<b>Combo contratado:</b> {marca} — {modo_str} — {resolucion} — {numero_camaras} cámaras", normal_style)],
        [Paragraph(f"<b>Valor total del servicio:</b> ${precio_total:,.0f} COP", normal_style)],
        [Paragraph(f"<b>Anticipo (50%) pagado el {fecha_pago}:</b> ${valor_anticipo:,.0f} COP", normal_style)],
        [Paragraph(f"<b>Saldo pendiente:</b> ${valor_saldo:,.0f} COP — pagadero {condicion_pago_saldo}", normal_style)],
    ]
    tbl = Table(servicio_data, colWidths=[16*cm])
    tbl.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    elements.append(tbl)
    elements.append(Spacer(1, 0.5*cm))

    elements.append(Paragraph("CONDICIONES", subtitle_style))
    condiciones = [
        "1. El anticipo aparta la fecha de instalación y el precio cotizado en esta orden.",
        "2. Cobertura geográfica: exclusivamente Bogotá D.C. y municipios de la Sabana habilitados por el prestador.",
        f"3. Política de cancelación y reembolso del anticipo: {cancellation_policy}",
        f"4. Plazo estimado de instalación: {installation_lead_days}",
        f"5. Garantía de equipos: según póliza del fabricante. Garantía de mano de obra: {labor_warranty_months}",
        "6. Este acuerdo se rige por las leyes de la República de Colombia, incluyendo el Estatuto del Consumidor (Ley 1480 de 2011).",
        "7. Tratamiento de datos personales conforme a la Ley 1581 de 2012.",
    ]
    for c in condiciones:
        elements.append(Paragraph(c, normal_style))
        elements.append(Spacer(1, 0.1*cm))

    elements.append(Spacer(1, 0.5*cm))
    elements.append(Paragraph(
        f"Aceptado electrónicamente por el cliente el {terms_accepted_at} desde IP {terms_accepted_ip}.",
        normal_style
    ))

    doc.build(elements)
    return filepath
