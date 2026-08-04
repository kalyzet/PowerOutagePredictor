from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import numpy as np

def evaluate_classification(y_true, y_pred):
    """
    Evaluates classification models and returns metrics.
    """
    if len(y_true) == 0:
        return {}
        
    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision": float(precision_score(y_true, y_pred, zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, zero_division=0)),
        "f1_score": float(f1_score(y_true, y_pred, zero_division=0))
    }

def evaluate_regression(y_true, y_pred):
    """
    Evaluates regression models and returns metrics.
    """
    if len(y_true) == 0:
        return {}
        
    return {
        "mae": float(mean_absolute_error(y_true, y_pred)),
        "rmse": float(np.sqrt(mean_squared_error(y_true, y_pred))),
        "r2": float(r2_score(y_true, y_pred))
    }
