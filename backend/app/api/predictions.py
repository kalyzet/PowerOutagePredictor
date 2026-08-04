from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date
from pydantic import BaseModel
import pandas as pd
import sys
import os
import joblib

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

from app.database.database import get_db
from app.models.models import Outage, Prediction
from ml.features import generate_features
from ml.classification.baseline import predict_outage_probability
from ml.regression.baseline import predict_outage_duration

router = APIRouter(prefix="/predictions", tags=["Predictions"])

MODELS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../models_storage"))

class PredictionRequest(BaseModel):
    target_date: date

@router.post("/")
def make_prediction(request: PredictionRequest, db: Session = Depends(get_db)):
    outages = db.query(Outage).order_by(Outage.tanggal.asc()).all()
    
    if not outages:
        return {
            "target_date": request.target_date,
            "prediksi_mati": False,
            "probabilitas": 0.0,
            "prediksi_durasi": 0.0,
            "model": "Baseline",
            "reliability": "Rendah (Belum ada data)"
        }
        
    df = pd.DataFrame([{
        "tanggal": o.tanggal,
        "durasi_jam": o.durasi_jam
    } for o in outages])
    
    features = generate_features(df, request.target_date)
    
    if not features:
        return {
            "target_date": request.target_date,
            "prediksi_mati": False,
            "probabilitas": 0.0,
            "prediksi_durasi": 0.0,
            "model": "None",
            "reliability": "Rendah (Data tidak cukup untuk fitur)"
        }
    
    clf_path = os.path.join(MODELS_DIR, "outage_classifier.pkl")
    reg_path = os.path.join(MODELS_DIR, "duration_regressor.pkl")
    
    feature_order = ['days_since_last', 'day_of_week', 'outages_on_target_day_of_week', 
                     'total_outages', 'recent_outages_7d', 'avg_duration']
                     
    X_pred = pd.DataFrame([[features[k] for k in feature_order]], columns=feature_order)
    
    model_name = "Baseline"
    
    if os.path.exists(clf_path):
        try:
            clf = joblib.load(clf_path)
            if hasattr(clf, "predict_proba"):
                prob = clf.predict_proba(X_pred)[0][1]
            else:
                prob = 1.0 if clf.predict(X_pred)[0] == 1 else 0.0
            model_name = "Machine Learning"
        except Exception as e:
            print("Failed to load CLF model:", e)
            prob = predict_outage_probability(features)
    else:
        prob = predict_outage_probability(features)
        
    if os.path.exists(reg_path):
        try:
            reg = joblib.load(reg_path)
            durasi = reg.predict(X_pred)[0]
            durasi = max(0.0, round(float(durasi), 2))
        except Exception as e:
            print("Failed to load REG model:", e)
            durasi = predict_outage_duration(features)
    else:
        durasi = predict_outage_duration(features)
    
    total = features.get('total_outages', 0)
    if total < 5:
        reliability = "Rendah"
    elif total < 20:
        reliability = "Sedang"
    else:
        reliability = "Tinggi"
        
    # Save to Database
    today = date.today()
    horizon = (request.target_date - today).days
    
    new_pred = Prediction(
        tanggal_prediksi=today,
        tanggal_target=request.target_date,
        horizon_hari=horizon,
        prediksi_mati=prob > 0.5,
        probabilitas=round(prob * 100, 1),
        prediksi_durasi=durasi if prob > 0.5 else 0.0,
        model=model_name,
        reliability=reliability
    )
    db.add(new_pred)
    db.commit()
    db.refresh(new_pred)
    
    return {
        "id": new_pred.id,
        "target_date": request.target_date,
        "prediksi_mati": prob > 0.5,
        "probabilitas": round(prob * 100, 1),
        "prediksi_durasi": durasi if prob > 0.5 else 0.0,
        "model": model_name,
        "reliability": reliability
    }
