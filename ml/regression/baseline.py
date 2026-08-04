def predict_outage_duration(features: dict) -> float:
    """
    Returns estimated duration in hours based on simple historical average.
    """
    if not features or features.get('avg_duration', 0) == 0:
        return 2.0 # Default 2 hours if no data
        
    return round(features['avg_duration'], 2)
