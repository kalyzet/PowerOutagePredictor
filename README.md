# Software Requirements Specification (SRS)

# Power Outage Predictor

### Versi 0.2 — Requirements Final untuk V1

---

## 1. Gambaran Umum

**Power Outage Predictor** adalah aplikasi web personal untuk mencatat, mengelola, menganalisis, dan memprediksi pola pemadaman listrik berdasarkan data historis yang dikumpulkan secara manual oleh pengguna.

Sistem menggunakan data pemadaman pada **satu lokasi tetap**, yaitu lokasi pengguna. Data dapat dimasukkan secara manual melalui aplikasi maupun melalui import file Excel.

Sistem menggunakan pendekatan **data-driven** dengan membandingkan metode sederhana berbasis histori (*baseline*) dengan model Machine Learning. Dataset akan terus bertambah seiring pengguna mencatat kejadian pemadaman baru.

Sistem bukan merupakan sistem resmi penyedia listrik dan hasil prediksi tidak dianggap sebagai jadwal pemadaman resmi.

---

# 2. Tujuan Sistem

Sistem bertujuan untuk:

1. Mencatat histori pemadaman listrik secara terstruktur.
2. Mengelola data pemadaman melalui aplikasi.
3. Mengimpor data historis dari Excel.
4. Menampilkan statistik dan pola pemadaman.
5. Menganalisis pola berdasarkan tanggal, hari, waktu, dan durasi.
6. Memprediksi kemungkinan pemadaman pada beberapa horizon waktu.
7. Mengestimasi durasi pemadaman berikutnya.
8. Membandingkan performa baseline dengan model Machine Learning.
9. Menyimpan histori prediksi.
10. Membandingkan prediksi dengan kejadian aktual.
11. Menampilkan tingkat keandalan prediksi berdasarkan kondisi dataset dan performa model.
12. Memungkinkan model dikembangkan seiring bertambahnya data.

---

# 3. Ruang Lingkup

## 3.1 Lokasi

V1 hanya menangani **satu lokasi**.

Sistem tidak menyediakan pengelolaan banyak lokasi pada V1.

Data lokasi tidak perlu dimasukkan berulang pada setiap catatan karena seluruh dataset berasal dari lokasi yang sama.

---

## 3.2 Sumber Data

Sistem memiliki dua sumber input:

1. **Input manual**
2. **Import Excel (.xlsx)**

Sistem tidak menggunakan API eksternal untuk mengambil data pemadaman.

---

## 3.3 Status Pemadaman

Seluruh pemadaman yang dicatat dianggap sebagai **pemadaman sesuai jadwal** berdasarkan kondisi data pengguna.

Oleh karena itu, V1 tidak membutuhkan field:

* Status terjadwal/tidak terjadwal
* Jenis pemadaman

---

## 3.4 Data Cuaca

Data cuaca **tidak digunakan pada V1** karena tidak tersedia sumber data atau perangkat pengukuran yang digunakan dalam pengumpulan dataset.

Fitur tersebut dapat dipertimbangkan pada versi berikutnya apabila tersedia sumber data yang sesuai.

---

# 4. Teknologi yang Digunakan

## 4.1 Frontend

* **React.js**
* **Vite**
* **Tailwind CSS**
* **Recharts**

Digunakan untuk:

* Dashboard
* Form data
* Tabel histori
* Grafik
* Tampilan prediksi
* Evaluasi model

---

## 4.2 Backend

* **Python**
* **FastAPI**
* **Uvicorn**
* **Pydantic**

Backend menyediakan REST API untuk frontend dan menghubungkan aplikasi dengan database serta engine Machine Learning.

---

## 4.3 Data Processing

* **Pandas**
* **NumPy**

Digunakan untuk:

* Cleaning
* Transformasi data
* Feature engineering
* Analisis statistik
* Persiapan dataset Machine Learning

---

## 4.4 Machine Learning

* **Scikit-learn**
* **Joblib**

Model V1:

### Classification

* Baseline
* Logistic Regression
* Random Forest Classifier

### Regression

* Baseline Regression
* Linear Regression

Arsitektur Machine Learning harus dibuat modular sehingga model lain dapat ditambahkan tanpa perubahan besar pada sistem utama.

---

## 4.5 Database

**SQLite**

Digunakan untuk penyimpanan lokal:

* Data pemadaman
* Histori prediksi
* Hasil evaluasi prediksi
* Evaluasi model

---

## 4.6 Excel

* **Pandas**
* **openpyxl**

Digunakan untuk import dan export dataset `.xlsx`.

---

# 5. Arsitektur Sistem

```text
┌─────────────────────────────────┐
│        React + Vite             │
│        Tailwind + Recharts      │
└───────────────┬─────────────────┘
                │ REST API / JSON
                ▼
┌─────────────────────────────────┐
│             FastAPI             │
│          Backend Layer          │
├─────────────────────────────────┤
│ CRUD │ Prediction │ Training    │
│      │ Evaluation │ Import/Export│
└───────────────┬─────────────────┘
                │
        ┌───────┴────────┐
        ▼                ▼
┌──────────────┐  ┌─────────────────┐
│    SQLite    │  │   ML Engine     │
│              │  │                 │
│ Outages      │  │ Pandas          │
│ Predictions  │  │ Scikit-learn   │
│ Evaluations  │  │ Joblib           │
└──────────────┘  └─────────────────┘
```

---

# 6. Aktor Sistem

V1 hanya memiliki satu aktor:

### User

User dapat:

* Menambahkan data pemadaman.
* Mengubah data.
* Menghapus data.
* Mengimpor Excel.
* Mengekspor data.
* Melihat statistik.
* Menjalankan prediksi.
* Melatih model.
* Melihat evaluasi model.
* Melihat histori prediksi.
* Melihat hasil aktual prediksi.

V1 tidak membutuhkan sistem authentication/login.

---

# 7. Functional Requirements

## FR-01 — Menambahkan Data Pemadaman

Sistem harus memungkinkan user mencatat kejadian pemadaman secara manual.

Data yang dimasukkan:

* Tanggal
* Jam mati
* Jam nyala
* Keterangan opsional

Sistem menghitung `Durasi_Jam` secara otomatis.

---

## FR-02 — Perhitungan Durasi

Sistem harus menghitung durasi berdasarkan `Jam Mati` dan `Jam Nyala`.

Sistem harus mendukung kondisi ketika jam nyala berada setelah tengah malam.

Contoh:

```text
Jam Mati  : 23:00
Jam Nyala : 05:00
Durasi    : 6 jam
```

---

## FR-03 — Edit Data

User dapat mengubah data pemadaman yang telah tersimpan.

Setelah perubahan dilakukan, durasi harus dihitung kembali.

---

## FR-04 — Hapus Data

User dapat menghapus data pemadaman.

Sistem harus meminta konfirmasi sebelum penghapusan.

---

## FR-05 — Import Excel

User dapat mengimpor dataset pemadaman dalam format `.xlsx`.

Sistem harus melakukan validasi struktur dan tipe data sebelum data dimasukkan ke database.

---

## FR-06 — Export Excel

User dapat mengekspor histori pemadaman ke `.xlsx`.

---

## FR-07 — Dashboard

Dashboard menampilkan informasi utama:

* Total kejadian pemadaman.
* Total durasi.
* Rata-rata durasi.
* Median durasi.
* Durasi minimum.
* Durasi maksimum.
* Pemadaman terakhir.
* Streak pemadaman.
* Statistik berdasarkan hari.
* Statistik berdasarkan waktu.

---

## FR-08 — Visualisasi Data

Sistem menyediakan visualisasi:

1. Frekuensi pemadaman berdasarkan tanggal.
2. Durasi pemadaman berdasarkan tanggal.
3. Distribusi pemadaman berdasarkan hari.
4. Distribusi jam mulai pemadaman.
5. Perubahan durasi dari waktu ke waktu.
6. Streak pemadaman.

---

# 8. Feature Engineering

## FR-09 — Feature Engineering Otomatis

Sistem harus menghasilkan fitur secara otomatis dari histori pemadaman.

### Fitur classification

Contoh:

```text
Mati
Mati_Kemarin
Mati_2_Hari_Lalu
Mati_3_Hari_Lalu
Mati_3_Hari_Terakhir
Hari_Minggu
Tanggal_Hari
Bulan
Hari_Ke
```

### Fitur regression

Contoh:

```text
Durasi_Sebelumnya
Rata2_Durasi_Sebelumnya
Jarak_Hari_Sebelumnya
Hari_Minggu
Tanggal_Hari
Hari_Ke
```

### Fitur waktu

Data jam juga dapat ditransformasikan menjadi fitur numerik seperti:

```text
Jam_Mati_Menit
Jam_Nyala_Menit
```

Fitur tersebut dapat digunakan pada eksperimen model apabila jumlah data sudah memadai.

---

# 9. Prediction System

## FR-10 — Prediksi Kemungkinan Pemadaman

Sistem dapat memprediksi kemungkinan pemadaman berdasarkan histori.

Output minimal:

```text
Prediksi       : Mati / Tidak Mati
Probabilitas   : XX%
Model          : Nama model
Reliability    : Level keandalan
```

---

## FR-11 — Multi-Horizon Prediction

Sistem tidak terbatas pada prediksi satu hari.

Sistem harus dirancang agar dapat mendukung beberapa horizon prediksi, misalnya:

```text
1 hari
3 hari
7 hari
```

Horizon yang digunakan pada implementasi aktual harus disesuaikan dengan jumlah data dan kemampuan model.

Sistem tidak boleh memberikan kesan bahwa prediksi jangka panjang memiliki tingkat keandalan yang sama dengan prediksi jangka pendek apabila performanya berbeda.

---

## FR-12 — Prediksi Durasi

Sistem dapat memberikan estimasi durasi pemadaman apabila prediksi menunjukkan kemungkinan terjadinya pemadaman.

Contoh:

```text
Kemungkinan mati : 72%
Estimasi durasi   : 3,5 jam
```

Estimasi bukan merupakan jadwal resmi.

---

# 10. Reliability Indicator

## FR-13 — Tingkat Keandalan Prediksi

Sistem harus menyediakan indikator keandalan untuk membantu user memahami keterbatasan prediksi.

Contoh:

```text
🟢 Tinggi
🟡 Sedang
🔴 Rendah
```

Penentuan tingkat keandalan dapat mempertimbangkan:

* Jumlah data.
* Jumlah kejadian positif.
* Performa validasi model.
* Konsistensi performa antar-fold.
* Horizon prediksi.

Indikator reliability tidak boleh disamakan secara langsung dengan probabilitas prediksi.

Contoh:

```text
Probabilitas: 80%
Reliability : Rendah
```

Tetap memungkinkan apabila model menghasilkan probabilitas tinggi tetapi dataset belum memadai.

---

# 11. Machine Learning

## FR-14 — Training Model

User dapat menjalankan proses training secara manual.

Pipeline:

```text
SQLite
 ↓
Data Cleaning
 ↓
Feature Engineering
 ↓
Time-based Split / Cross Validation
 ↓
Training
 ↓
Evaluation
 ↓
Model Selection
 ↓
Save Model
```

---

## FR-15 — Classification Models

Sistem mendukung:

### Baseline

Menggunakan pola histori sederhana sebagai pembanding.

### Logistic Regression

Digunakan untuk klasifikasi kemungkinan pemadaman.

### Random Forest Classifier

Digunakan sebagai alternatif model non-linear.

---

## FR-16 — Regression Models

Sistem mendukung:

### Baseline Regression

Prediksi berdasarkan durasi kejadian sebelumnya.

### Linear Regression

Digunakan untuk estimasi durasi pemadaman.

---

## FR-17 — Model Modular

Model Machine Learning harus dipisahkan dari API dan frontend.

Struktur model harus memungkinkan penambahan algoritma baru tanpa mengubah keseluruhan sistem.

Contoh:

```text
ml/
├── classification/
│   ├── baseline.py
│   ├── logistic_regression.py
│   └── random_forest.py
│
├── regression/
│   ├── baseline.py
│   └── linear_regression.py
│
├── preprocessing.py
├── features.py
├── evaluation.py
└── training.py
```

---

# 12. Model Evaluation

## FR-18 — Evaluasi Classification

Metrik:

* Accuracy
* Precision
* Recall
* F1-score
* Confusion Matrix

---

## FR-19 — Evaluasi Regression

Metrik:

* MAE
* RMSE
* R²

---

## FR-20 — Time Series Cross-Validation

Sistem harus menggunakan validasi berbasis waktu untuk evaluasi model apabila jumlah data memungkinkan.

Data masa depan tidak boleh digunakan untuk melatih model pada periode masa lalu.

---

## FR-21 — Model Comparison

Sistem dapat membandingkan performa model.

Classification:

```text
Baseline
vs
Logistic Regression
vs
Random Forest
```

Regression:

```text
Baseline
vs
Linear Regression
```

Model Machine Learning tidak otomatis dianggap lebih baik hanya karena menggunakan algoritma Machine Learning.

---

# 13. Prediction Log

## FR-22 — Penyimpanan Prediksi

Sistem harus menyimpan histori setiap prediksi.

Data minimal:

```text
Tanggal Prediksi
Target Tanggal
Horizon
Prediksi Mati
Probabilitas
Prediksi Durasi
Model
Reliability
```

---

## FR-23 — Evaluasi Prediksi Aktual

Setelah target tanggal terlewati, sistem dapat mencocokkan prediksi dengan data aktual.

Contoh:

```text
Prediksi:
5 Agustus
Mati: Ya
Durasi: 3,5 jam

Aktual:
Mati: Ya
Durasi: 3,5 jam

Hasil:
✓ Prediksi kejadian benar
Error durasi: 0 jam
```

---

## FR-24 — Performa Prediksi Aktual

Sistem dapat menghitung performa prediksi berdasarkan histori aktual.

Classification:

* Accuracy
* Precision
* Recall
* F1-score

Regression:

* MAE
* RMSE

Dengan demikian performa prediksi di dunia nyata dapat dibandingkan dengan hasil validasi model.

---

# 14. Model Storage

## FR-25 — Penyimpanan Model

Model terlatih dapat disimpan menggunakan Joblib.

Contoh:

```text
models/
├── outage_classifier.pkl
└── duration_regressor.pkl
```

Informasi model juga harus menyimpan metadata seperti:

* Nama model.
* Tanggal training.
* Jumlah data training.
* Fitur yang digunakan.
* Metrik evaluasi.

---

# 15. Database

## Tabel `outages`

```text
id
tanggal
jam_mati
jam_nyala
durasi_jam
keterangan
created_at
updated_at
```

Karena V1 hanya menangani satu lokasi, field `tempat` tidak diperlukan pada setiap record.

---

## Tabel `predictions`

```text
id
tanggal_prediksi
tanggal_target
horizon_hari
prediksi_mati
probabilitas
prediksi_durasi
model
reliability
created_at
```

---

## Tabel `prediction_results`

```text
id
prediction_id
aktual_mati
aktual_durasi
prediksi_benar
error_durasi
evaluated_at
```

---

## Tabel `model_evaluations`

```text
id
model_name
model_type
training_samples
test_samples
accuracy
precision
recall
f1_score
mae
rmse
r2
trained_at
```

Metrik classification dan regression bersifat opsional sesuai tipe model.

---

# 16. Non-Functional Requirements

## NFR-01 — Usability

Antarmuka harus mudah digunakan oleh pengguna tanpa pengetahuan Machine Learning.

---

## NFR-02 — Performance

Operasi CRUD, dashboard, dan prediksi sederhana harus berjalan responsif pada komputer lokal.

---

## NFR-03 — Reliability

Proses training tidak boleh mengubah atau menghapus data histori pemadaman.

---

## NFR-04 — Maintainability

Komponen frontend, backend, database, preprocessing, training, dan prediction harus dipisahkan.

---

## NFR-05 — Scalability

Sistem harus dapat menangani pertambahan dataset dari puluhan menjadi ratusan hingga ribuan catatan tanpa perubahan besar pada arsitektur.

---

## NFR-06 — Privacy

Data disimpan secara lokal pada V1.

Sistem tidak mengirimkan dataset pemadaman ke layanan cloud eksternal.

---

## NFR-07 — Explainability

Sistem harus menunjukkan:

* Model yang digunakan.
* Metrik evaluasi.
* Jumlah data.
* Reliability indicator.

Sistem tidak boleh menyajikan prediksi sebagai kepastian.

---

# 17. Batasan Sistem

1. Sistem hanya menangani satu lokasi pada V1.
2. Data dimasukkan secara manual atau melalui Excel.
3. Tidak menggunakan API eksternal.
4. Tidak menggunakan data cuaca.
5. Tidak memiliki authentication pada V1.
6. Tidak menggunakan data real-time dari penyedia listrik.
7. Prediksi bukan jadwal resmi pemadaman.
8. Performa model bergantung pada jumlah dan kualitas dataset.
9. Dataset kecil dapat menyebabkan hasil evaluasi tidak stabil.
10. Multi-horizon prediction hanya digunakan apabila jumlah data memungkinkan.
11. Model Machine Learning dapat diganti atau ditambahkan pada versi berikutnya.

---

# 18. Struktur Project

```text
power-outage-predictor/
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── api/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── database/
│   │
│   └── requirements.txt
│
├── ml/
│   ├── classification/
│   ├── regression/
│   ├── preprocessing.py
│   ├── features.py
│   ├── evaluation.py
│   └── training.py
│
├── models/
│
├── data/
│   └── outage_data.xlsx
│
├── notebooks/
│   └── exploratory_analysis.ipynb
│
└── README.md
```

---

# 19. Technology Stack

| Komponen         | Teknologi         |
| ---------------- | ----------------- |
| Frontend         | React.js + Vite   |
| UI               | Tailwind CSS      |
| Chart            | Recharts          |
| Backend          | FastAPI           |
| Bahasa           | Python            |
| Database         | SQLite            |
| Data Processing  | Pandas + NumPy    |
| Machine Learning | Scikit-learn      |
| Model Storage    | Joblib            |
| Excel            | Pandas + openpyxl |
| API              | REST API / JSON   |
| Eksperimen       | Google Colab      |
| Version Control  | Git + GitHub      |
| IDE              | VS Code           |

---

# 20. Prioritas Implementasi

## Phase 1 — Data Management

```text
SQLite
 ↓
CRUD
 ↓
Import Excel
 ↓
Export Excel
```

## Phase 2 — Dashboard

```text
Statistics
 ↓
Charts
 ↓
History
 ↓
Pattern Analysis
```

## Phase 3 — Prediction Engine

```text
Feature Engineering
 ↓
Baseline
 ↓
Prediction
 ↓
Reliability Indicator
```

## Phase 4 — Machine Learning

```text
Logistic Regression
Random Forest
Linear Regression
 ↓
Time Series Cross-Validation
 ↓
Model Comparison
```

## Phase 5 — Prediction Evaluation

```text
Prediction
 ↓
Actual Event
 ↓
Automatic Matching
 ↓
Prediction Evaluation
 ↓
Prediction History
```

## Phase 6 — Continuous Dataset

```text
Data Baru
 ↓
Database
 ↓
Retraining
 ↓
Evaluation
 ↓
Model Baru
```

---

# 21. Prinsip Pengembangan

Sistem menerapkan prinsip:

```text
Baseline
   ↓
Machine Learning
   ↓
Time Series Validation
   ↓
Comparison
   ↓
Choose the better approach
```

Machine Learning tidak digunakan hanya karena sistem disebut sebagai proyek Machine Learning.

Apabila baseline menghasilkan performa lebih baik, baseline dapat tetap digunakan sebagai model aktif.

Sebaliknya, apabila dataset telah bertambah dan model Machine Learning menunjukkan performa yang lebih baik serta konsisten, model tersebut dapat digunakan.

Sistem harus dapat berkembang berdasarkan data aktual, bukan berdasarkan asumsi bahwa model Machine Learning pasti lebih baik.
