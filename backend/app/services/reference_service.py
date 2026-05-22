"""
Service central de numérotation des documents FlowBon.

Génère des références séquentielles et lisibles du type :
  EXP-2026-0045  (Bon de dépense)
  ADV-2026-0012  (Avance de caisse)
  PAY-2026-0099  (Paiement)
  LED-2026-0200  (Écriture comptable)

La séquence est par (entreprise, type, année). Elle repart à 0001 chaque
nouvelle année. La concurrence est gérée via un SELECT FOR UPDATE.
"""

from datetime import datetime

from sqlalchemy.orm import Session

from app.models.document_sequence import DocumentSequence


def generate_reference(
    db: Session,
    company_id,
    doc_type: str,
    year: int | None = None,
) -> str:
    """
    Génère le prochain numéro de référence séquentiel pour un document.

    Args:
        db:          Session SQLAlchemy active
        company_id:  UUID de l'entreprise
        doc_type:    Préfixe du document ('EXP', 'ADV', 'PAY', 'LED')
        year:        Année (défaut : année courante en UTC)

    Returns:
        Référence formatée, ex: "EXP-2026-0045"
    """
    if year is None:
        year = datetime.utcnow().year

    # Verrou pessimiste pour éviter les doublons en accès concurrent
    seq = (
        db.query(DocumentSequence)
        .filter(
            DocumentSequence.company_id == company_id,
            DocumentSequence.doc_type == doc_type,
            DocumentSequence.year == year,
        )
        .with_for_update()
        .first()
    )

    if seq is None:
        # Première utilisation pour ce triplet (company, type, année)
        seq = DocumentSequence(
            company_id=company_id,
            doc_type=doc_type,
            year=year,
            last_sequence=1,
        )
        db.add(seq)
    else:
        seq.last_sequence += 1

    db.flush()  # Persiste le verrou dans la transaction courante

    return f"{doc_type}-{year}-{seq.last_sequence:04d}"
