from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date
from pydantic import BaseModel
import pandas as pd
from typing import List, Dict, Any

from app.database.database import get_db
from app.models.models import Outage, Prediction, PredictionResult
from ml.evaluation import evaluate_classification, evaluate_regression

router = APIRouter(prefix="/evaluation", tags=["Evaluation"])

@router.get("/logs")
def get_prediction_logs(db: Session = Depends(get_db)):
    """
    Returns all prediction logs and their evaluation results if they exist.
    """
    preds = db.query(Prediction).order_by(Prediction.created_at.desc()).all()
    logs = []
    for p in preds:
        log = {
            "id": p.id,
            "tanggal_prediksi": p.tanggal_prediksi,
            "tanggal_target": p.tanggal_target,
            "horizon_hari": p.horizon_hari,
            "prediksi_mati": p.prediksi_mati,
            "probabilitas": p.probabilitas,
            "prediksi_durasi": p.prediksi_durasi,
            "model": p.model,
            "reliability": p.reliability,
            "status": "Menunggu Waktu",
            "aktual_mati": None,
            "error_durasi": None
        }
        
        if p.results:
            log["status"] = "Selesai"
            log["aktual_mati"] = p.results.aktual_mati
            log["error_durasi"] = p.results.error_durasi
            log["prediksi_benar"] = p.results.prediksi_benar
            
        elif p.tanggal_target < date.today():
            log["status"] = "Belum Dievaluasi"
            
        logs.append(log)
        
    return logs

@router.post("/run")
def run_evaluation(db: Session = Depends(get_db)):
    """
    Finds predictions whose target_date is in the past, and compares them with Outage table.
    """
    today = date.today()
    # Get predictions that are targetted for past dates and don't have results yet
    unevaluated = db.query(Prediction).filter(
        Prediction.tanggal_target < today
    ).filter(
        ~Prediction.results.has()
    ).all()
    
    evaluated_count = 0
    for p in unevaluated:
        # Check if there is an outage on target date
        outages_on_day = db.query(Outage).filter(Outage.tanggal == p.tanggal_target).all()
        
        aktual_mati = len(outages_on_day) > 0
        aktual_durasi = sum(o.durasi_jam for o in outages_on_day) if aktual_mati else 0.0
        
        prediksi_benar = (p.prediksi_mati == aktual_mati)
        error_durasi = abs(p.prediksi_durasi - aktual_durasi) if (p.prediksi_mati and aktual_mati) else None
        
        result = PredictionResult(
            prediction_id=p.id,
            aktual_mati=aktual_mati,
            aktual_durasi=aktual_durasi,
            prediksi_benar=prediksi_benar,
            error_durasi=error_durasi
        )
        db.add(result)
        evaluated_count += 1
        
    db.commit()
    
    return {"status": "success", "evaluated_count": evaluated_count}

@router.get("/metrics")
def get_evaluation_metrics(db: Session = Depends(get_db)):
    """
    Returns aggregate performance metrics of predictions in the real world.
    Also returns a daily breakdown for charts.
    """
    results = db.query(PredictionResult).join(Prediction).order_by(Prediction.tanggal_target.asc()).all()
    
    if not results:
        return {
            "summary": None,
            "chart_data": []
        }
        
    y_true_class = []
    y_pred_class = []
    
    y_true_reg = []
    y_pred_reg = []
    
    chart_data = []
    
    for r in results:
        p = r.prediction
        y_true_class.append(1 if r.aktual_mati else 0)
        y_pred_class.append(1 if p.prediksi_mati else 0)
        
        if r.aktual_mati and p.prediksi_mati:
            y_true_reg.append(r.aktual_durasi)
            y_pred_reg.append(p.prediksi_durasi)
            
        chart_data.append({
            "tanggal": str(p.tanggal_target),
            "akurasi_prediksi": 100 if r.prediksi_benar else 0,
            "error_durasi": round(r.error_durasi, 2) if r.error_durasi is not None else 0
        })
        
    # Aggregate daily for chart
    df_chart = pd.DataFrame(chart_data)
    if not df_chart.empty:
        df_grouped = df_chart.groupby('tanggal').agg(
            akurasi_prediksi=('akurasi_prediksi', 'mean'),
            error_durasi=('error_durasi', 'mean')
        ).reset_index()
        final_chart_data = df_grouped.to_dict('records')
        # Round values
        for item in final_chart_data:
            item['akurasi_prediksi'] = round(item['akurasi_prediksi'], 1)
            item['error_durasi'] = round(item['error_durasi'], 2)
    else:
        final_chart_data = []

    class_metrics = evaluate_classification(y_true_class, y_pred_class)
    reg_metrics = evaluate_regression(y_true_reg, y_pred_reg) if y_true_reg else {}
    
    return {
        "summary": {
            "classification": class_metrics,
            "regression": reg_metrics,
            "total_evaluated": len(results)
        },
        "chart_data": final_chart_data
    }
