# Power Outage Predictor

Aplikasi web personal untuk mencatat, menganalisis, dan memprediksi pola pemadaman listrik berdasarkan data historis. Sistem membandingkan metode berbasis histori (_baseline_) dengan model Machine Learning untuk menghasilkan prediksi yang dapat dipertanggungjawabkan.

> **Disclaimer:** Bukan sistem resmi penyedia listrik. Hasil prediksi bukan jadwal pemadaman resmi dan tidak menjamin kejadian aktual.

---

## Fitur

- **Manajemen Data** — tambah, edit, hapus catatan pemadaman (durasi dihitung otomatis, termasuk pemadaman lintas tengah malam).
- **Import / Export Excel** — masukkan data historis `.xlsx` dan ekspor kembali.
- **Dashboard & Visualisasi** — statistik (total, rata-rata, median, streak) serta grafik frekuensi, distribusi, dan tren durasi.
- **Prediksi** — kemungkinan pemadaman, estimasi durasi, dan indikator keandalan prediksi.
- **Machine Learning** — training, evaluasi, dan perbandingan _baseline_ vs model ML.
- **Evaluasi Aktual** — pencocokan prediksi dengan kejadian aktual untuk mengukur performa nyata.

---

## Tech Stack

| Komponen         | Teknologi                  |
| ---------------- | -------------------------- |
| Frontend         | React.js + Vite           |
| UI              | Tailwind CSS              |
| Chart            | Recharts             |
| Backend          | FastAPI + Uvicorn   |
| Bahasa           | Python                |
| Database         | SQLite (SQLAlchemy) |
| Data Processing  | Pandas + NumPy        |
| Machine Learning | Scikit-learn + Joblib |
| Excel | Pandas + openpyxl |

---

## Struktur Project

```text
project/
├── frontend/          # React + Vite dashboard
├── backend/           # FastAPI app (api, models, schemas, database)
│   └── models_storage/  # model .pkl hasil training (git-ignored)
├── ml/                # engine ML: preprocessing, features, training, evaluasi
│   ├── classification/ # baseline, logistic regression, random forest
│   └── regression/     # baseline, linear regression
├── data/              # database SQLite & dataset Excel (git-ignored)
├── models/            # artifact model (git-ignored)
├── notebooks/         # eksplorasi data
└── README.md
```

---

## Arsitektur

```text
React + Vite (Frontend)
        │  REST API / JSON
        ▼
  FastAPI (Backend)
        │
   ┌────┴─────┐
   ▼          ▼
 SQLite    ML Engine
 (data)   (Pandas, scikit-learn, joblib)
```

---

## Quick Start

### Prasyarat

- Python 3.10+
- Node.js 18+
- Virtual env tersedia di `.venv` (atau `venv`)

### Opsi A — Satu Perintah (disarankan)

`start.ps1` di root menjalankan backend & frontend sekaligus dan mematikan keduanya saat **Ctrl+C**.

```powershell
.\start.ps1          # PowerShell — pakai .\ bukan ./
.\stop.ps1           # jika server nyangkut setelah Ctrl+C
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:8000` · Swagger: `http://localhost:8000/docs`

> **Kenapa server tetap jalan setelah Ctrl+C?** `start.ps1` menjalankan backend/frontend via `Start-Process -WindowStyle Hidden` (detached). Jika wrapper tertutup paksa (tutup window, Ctrl+Break, atau proses orphan), child process tetap hidup di port 8000/5173. Solusi: jalankan `.\stop.ps1` (kill by port) atau manual `Get-NetTCPConnection -LocalPort 8000,5173 | % { Stop-Process -Id $_.OwningProcess -Force }`. Script terbaru sudah menambahkan fallback kill-by-port di `finally` agar `Ctrl+C` lebih reliable, dan `stop.ps1` tersedia untuk kasus nyangkut.

### Opsi B — Manual (dua terminal)

Jika ingin log terpisah per proses atau develop lebih lanjut.

**Terminal 1 — Backend (port 8000):**

```powershell
.\.venv\Scripts\Activate.ps1
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Terminal 2 — Frontend (port 5173):**

```powershell
cd frontend
npm install
npm run dev
```

> Pilih venv yang ada: `.venv` atau `venv`. Frontend terhubung ke `http://localhost:8000/api` (lihat `frontend/src/services/api.js`).

### Catatan

- PowerShell pakai `.\start.ps1` (bukan `./start.ps1` — yang terakhir error `CommandNotFoundException` di Windows PowerShell).
- Pastikan port `8000` dan `5173` tidak sedang terpakai saat menjalankan `start.ps1`; jika error `Port already in use`, jalankan `.\stop.ps1` dulu.
- Jika `.\start.ps1` error `Virtual env not found` padahal folder `.venv` ada, kemungkinan venv corrupt (hanya berisi `Lib` tanpa `Scripts\python.exe`) — recreate: `Remove-Item .venv -Recurse -Force; python -m venv .venv`.
- Training model: lewat UI atau `POST /api/training/train`; hasil disimpan di `backend/models_storage`.
- Build produksi frontend: `npm run build`.

---

## REST API

Semua endpoint di-prefix `/api`.

| Metode | Endpoint | Keterangan |
| ------ | -------- | ---------- |
| GET/POST | `/outages/` | Daftar / tambah pemadaman |
| PUT/DELETE | `/outages/{id}` | Ubah / hapus pemadaman |
| POST | `/excel/import` | Import data `.xlsx` |
| GET | `/excel/export` | Export data ke `.xlsx` |
| GET | `/dashboard/` | Statistik & visualisasi |
| GET/POST | `/predictions/` | Daftar / buat prediksi |
| POST | `/training/train` | Jalankan training ML |
| GET | `/training/evaluations` | Hasil evaluasi model |
| GET | `/evaluation/` | Evaluasi prediksi aktual |

---

## Prinsip Pengembangan

```text
Baseline → Machine Learning → Time-series validation → Perbandingan → Pilih pendekatan terbaik
```

Model ML tidak otomatis dianggap lebih baik hanya karena menggunakan algoritma ML. Apabila _baseline_ berperforma lebih baik, baseline tetap dipakai sebagai model aktif. Keputusan didasarkan pada data aktual, bukan asumsi.

---

## Roadmap

1. **Data Management** — SQLite, CRUD, import/export Excel
2. **Dashboard** — statistik, grafik, histori, analisis pola
3. **Prediction Engine** — feature engineering, baseline, reliability
4. **Machine Learning** — logistic regression, random forest, linear regression + time-series CV
5. **Prediction Evaluation** — pencocokan prediksi dengan aktual
6. **Continuous Dataset** — data baru → retraining → evaluasi

---

## Batasan (V1)

- Menangani satu lokasi tetap.
- Input manual atau via Excel; tanpa API eksternal & tanpa data cuaca.
- Tanpa autentikasi.
- Performa sangat bergantung pada jumlah & kualitas dataset — dataset kecil dapat menghasilkan evaluasi yang tidak stabil.