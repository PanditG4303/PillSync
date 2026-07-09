# PillSync - SQLAlchemy ORM models

from sqlalchemy import Column, Integer, String, Boolean
from database import Base


class User(Base):
    """Minimal user model for authentication placeholders."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
