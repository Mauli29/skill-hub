import os
from dotenv import load_dotenv

load_dotenv()

from app.database import SessionLocal, engine, Base
from app import models

db = SessionLocal()

# Delete admin user
admin = db.query(models.User).filter(models.User.email == "admin@skillhub.com").first()
if admin:
    db.delete(admin)
    db.commit()
    print("✅ Admin user deleted")
else:
    print("ℹ️  Admin user not found")

db.close()