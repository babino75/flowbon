from sqlalchemy.orm import Session
from app.models.accounting import LedgerEntry
from app.models.expense import ExpenseRequest
from app.models.cash_register import CashRegister
from app.models.user import User
from app.services.tenant import get_category_account_mapping
from app.services.reference_service import generate_reference
from app.services.fiscal_year_service import get_active_fiscal_year
from uuid import UUID
from datetime import datetime


def _resolve_journal_type(caisse: CashRegister) -> str:
    """Détermine le type de journal selon le type de compte de la caisse."""
    account_type = getattr(caisse, "account_type", "CASH") or "CASH"
    mapping = {
        "CASH": "CAISSE",
        "BANK": "BANQUE",
        "MOBILE_MONEY": "BANQUE",
        "WALLET": "BANQUE",
        "SAFE": "CAISSE",
    }
    return mapping.get(account_type.upper(), "CAISSE")


def create_double_entry_for_expense(db: Session, expense: ExpenseRequest, caisse: CashRegister, current_user: User):
    """
    Crée une écriture comptable en partie double lors du paiement d'une dépense.
    - Débite le compte de charge :
        1. Priorité au compte spécifique de la dépense (ajustement manuel du comptable).
        2. Sinon : compte lié à la catégorie de la dépense via category_account_mapping.
    - Crédite le compte de trésorerie associé à la caisse.
    Chaque paire d'écritures partage la même référence LED-YYYY-XXXX.
    """
    # 1. Obtenir le compte de charge — priorité à la surcharge sur la dépense
    if expense.accounting_account_id:
        expense_account_id = expense.accounting_account_id
    else:
        mapping = get_category_account_mapping(db, expense.category_id, expense.company_id)
        if not mapping:
            return None
        expense_account_id = mapping.accounting_account_id

    # 2. Obtenir le compte de trésorerie
    if not caisse.accounting_account_id:
        return None

    treasury_account_id = caisse.accounting_account_id

    # 3. Générer une référence LED unique partagée par la paire débit/crédit
    led_ref = generate_reference(db, expense.company_id, "LED")

    # 4. Résoudre l'exercice comptable actif
    active_fy = get_active_fiscal_year(db, expense.company_id)
    fiscal_year_id = active_fy.id if active_fy else expense.fiscal_year_id

    # 5. Déterminer le type de journal
    journal_type = _resolve_journal_type(caisse)

    now = datetime.utcnow()
    exp_ref = expense.reference_number or str(expense.id)
    # FIX: expense.category est une @property qui retourne directement le nom (str), pas un objet.
    # L'appel .name sur une str provoquait une AttributeError.
    category_name = expense.category if expense.category else "N/A"
    description = f"Paiement du bon {exp_ref} — Catégorie: {category_name}"

    # Ligne de DEBIT (Charge)
    debit_entry = LedgerEntry(
        reference_number=led_ref,
        company_id=expense.company_id,
        accounting_account_id=expense_account_id,
        fiscal_year_id=fiscal_year_id,
        journal_type=journal_type,
        piece_number=exp_ref,
        reference_id=expense.id,
        reference_type="EXPENSE_PAYMENT",
        description=description,
        debit=expense.amount,
        credit=0.00,
        transaction_date=now
    )

    # Ligne de CREDIT (Trésorerie) — même référence LED
    credit_entry = LedgerEntry(
        reference_number=led_ref,
        company_id=expense.company_id,
        accounting_account_id=treasury_account_id,
        fiscal_year_id=fiscal_year_id,
        journal_type=journal_type,
        piece_number=exp_ref,
        reference_id=expense.id,
        reference_type="EXPENSE_PAYMENT",
        description=description,
        debit=0.00,
        credit=expense.amount,
        transaction_date=now
    )

    db.add(debit_entry)
    db.add(credit_entry)
    # Ne pas commiter ici, le commit se fera dans la route (transactionnalité avec mark-as-paid)
    return [debit_entry, credit_entry]


def create_double_entry_for_advance(db: Session, advance, caisse: CashRegister, current_user: User):
    """
    Crée une écriture comptable en partie double lors du décaissement d'une avance.
    - Débite le compte lié à la catégorie de l'avance (ex: 425 Avances au personnel).
    - Crédite le compte de trésorerie associé à la caisse.
    Chaque paire d'écritures partage la même référence LED-YYYY-XXXX.
    Retourne None si le compte comptable de la catégorie ou de la caisse n'est pas configuré.
    """
    # 1. Obtenir le compte avances via la catégorie (ex: 425)
    advance_account_id = None
    if advance.category_id:
        mapping = get_category_account_mapping(db, advance.category_id, advance.company_id)
        if mapping:
            advance_account_id = mapping.accounting_account_id

    if not advance_account_id:
        # Pas de compte comptable configuré pour cette catégorie — pas d'écriture
        return None

    # 2. Obtenir le compte de trésorerie de la caisse
    if not caisse.accounting_account_id:
        return None

    treasury_account_id = caisse.accounting_account_id

    # 3. Générer une référence LED unique partagée par la paire débit/crédit
    led_ref = generate_reference(db, advance.company_id, "LED")

    # 4. Résoudre l'exercice comptable actif
    active_fy = get_active_fiscal_year(db, advance.company_id)
    fiscal_year_id = active_fy.id if active_fy else None

    # 5. Déterminer le type de journal
    journal_type = _resolve_journal_type(caisse)

    now = datetime.utcnow()
    adv_ref = advance.reference_number or str(advance.id)
    beneficiary = advance.user.name if advance.user else str(advance.user_id)
    description = f"Décaissement avance {adv_ref} — Bénéficiaire: {beneficiary}"

    # Ligne de DEBIT (Avances au personnel — ex: 425)
    debit_entry = LedgerEntry(
        reference_number=led_ref,
        company_id=advance.company_id,
        accounting_account_id=advance_account_id,
        fiscal_year_id=fiscal_year_id,
        journal_type=journal_type,
        piece_number=adv_ref,
        reference_id=advance.id,
        reference_type="ADVANCE_PAYMENT",
        description=description,
        debit=advance.amount,
        credit=0.00,
        transaction_date=now
    )

    # Ligne de CREDIT (Trésorerie) — même référence LED
    credit_entry = LedgerEntry(
        reference_number=led_ref,
        company_id=advance.company_id,
        accounting_account_id=treasury_account_id,
        fiscal_year_id=fiscal_year_id,
        journal_type=journal_type,
        piece_number=adv_ref,
        reference_id=advance.id,
        reference_type="ADVANCE_PAYMENT",
        description=description,
        debit=0.00,
        credit=advance.amount,
        transaction_date=now
    )

    db.add(debit_entry)
    db.add(credit_entry)
    # Ne pas commiter ici — le commit se fera dans la route disburse_advance
    return [debit_entry, credit_entry]
