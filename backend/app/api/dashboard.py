from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any, List
import pandas as pd

from app.database.database import get_db
from app.models.models import Outage

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db)) -> Dict[str, Any]:
    outages = db.query(Outage).all()
    if not outages:
        return {
            "total_outages": 0,
            "total_duration": 0,
            "avg_duration": 0,
            "max_duration": 0,
            "last_outage": None,
        }
    
    total_outages = len(outages)
    total_duration = sum(o.durasi_jam for o in outages)
    avg_duration = total_duration / total_outages if total_outages > 0 else 0
    max_duration = max(o.durasi_jam for o in outages)
    
    sorted_outages = sorted(outages, key=lambda x: x.tanggal)
    last_outage = sorted_outages[-1].tanggal if sorted_outages else None
    
    return {
        "total_outages": total_outages,
        "total_duration": round(total_duration, 2),
        "avg_duration": round(avg_duration, 2),
        "max_duration": round(max_duration, 2),
        "last_outage": last_outage
    }

@router.get("/charts")
def get_dashboard_charts(db: Session = Depends(get_db)) -> Dict[str, Any]:
    outages = db.query(Outage).all()
    if not outages:
        return {
            "trend": [],
            "time_distribution": []
        }
        
    df = pd.DataFrame([{
        "tanggal": o.tanggal,
        "durasi_jam": o.durasi_jam,
        "jam_mati": o.jam_mati.hour
    } for o in outages])
    
    # Trend (Daily)
    daily_stats = df.groupby('tanggal').agg(
        total_durasi=('durasi_jam', 'sum'),
        frekuensi=('durasi_jam', 'count')
    ).reset_index()
    
    trend_data = []
    for _, row in daily_stats.iterrows():
        trend_data.append({
            "tanggal": str(row['tanggal']),
            "durasi": round(row['total_durasi'], 2),
            "frekuensi": int(row['frekuensi'])
        })
        
    # Time distribution
    bins = [0, 6, 12, 18, 24]
    labels = ['00:00 - 06:00', '06:00 - 12:00', '12:00 - 18:00', '18:00 - 24:00']
    
    df['time_group'] = pd.cut(df['jam_mati'], bins=bins, labels=labels, right=False, include_lowest=True)
    dist_stats = df['time_group'].value_counts().reset_index()
    dist_stats.columns = ['time_group', 'count']
    
    dist_data = []
    for _, row in dist_stats.iterrows():
        dist_data.append({
            "waktu": str(row['time_group']),
            "jumlah": int(row['count'])
        })
        
    # Sort dist_data by labels order
    dist_data.sort(key=lambda x: labels.index(x['waktu']) if x['waktu'] in labels else 0)
        
    return {
        "trend": sorted(trend_data, key=lambda x: x['tanggal']),
        "time_distribution": dist_data
    }
