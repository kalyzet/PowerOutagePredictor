from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import pandas as pd
import io
from datetime import datetime

from app.database.database import get_db
from app.models.models import Outage
from app.api.outages import calculate_duration

router = APIRouter(prefix="/excel", tags=["Excel Import/Export"])

@router.post("/import")
async def import_excel(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload an Excel file.")
        
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        # Validate columns
        required_cols = ['tanggal', 'jam_mati', 'jam_nyala']
        if not all(col in df.columns for col in required_cols):
            raise HTTPException(status_code=400, detail=f"Excel must contain columns: {', '.join(required_cols)}")
            
        success_count = 0
        for index, row in df.iterrows():
            try:
                # Handle types properly depending on how pandas reads them
                tanggal_val = pd.to_datetime(row['tanggal']).date()
                
                # Check if jam is string or time object
                jam_mati_val = row['jam_mati']
                if isinstance(jam_mati_val, str):
                    jam_mati_val = datetime.strptime(jam_mati_val, "%H:%M:%S").time() if len(jam_mati_val) > 5 else datetime.strptime(jam_mati_val, "%H:%M").time()
                elif hasattr(jam_mati_val, "time"):
                    jam_mati_val = jam_mati_val.time()
                    
                jam_nyala_val = row['jam_nyala']
                if isinstance(jam_nyala_val, str):
                    jam_nyala_val = datetime.strptime(jam_nyala_val, "%H:%M:%S").time() if len(jam_nyala_val) > 5 else datetime.strptime(jam_nyala_val, "%H:%M").time()
                elif hasattr(jam_nyala_val, "time"):
                    jam_nyala_val = jam_nyala_val.time()
                    
                durasi_jam = calculate_duration(jam_mati_val, jam_nyala_val)
                keterangan = str(row['keterangan']) if 'keterangan' in row and pd.notna(row['keterangan']) else None
                
                db_outage = Outage(
                    tanggal=tanggal_val,
                    jam_mati=jam_mati_val,
                    jam_nyala=jam_nyala_val,
                    durasi_jam=durasi_jam,
                    keterangan=keterangan
                )
                db.add(db_outage)
                success_count += 1
            except Exception as e:
                # Skip invalid rows or log them
                print(f"Error row {index}: {e}")
                continue
                
        db.commit()
        return {"message": f"Successfully imported {success_count} records"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

@router.get("/export")
def export_excel(db: Session = Depends(get_db)):
    outages = db.query(Outage).order_by(Outage.tanggal.desc(), Outage.jam_mati.desc()).all()
    
    data = []
    for o in outages:
        data.append({
            "id": o.id,
            "tanggal": o.tanggal.strftime("%Y-%m-%d"),
            "jam_mati": o.jam_mati.strftime("%H:%M:%S"),
            "jam_nyala": o.jam_nyala.strftime("%H:%M:%S"),
            "durasi_jam": o.durasi_jam,
            "keterangan": o.keterangan or ""
        })
        
    df = pd.DataFrame(data)
    
    stream = io.BytesIO()
    with pd.ExcelWriter(stream, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Outages')
        
    stream.seek(0)
    
    return StreamingResponse(
        stream, 
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=outages_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"}
    )
