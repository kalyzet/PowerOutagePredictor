from sqlalchemy import Column, Integer, String, Float, Boolean, Date, Time, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.database import Base

class Outage(Base):
    __tablename__ = "outages"

    id = Column(Integer, primary_key=True, index=True)
    tanggal = Column(Date, nullable=False)
    jam_mati = Column(Time, nullable=False)
    jam_nyala = Column(Time, nullable=False)
    durasi_jam = Column(Float, nullable=False)
    keterangan = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    tanggal_prediksi = Column(Date, nullable=False)
    tanggal_target = Column(Date, nullable=False)
    horizon_hari = Column(Integer, nullable=False)
    prediksi_mati = Column(Boolean, nullable=False)
    probabilitas = Column(Float, nullable=False)
    prediksi_durasi = Column(Float, nullable=True)
    model = Column(String, nullable=False)
    reliability = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    results = relationship("PredictionResult", back_populates="prediction", uselist=False)

class PredictionResult(Base):
    __tablename__ = "prediction_results"

    id = Column(Integer, primary_key=True, index=True)
    prediction_id = Column(Integer, ForeignKey("predictions.id"))
    aktual_mati = Column(Boolean, nullable=False)
    aktual_durasi = Column(Float, nullable=True)
    prediksi_benar = Column(Boolean, nullable=False)
    error_durasi = Column(Float, nullable=True)
    evaluated_at = Column(DateTime, default=datetime.utcnow)

    prediction = relationship("Prediction", back_populates="results")

class ModelEvaluation(Base):
    __tablename__ = "model_evaluations"

    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String, nullable=False)
    model_type = Column(String, nullable=False)
    training_samples = Column(Integer, nullable=False)
    test_samples = Column(Integer, nullable=False)
    accuracy = Column(Float, nullable=True)
    precision = Column(Float, nullable=True)
    recall = Column(Float, nullable=True)
    f1_score = Column(Float, nullable=True)
    mae = Column(Float, nullable=True)
    rmse = Column(Float, nullable=True)
    r2 = Column(Float, nullable=True)
    trained_at = Column(DateTime, default=datetime.utcnow)
