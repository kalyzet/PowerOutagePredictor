from sklearn.linear_model import LinearRegression

def get_regression_models():
    """
    Returns a dictionary of uninitialized scikit-learn regression models.
    """
    return {
        "LinearRegression": LinearRegression()
    }
