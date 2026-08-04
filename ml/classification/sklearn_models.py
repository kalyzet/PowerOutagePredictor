from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier

def get_classification_models():
    """
    Returns a dictionary of uninitialized scikit-learn classification models.
    """
    return {
        "LogisticRegression": LogisticRegression(random_state=42, max_iter=1000),
        "RandomForest": RandomForestClassifier(random_state=42, n_estimators=100)
    }
