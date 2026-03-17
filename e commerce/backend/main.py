import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

from app.database import engine, Base
from app.routers import auth, users, services, orders, messages, reviews, payments, admin

load_dotenv()

# Create all DB tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SkillHub API",
    description="Freelancer Marketplace REST API",
    version="1.0.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static files (uploaded images) ────────────────────────────────────────────
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "static/uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "services"), exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router,      prefix="/api")
app.include_router(users.router,     prefix="/api")
app.include_router(services.router,  prefix="/api")
app.include_router(orders.router,    prefix="/api")
app.include_router(messages.router,  prefix="/api")
app.include_router(reviews.router,   prefix="/api")
app.include_router(payments.router,  prefix="/api")
app.include_router(admin.router,     prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok", "app": "SkillHub"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
