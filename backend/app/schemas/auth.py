from pydantic import BaseModel, EmailStr, Field, ConfigDict, validator
from typing import Optional


class RegisterSchema(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=8, description="Le mot de passe doit faire au moins 8 caracteres")
    role: str = "employee"
    company_name: Optional[str] = None
    company_type: Optional[str] = "profit"

    @validator("password")
    def password_strength(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Le mot de passe doit faire au moins 8 caracteres")
        return value

    @validator("company_name", always=True)
    def validate_company_name(cls, value: Optional[str], values):
        if values.get("role") == "admin" and not value:
            raise ValueError("Le nom de l'entreprise est requis pour un administrateur")
        if value and values.get("role") != "admin":
            raise ValueError("Le nom de l'entreprise ne peut être défini que pour un administrateur")
        return value


class RegisterInviteSchema(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=8, description="Le mot de passe doit faire au moins 8 caracteres")
    token: str

    @validator("password")
    def password_strength(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Le mot de passe doit faire au moins 8 caracteres")
        return value


class LoginSchema(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ForgotPasswordSchema(BaseModel):
    email: EmailStr


class ResetPasswordSchema(BaseModel):
    token: str
    new_password: str = Field(min_length=8)
