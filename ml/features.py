import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def generate_features(outages_df: pd.DataFrame, target_date: datetime.date) -> dict:
    """
    Generates basic features from historical outages up to target_date.
    outages_df should be sorted by tanggal.
    """
    if outages_df.empty:
        return {}

    # Filter out outages on or after target_date for historical features
    hist_df = outages_df[outages_df['tanggal'] < target_date].copy()
    
    if hist_df.empty:
        return {}

    last_outage = hist_df.iloc[-1]
    days_since_last_outage = (target_date - last_outage['tanggal']).days
    
    day_of_week = target_date.weekday() # 0 = Monday, 6 = Sunday
    outages_on_this_day = len(hist_df[pd.to_datetime(hist_df['tanggal']).dt.weekday == day_of_week])
    total_outages = len(hist_df)
    
    recent_outages_7d = len(hist_df[hist_df['tanggal'] >= (target_date - timedelta(days=7))])
    
    avg_duration = hist_df['durasi_jam'].mean()
    
    return {
        'days_since_last': days_since_last_outage,
        'day_of_week': day_of_week,
        'outages_on_target_day_of_week': outages_on_this_day,
        'total_outages': total_outages,
        'recent_outages_7d': recent_outages_7d,
        'avg_duration': avg_duration
    }

def build_training_dataset(outages_df: pd.DataFrame):
    """
    Builds X (features), y_class (classification target), y_reg (regression target).
    For classification, generates negative samples for days without outages.
    """
    if outages_df.empty or len(outages_df) < 5:
        return None, None, None
        
    outages_df = outages_df.sort_values('tanggal').reset_index(drop=True)
    min_date = outages_df['tanggal'].min()
    max_date = outages_df['tanggal'].max()
    
    # We need at least some history before we can generate features
    # Let's start generating samples from min_date + 7 days
    start_date = min_date + timedelta(days=7)
    
    if start_date > max_date:
        return None, None, None
        
    # Create a complete date range
    date_range = pd.date_range(start_date, max_date).date
    
    # Outage dictionary for O(1) lookup
    outage_dict = dict(zip(outages_df['tanggal'], outages_df['durasi_jam']))
    
    X_list = []
    y_class_list = []
    y_reg_list = []
    
    for current_date in date_range:
        # Generate features based on history BEFORE current_date
        feats = generate_features(outages_df, current_date)
        if not feats:
            continue
            
        # Target for current_date
        is_outage = current_date in outage_dict
        
        X_list.append([
            feats['days_since_last'],
            feats['day_of_week'],
            feats['outages_on_target_day_of_week'],
            feats['total_outages'],
            feats['recent_outages_7d'],
            feats['avg_duration']
        ])
        
        y_class_list.append(1 if is_outage else 0)
        
        if is_outage:
            y_reg_list.append(outage_dict[current_date])
        else:
            y_reg_list.append(np.nan) # NaN for regression on non-outage days
            
    if not X_list:
        return None, None, None
        
    feature_names = ['days_since_last', 'day_of_week', 'outages_on_target_day_of_week', 
                     'total_outages', 'recent_outages_7d', 'avg_duration']
                     
    X_df = pd.DataFrame(X_list, columns=feature_names)
    y_class = pd.Series(y_class_list)
    y_reg = pd.Series(y_reg_list)
    
    return X_df, y_class, y_reg
