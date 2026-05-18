import sys, os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
sys.path.append(os.path.abspath("backend"))
from app.models.expense import ExpenseRequest

engine = create_engine('postgresql://flowbon:flowbon123@localhost:5432/flowbon')
Session = sessionmaker(bind=engine)
session = Session()
for e in session.query(ExpenseRequest).all():
    print(f"ID={e.id}, type={type(e.id)}")
