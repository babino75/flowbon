import io
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

# openpyxl imports
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# reportlab imports
from reportlab.lib.pagesizes import letter, landscape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

from app.core.dependencies import get_db, get_current_active_user
from app.models.user import User
from app.services.tenant import list_expenses_for_company

router = APIRouter(prefix="/exports", tags=["Exports"])


@router.get("/expenses/excel")
def export_expenses_excel(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    status: Optional[str] = Query(None),
):
    filters = {
        "from_date": from_date,
        "to_date": to_date,
        "status": status,
        "limit": 10000,  # Large limit to export all
        "page": 1
    }
    
    expenses = list_expenses_for_company(db, current_user, filters)
    
    # Create workbook
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Notes de Frais"
    
    # Enable grid lines explicitly
    ws.views.sheetView[0].showGridLines = True
    
    # Freeze the header row
    ws.freeze_panes = "A2"
    
    # Design Styles
    font_family = "Segoe UI"
    
    header_fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
    header_font = Font(name=font_family, size=11, bold=True, color="FFFFFF")
    header_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
    
    thin_border = Border(
        left=Side(style='thin', color='D1D5DB'),
        right=Side(style='thin', color='D1D5DB'),
        top=Side(style='thin', color='D1D5DB'),
        bottom=Side(style='thin', color='D1D5DB')
    )
    
    double_bottom_border = Border(
        left=Side(style='thin', color='D1D5DB'),
        right=Side(style='thin', color='D1D5DB'),
        top=Side(style='thin', color='D1D5DB'),
        bottom=Side(style='double', color='000000')
    )
    
    # Status styling maps (Soft pastel backgrounds with matching dark text)
    status_styles = {
        "pending": {
            "fill": PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid"),
            "font": Font(name=font_family, size=10, bold=True, color="92400E")
        },
        "approved": {
            "fill": PatternFill(start_color="DEF7EC", end_color="DEF7EC", fill_type="solid"),
            "font": Font(name=font_family, size=10, bold=True, color="03543F")
        },
        "rejected": {
            "fill": PatternFill(start_color="FDE8E8", end_color="FDE8E8", fill_type="solid"),
            "font": Font(name=font_family, size=10, bold=True, color="9B1C1C")
        },
        "reimbursed": {
            "fill": PatternFill(start_color="D1E7DD", end_color="D1E7DD", fill_type="solid"),
            "font": Font(name=font_family, size=10, bold=True, color="0F5132")
        }
    }
    
    headers = [
        "Date", 
        "Employé", 
        "Catégorie", 
        "Description", 
        "Montant", 
        "Devise", 
        "Statut", 
        "Date de soumission"
    ]
    
    ws.append(headers)
    
    # Style header row
    ws.row_dimensions[1].height = 26
    for col_num in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_num)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = header_align
        cell.border = thin_border
        
    currency = current_user.company.currency if current_user.company else "FCFA"
    amount_format = f'#,##0" {currency}"'
    
    # Populate rows
    row_idx = 2
    for exp in expenses:
        emp_name = exp.user.name if exp.user else str(exp.user_id)
        exp_date = exp.expense_date.strftime("%Y-%m-%d") if exp.expense_date else ""
        sub_date = exp.submitted_at.strftime("%Y-%m-%d %H:%M:%S") if exp.submitted_at else ""
        
        row_data = [
            exp_date,
            emp_name,
            exp.category,
            exp.description or "",
            float(exp.amount),
            exp.currency,
            exp.status.lower(),
            sub_date
        ]
        ws.append(row_data)
        
        # Style content row
        ws.row_dimensions[row_idx].height = 20
        for col_num in range(1, len(headers) + 1):
            cell = ws.cell(row=row_idx, column=col_num)
            cell.font = Font(name=font_family, size=10)
            cell.border = thin_border
            
            # Alignments
            if col_num in [1, 8]:
                cell.alignment = Alignment(horizontal="center", vertical="center")
            elif col_num == 5:
                cell.alignment = Alignment(horizontal="right", vertical="center")
                cell.number_format = amount_format
            elif col_num in [6, 7]:
                cell.alignment = Alignment(horizontal="center", vertical="center")
            else:
                cell.alignment = Alignment(horizontal="left", vertical="center")
                
            # Status styling and translation
            if col_num == 7:
                st = cell.value
                if st in status_styles:
                    cell.fill = status_styles[st]["fill"]
                    cell.font = status_styles[st]["font"]
                    translations = {
                        "pending": "En attente ⏳",
                        "approved": "Approuvé ✅",
                        "rejected": "Refusé ❌",
                        "reimbursed": "Payé 💳"
                    }
                    cell.value = translations.get(st, st.capitalize())
        row_idx += 1
        
    # Totals Row
    ws.row_dimensions[row_idx].height = 22
    total_fill = PatternFill(start_color="F3F4F6", end_color="F3F4F6", fill_type="solid")
    
    # Label cell (Description col 4)
    cell_lbl = ws.cell(row=row_idx, column=4, value="TOTAL DES DÉPENSES")
    cell_lbl.font = Font(name=font_family, size=10, bold=True)
    cell_lbl.alignment = Alignment(horizontal="right", vertical="center")
    cell_lbl.fill = total_fill
    cell_lbl.border = double_bottom_border
    
    # Formula sum cell (Amount col 5)
    cell_sum = ws.cell(row=row_idx, column=5, value=f"=SUM(E2:E{row_idx-1})")
    cell_sum.font = Font(name=font_family, size=10, bold=True, color="4F46E5")
    cell_sum.alignment = Alignment(horizontal="right", vertical="center")
    cell_sum.number_format = amount_format
    cell_sum.fill = total_fill
    cell_sum.border = double_bottom_border
    
    # Empty total fillers
    for col_num in range(1, len(headers) + 1):
        if col_num not in [4, 5]:
            cell = ws.cell(row=row_idx, column=col_num, value="")
            cell.fill = total_fill
            cell.border = double_bottom_border
            
    # Auto-adjust column widths
    for col in ws.columns:
        max_len = 0
        col_letter = get_column_letter(col[0].column)
        for cell in col:
            val_str = str(cell.value or '')
            if val_str.startswith('='):
                val_str = f"000,000 {currency}"  # Estimated width for totals
            max_len = max(max_len, len(val_str))
        ws.column_dimensions[col_letter].width = max(max_len + 4, 12)
        
    # Set Auto-filters
    ws.auto_filter.ref = f"A1:H{row_idx-1}"
    
    # Save workbook to memory stream
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    
    headers = {
        "Content-Disposition": f"attachment; filename=expenses_export_{date.today().strftime('%Y%m%d')}.xlsx"
    }
    
    return StreamingResponse(
        output, 
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
        headers=headers
    )


@router.get("/expenses/pdf")
def export_expenses_pdf(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    status: Optional[str] = Query(None),
):
    filters = {
        "from_date": from_date,
        "to_date": to_date,
        "status": status,
        "limit": 10000,
        "page": 1
    }
    
    expenses = list_expenses_for_company(db, current_user, filters)
    
    buffer = io.BytesIO()
    # Landscape Letter format to display columns comfortably
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(letter),
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    
    story = []
    
    # ReportLab Styles
    styles = getSampleStyleSheet()
    
    brand_indigo = colors.HexColor("#4F46E5")
    text_dark = colors.HexColor("#1F2937")
    bg_zebra = colors.HexColor("#F9FAFB")
    border_light = colors.HexColor("#E5E7EB")
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        textColor=brand_indigo,
        spaceAfter=4
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        textColor=colors.HexColor("#4B5563"),
        spaceAfter=12
    )
    
    meta_style = ParagraphStyle(
        'MetaText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        textColor=colors.HexColor("#6B7280"),
        leading=13
    )
    
    cell_style = ParagraphStyle(
        'CellText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        textColor=text_dark,
        leading=11
    )
    
    cell_header_style = ParagraphStyle(
        'CellHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        textColor=colors.white,
        alignment=1
    )
    
    comp_name = current_user.company.name if current_user.company else "FlowBon"
    story.append(Paragraph("État Récapitulatif des Notes de Frais", title_style))
    story.append(Paragraph(f"Société : {comp_name}", subtitle_style))
    
    # Metadata Info Block
    date_range_str = "Toutes les dates"
    if from_date and to_date:
        date_range_str = f"Du {from_date} au {to_date}"
    elif from_date:
        date_range_str = f"À partir du {from_date}"
    elif to_date:
        date_range_str = f"Jusqu'au {to_date}"
        
    status_str = status.capitalize() if status else "Tous les statuts"
    
    meta_html = f"""
    <b>Période :</b> {date_range_str}<br/>
    <b>Filtre Statut :</b> {status_str}<br/>
    <b>Généré par :</b> {current_user.name} ({current_user.email})<br/>
    <b>Date de génération :</b> {date.today().strftime('%d %B %Y')}
    """
    story.append(Paragraph(meta_html, meta_style))
    story.append(Spacer(1, 15))
    
    # Table Header Row
    table_headers = [
        Paragraph("Date", cell_header_style),
        Paragraph("Employé", cell_header_style),
        Paragraph("Catégorie", cell_header_style),
        Paragraph("Description", cell_header_style),
        Paragraph("Montant", cell_header_style),
        Paragraph("Statut", cell_header_style)
    ]
    
    table_data = [table_headers]
    
    translations = {
        "pending": "En attente",
        "approved": "Approuvé",
        "rejected": "Refusé",
        "reimbursed": "Payé"
    }
    
    def make_status_p(status_val):
        text_colors = {
            "pending": "#92400E",
            "approved": "#03543F",
            "rejected": "#9B1C1C",
            "reimbursed": "#0F5132"
        }
        fg = text_colors.get(status_val, "#1F2937")
        lbl = translations.get(status_val, status_val.capitalize())
        return Paragraph(f"<font color='{fg}'><b>{lbl}</b></font>", ParagraphStyle(
            'St', parent=cell_style, alignment=1
        ))
        
    total_amount = 0.0
    currency = current_user.company.currency if current_user.company else "FCFA"
    
    # Populate rows
    for exp in expenses:
        emp_name = exp.user.name if exp.user else str(exp.user_id)
        exp_date = exp.expense_date.strftime("%Y-%m-%d") if exp.expense_date else ""
        
        desc = exp.description or ""
        if len(desc) > 55:
            desc = desc[:52] + "..."
            
        amt = float(exp.amount)
        total_amount += amt
        
        row = [
            Paragraph(exp_date, ParagraphStyle('CDate', parent=cell_style, alignment=1)),
            Paragraph(emp_name, cell_style),
            Paragraph(exp.category, cell_style),
            Paragraph(desc, cell_style),
            Paragraph(f"{amt:,.0f} {currency}".replace(",", " "), ParagraphStyle('CAmt', parent=cell_style, alignment=2)),
            make_status_p(exp.status.lower())
        ]
        table_data.append(row)
        
    # Totals Row
    total_row = [
        Paragraph("", cell_style),
        Paragraph("", cell_style),
        Paragraph("", cell_style),
        Paragraph("<b>TOTAL DES DÉPENSES</b>", ParagraphStyle('TotLbl', parent=cell_style, alignment=2)),
        Paragraph(f"<b>{total_amount:,.0f} {currency}</b>".replace(",", " "), ParagraphStyle('TotAmt', parent=cell_style, alignment=2, textColor=brand_indigo)),
        Paragraph("", cell_style)
    ]
    table_data.append(total_row)
    
    # Layout col widths (Total 720 points for Landscape Letter margins)
    col_widths = [75, 110, 110, 220, 105, 100]
    
    t = Table(table_data, colWidths=col_widths, repeatRows=1)
    
    t_style = [
        ('BACKGROUND', (0, 0), (-1, 0), brand_indigo),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('GRID', (0, 0), (-1, -2), 0.5, border_light),
    ]
    
    # Row backgrounds
    for i in range(1, len(table_data) - 1):
        bg = bg_zebra if i % 2 == 1 else colors.white
        t_style.append(('BACKGROUND', (0, i), (-1, i), bg))
        t_style.append(('BOTTOMPADDING', (0, i), (-1, i), 6))
        t_style.append(('TOPPADDING', (0, i), (-1, i), 6))
        
        # Color cell backgrounds in the Status column
        exp = expenses[i-1]
        st = exp.status.lower()
        status_bg = {
            "pending": colors.HexColor("#FEF3C7"),
            "approved": colors.HexColor("#DEF7EC"),
            "rejected": colors.HexColor("#FDE8E8"),
            "reimbursed": colors.HexColor("#D1E7DD")
        }
        bg_col = status_bg.get(st, colors.HexColor("#F3F4F6"))
        t_style.append(('BACKGROUND', (5, i), (5, i), bg_col))
        
    last_row_idx = len(table_data) - 1
    t_style.extend([
        ('LINEABOVE', (0, last_row_idx), (-1, last_row_idx), 1, brand_indigo),
        ('LINEBELOW', (0, last_row_idx), (-1, last_row_idx), 1.5, brand_indigo),
        ('BACKGROUND', (0, last_row_idx), (-1, last_row_idx), colors.HexColor("#EEF2F6")),
        ('BOTTOMPADDING', (0, last_row_idx), (-1, last_row_idx), 8),
        ('TOPPADDING', (0, last_row_idx), (-1, last_row_idx), 8),
    ])
    
    t.setStyle(TableStyle(t_style))
    story.append(t)
    story.append(Spacer(1, 35))
    
    # Official Signature Block Table
    sig_data = [
        [
            Paragraph("<b>Signature du Demandeur (Employé)</b>", ParagraphStyle('SigL', parent=styles['Normal'], alignment=0, fontSize=9, textColor=colors.HexColor("#4B5563"))),
            Paragraph("<b>Signature pour Approbation (Direction)</b>", ParagraphStyle('SigR', parent=styles['Normal'], alignment=2, fontSize=9, textColor=colors.HexColor("#4B5563")))
        ],
        [Spacer(1, 40), Spacer(1, 40)],
        [
            Paragraph("Date : ___________________", ParagraphStyle('SigL', parent=styles['Normal'], alignment=0, fontSize=9)),
            Paragraph("Date : ___________________", ParagraphStyle('SigR', parent=styles['Normal'], alignment=2, fontSize=9))
        ]
    ]
    sig_table = Table(sig_data, colWidths=[360, 360])
    sig_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(sig_table)
    
    doc.build(story)
    buffer.seek(0)
    
    headers = {
        "Content-Disposition": f"attachment; filename=expenses_report_{date.today().strftime('%Y%m%d')}.pdf"
    }
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers=headers
    )
