from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, date, time, timedelta

from app.database.database import get_db
from app.models.models import Outage
from app.schemas.schemas import OutageCreate, OutageUpdate, OutageResponse

router = APIRouter(prefix="/outages", tags=["Outages"])

def calculate_duration(jam_mati: time, jam_nyala: time) -> float:
    mati_dt = datetime.combine(date.today(), jam_mati)
    nyala_dt = datetime.combine(date.today(), jam_nyala)
    
    if nyala_dt < mati_dt:
        nyala_dt += timedelta(days=1)
        
    return (nyala_dt - mati_dt).total_seconds() / 3600.0

@router.post("/", response_model=OutageResponse)
def create_outage(outage: OutageCreate, db: Session = Depends(get_db)):
    durasi_jam = calculate_duration(outage.jam_mati, outage.jam_nyala)
    
    db_outage = Outage(
        tanggal=outage.tanggal,
        jam_mati=outage.jam_mati,
        jam_nyala=outage.jam_nyala,
        durasi_jam=durasi_jam,
        keterangan=outage.keterangan
    )
    db.add(db_outage)
    db.commit()
    db.refresh(db_outage)
    return db_outage

@router.get("/", response_model=List[OutageResponse])
def get_outages(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Outage).order_by(Outage.tanggal.desc(), Outage.jam_mati.desc()).offset(skip).limit(limit).all()

@router.get("/{outage_id}", response_model=OutageResponse)
def get_outage(outage_id: int, db: Session = Depends(get_db)):
    db_outage = db.query(Outage).filter(Outage.id == outage_id).first()
    if not db_outage:
        raise HTTPException(status_code=404, detail="Outage not found")
    return db_outage

@router.put("/{outage_id}", response_model=OutageResponse)
def update_outage(outage_id: int, outage: OutageUpdate, db: Session = Depends(get_db)):
    db_outage = db.query(Outage).filter(Outage.id == outage_id).first()
    if not db_outage:
        raise HTTPException(status_code=404, detail="Outage not found")
        
    durasi_jam = calculate_duration(outage.jam_mati, outage.jam_nyala)
    
    db_outage.tanggal = outage.tanggal
    db_outage.jam_mati = outage.jam_mati
    db_outage.jam_nyala = outage.jam_nyala
    db_outage.durasi_jam = durasi_jam
    db_outage.keterangan = outage.keterangan
    
    db.commit()
    db.refresh(db_outage)
    return db_outage

@router.delete("/{outage_id}")
def delete_outage(outage_id: int, db: Session = Depends(get_db)):
    db_outage = db.query(Outage).filter(Outage.id == outage_id).first()
    if not db_outage:
        raise HTTPException(status_code=404, detail="Outage not found")
        
    db.delete(db_outage)
    db.commit()
    return {"detail": "Outage deleted successfully"}
