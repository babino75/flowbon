import sys, os, json
sys.path.append(os.path.abspath("backend"))
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.expense import ExpenseRequest
from app.schemas.expense import ExpenseResponse

engine = create_engine('postgresql://flowbon:flowbon123@localhost:5432/flowbon')
Session = sessionmaker(bind=engine)
session = Session()

e = session.query(ExpenseRequest).first()
res = ExpenseResponse.model_validate(e)
print(json.dumps(res.model_dump(mode='json'), indent=2))
