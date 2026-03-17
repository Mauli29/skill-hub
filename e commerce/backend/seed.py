"""
SkillHub – Database Seed Script
Run: python seed.py
Creates default categories + an admin user
"""
import os
from dotenv import load_dotenv

load_dotenv()

from app.database import SessionLocal, engine, Base
from app import models
from app.utils.auth import hash_password

Base.metadata.create_all(bind=engine)

CATEGORIES = [
    {"name": "Logo Design",        "slug": "logo-design",        "icon": "🎨"},
    {"name": "Web Development",    "slug": "web-development",    "icon": "💻"},
    {"name": "Content Writing",    "slug": "content-writing",    "icon": "✍️"},
    {"name": "Video Editing",      "slug": "video-editing",      "icon": "🎬"},
    {"name": "SEO",                "slug": "seo",                "icon": "📈"},
    {"name": "App Development",    "slug": "app-development",    "icon": "📱"},
    {"name": "Digital Marketing",  "slug": "digital-marketing",  "icon": "📣"},
    {"name": "Data Entry",         "slug": "data-entry",         "icon": "📋"},
    {"name": "UI/UX Design",       "slug": "ui-ux-design",       "icon": "🖌️"},
    {"name": "Voice Over",         "slug": "voice-over",         "icon": "🎙️"},
]

ADMIN = {
    "name":     "New Admin",
    "email":    "newadmin@skillhub.com",
    "password": "newadmin123",
    "role":     "admin",
}

db = SessionLocal()

# Seed categories
cat_added = 0
for c in CATEGORIES:
    exists = db.query(models.Category).filter(models.Category.slug == c["slug"]).first()
    if not exists:
        db.add(models.Category(**c))
        cat_added += 1
db.commit()
print(f"✅ {cat_added} categories added")

# Create admin user
admin_exists = db.query(models.User).filter(models.User.email == ADMIN["email"]).first()
if not admin_exists:
    admin = models.User(
        name=ADMIN["name"],
        email=ADMIN["email"],
        password_hash=hash_password(ADMIN["password"]),
        role="admin",
    )
    db.add(admin)
    db.commit()
    print(f"✅ Admin user created: {ADMIN['email']} / {ADMIN['password']}")
else:
    print(f"ℹ️  Admin user already exists")

db.close()
print("🎉 Seed complete!")
