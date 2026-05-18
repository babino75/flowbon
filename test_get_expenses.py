import sys, os
sys.path.append(os.path.abspath("backend"))
from app.core.security import create_access_token
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.user import User

engine = create_engine('postgresql://flowbon:flowbon123@localhost:5432/flowbon')
Session = sessionmaker(bind=engine)
session = Session()
user = session.query(User).filter(User.role == 'employee').first()
if not user:
    user = session.query(User).first()

token = create_access_token(data={"sub": str(user.id)})
print(token)
