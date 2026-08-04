from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database.database import engine, Base
from app.models import models

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Power Outage Predictor API",
    description="API for managing and predicting power outages.",
    version="1.0.0",
)

# CORS configuration
origins = [
    "http://localhost:5173", # Vite default port
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to Power Outage Predictor API"}

from app.api import outages, excel_handler, dashboard, predictions, training_api, evaluation_api

app.include_router(outages.router, prefix="/api")
app.include_router(excel_handler.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(predictions.router, prefix="/api")
app.include_router(training_api.router, prefix="/api")
app.include_router(evaluation_api.router, prefix="/api")
