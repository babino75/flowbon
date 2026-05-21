from app.database import SessionLocal
from app.models.user import User
from app.services.tenant import get_dashboard_summary

db = SessionLocal()
titi = db.query(User).filter(User.name.ilike('%titi%')).first()
filters = {"from_date": None, "to_date": None, "category_id": None, "status": None, "user_id": None, "fiscal_year_id": None}

summary = get_dashboard_summary(db, titi, filters)
print(summary)
db.close()
