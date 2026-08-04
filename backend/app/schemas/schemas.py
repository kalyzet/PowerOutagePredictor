from pydantic import BaseModel
from datetime import date, time, datetime
from typing import Optional

class OutageBase(BaseModel):
    tanggal: date
    jam_mati: time
    jam_nyala: time
    keterangan: Optional[str] = None

    class Config:
        from_attributes = True

class OutageCreate(OutageBase):
    pass

class OutageUpdate(OutageBase):
    pass

class OutageResponse(OutageBase):
    id: int
    durasi_jam: float
    created_at: datetime
    updated_at: datetime
