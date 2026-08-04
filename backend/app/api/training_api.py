from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.database import get_db
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))
from ml.training import train_pipeline

router = APIRouter(prefix="/training", tags=["Training"])

@router.post("/train")
def run_training(db: Session = Depends(get_db)):
    """
    Triggers the ML training pipeline manually.
    """
    results = train_pipeline(db)
    return results
