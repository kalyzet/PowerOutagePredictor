import pandas as pd
import numpy as np
import joblib
import os
from datetime import datetime
from app.models.models import Outage
from ml.features import build_training_dataset
from ml.evaluation import evaluate_classification, evaluate_regression
from ml.classification.sklearn_models import get_classification_models
from ml.regression.sklearn_models import get_regression_models
from ml.classification.baseline import predict_outage_probability
from ml.regression.baseline import predict_outage_duration

MODELS_DIR = os.path.join(os.path.dirname(__file__), "../backend/models_storage")
os.makedirs(MODELS_DIR, exist_ok=True)

def train_pipeline(db_session):
    """
    Executes the full machine learning training pipeline.
    """
    outages = db_session.query(Outage).order_by(Outage.tanggal.asc()).all()
    if not outages:
        return {"status": "error", "message": "No data available for training."}
        
    df = pd.DataFrame([{
        "tanggal": o.tanggal,
        "durasi_jam": o.durasi_jam
    } for o in outages])
    
    X, y_class, y_reg = build_training_dataset(df)
    
    if X is None or len(X) < 10:
        return {"status": "error", "message": "Not enough historical data to build ML datasets (minimum 10 valid samples required)."}
        
    # Time-based train-test split (80/20)
    split_idx = int(len(X) * 0.8)
    
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_class_train, y_class_test = y_class.iloc[:split_idx], y_class.iloc[split_idx:]
    
    results = {
        "classification": {},
        "regression": {}
    }
    
    # ---------------------------
    # CLASSIFICATION
    # ---------------------------
    # 1. Evaluate Baseline
    baseline_preds = []
    for _, row in X_test.iterrows():
        prob = predict_outage_probability(row.to_dict())
        baseline_preds.append(1 if prob > 0.5 else 0)
    
    results["classification"]["Baseline"] = evaluate_classification(y_class_test, baseline_preds)
    
    best_class_model_name = "Baseline"
    best_class_score = results["classification"]["Baseline"].get("f1_score", 0)
    best_class_model = None
    
    # 2. Train and Evaluate ML Models
    clf_models = get_classification_models()
    for name, model in clf_models.items():
        try:
            model.fit(X_train, y_class_train)
            preds = model.predict(X_test)
            metrics = evaluate_classification(y_class_test, preds)
            results["classification"][name] = metrics
            
            # Select best based on F1-score
            if metrics["f1_score"] > best_class_score:
                best_class_score = metrics["f1_score"]
                best_class_model_name = name
                best_class_model = model
        except Exception as e:
            results["classification"][name] = {"error": str(e)}
            
    if best_class_model is not None:
        joblib.dump(best_class_model, os.path.join(MODELS_DIR, "outage_classifier.pkl"))
    else:
        # If baseline is better, remove any existing saved model to fallback to baseline
        if os.path.exists(os.path.join(MODELS_DIR, "outage_classifier.pkl")):
            os.remove(os.path.join(MODELS_DIR, "outage_classifier.pkl"))
            
    results["best_classification_model"] = best_class_model_name

    # ---------------------------
    # REGRESSION
    # ---------------------------
    # Filter out NaNs (only train on days where outage actually happened)
    valid_idx = ~y_reg.isna()
    X_reg = X[valid_idx]
    y_reg_valid = y_reg[valid_idx]
    
    if len(X_reg) < 5:
        results["regression"] = {"status": "Not enough positive samples for regression"}
        results["best_regression_model"] = "Baseline"
    else:
        split_idx_reg = int(len(X_reg) * 0.8)
        X_reg_train, X_reg_test = X_reg.iloc[:split_idx_reg], X_reg.iloc[split_idx_reg:]
        y_reg_train, y_reg_test = y_reg_valid.iloc[:split_idx_reg], y_reg_valid.iloc[split_idx_reg:]
        
        # 1. Evaluate Baseline Regression
        baseline_reg_preds = []
        for _, row in X_reg_test.iterrows():
            dur = predict_outage_duration(row.to_dict())
            baseline_reg_preds.append(dur)
            
        results["regression"]["Baseline"] = evaluate_regression(y_reg_test, baseline_reg_preds)
        
        best_reg_model_name = "Baseline"
        # For regression, lower RMSE is better
        best_reg_score = results["regression"]["Baseline"].get("rmse", float('inf'))
        best_reg_model = None
        
        # 2. Train ML Models
        reg_models = get_regression_models()
        for name, model in reg_models.items():
            try:
                model.fit(X_reg_train, y_reg_train)
                preds = model.predict(X_reg_test)
                # Ensure no negative durations
                preds = np.maximum(preds, 0)
                metrics = evaluate_regression(y_reg_test, preds)
                results["regression"][name] = metrics
                
                if metrics["rmse"] < best_reg_score:
                    best_reg_score = metrics["rmse"]
                    best_reg_model_name = name
                    best_reg_model = model
            except Exception as e:
                results["regression"][name] = {"error": str(e)}
                
        if best_reg_model is not None:
            joblib.dump(best_reg_model, os.path.join(MODELS_DIR, "duration_regressor.pkl"))
        else:
            if os.path.exists(os.path.join(MODELS_DIR, "duration_regressor.pkl")):
                os.remove(os.path.join(MODELS_DIR, "duration_regressor.pkl"))
                
        results["best_regression_model"] = best_reg_model_name
        
    return {
        "status": "success",
        "message": "Training completed successfully.",
        "samples_used": len(X),
        "results": results
    }
