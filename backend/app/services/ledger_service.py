from sqlalchemy.orm import Session
from app.models.accounting import LedgerEntry
from app.models.expense import ExpenseRequest
from app.models.cash_register import CashRegister
from app.models.user import User
from app.services.tenant import get_category_account_mapping
from app.services.reference_service import generate_reference
from uuid import UUID
from datetime import datetime

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

    now = datetime.utcnow()
    exp_ref = expense.reference_number or str(expense.id)
    description = f"Paiement du bon {exp_ref} — Catégorie: {expense.category.name if expense.category else 'N/A'}"

    # Ligne de DEBIT (Charge)
    debit_entry = LedgerEntry(
        reference_number=led_ref,
        company_id=expense.company_id,
        accounting_account_id=expense_account_id,
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
