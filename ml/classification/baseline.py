def predict_outage_probability(features: dict) -> float:
    """
    Returns probability of an outage (0.0 to 1.0) based on simple heuristics.
    """
    if not features:
        return 0.0 # No data
        
    prob = 0.1 # Base probability
    
    # If it happens frequently on this day of the week
    total = features.get('total_outages', 0)
    if total > 0 and features.get('outages_on_target_day_of_week', 0) > (total / 7):
        prob += 0.3
        
    # If there was an outage recently
    if features.get('days_since_last', 999) <= 3:
        prob += 0.2
        
    # If there were many outages in the last 7 days
    if features.get('recent_outages_7d', 0) >= 2:
        prob += 0.3
        
    return min(prob, 0.99)
