"""
auth.py — Authentication router for Citizen & Authority roles.
Provides:
  - POST /auth/register (Citizen self-registration)
  - POST /auth/login (JWT token issuance for CITIZEN and ADMIN)
  - GET  /auth/me (Returns authenticated user profile & role)
  - Automatic demo account seeder for hackathon presentation:
      Citizen: citizen@roadguard.demo / citizen123
      Admin:   admin@roadguard.demo / admin123
"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.auth.security import create_access_token, hash_password, verify_password
from app.database import get_db
from app.models.db_models import User

router = APIRouter(prefix="/auth", tags=["auth"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


# ── Demo Account Seeder ───────────────────────────────────────────────────────

DEMO_ACCOUNTS = [
    {
        "id": "USR-DEMO-CITIZEN-01",
        "name": "Arjun Sharma (Citizen)",
        "email": "citizen@roadguard.demo",
        "password": "citizen123",
        "role": "CITIZEN",
    },
    {
        "id": "USR-DEMO-ADMIN-01",
        "name": "Dr. Ramesh Rao (Chief Road Engineer)",
        "email": "admin@roadguard.demo",
        "password": "admin123",
        "role": "ADMIN",
    },
]


def init_demo_users(db: Session):
    """Seed demo accounts if not already present."""
    for acc in DEMO_ACCOUNTS:
        existing = db.query(User).filter(User.email == acc["email"]).first()
        if not existing:
            user = User(
                id=acc["id"],
                name=acc["name"],
                email=acc["email"],
                password_hash=hash_password(acc["password"]),
                role=acc["role"],
            )
            db.add(user)
    db.commit()


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/register", response_model=AuthResponse, status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new citizen user account."""
    email_clean = body.email.strip().lower()

    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )

    user = User(
        id=f"USR-{uuid.uuid4().hex[:8].upper()}",
        name=body.name.strip(),
        email=email_clean,
        password_hash=hash_password(body.password),
        role="CITIZEN",  # New registrations are always CITIZEN
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({
        "sub": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
    })

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user),
    )


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate either CITIZEN or ADMIN using email and password."""
    # Ensure demo users exist
    init_demo_users(db)

    email_clean = body.email.strip().lower()
    user = db.query(User).filter(User.email == email_clean).first()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token({
        "sub": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
    })

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user),
    )


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user profile."""
    return UserOut.model_validate(current_user)
