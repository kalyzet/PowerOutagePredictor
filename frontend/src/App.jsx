import React, { useState, useEffect, useRef } from 'react';
import {
    outageApi,
    excelApi,
    dashboardApi,
    predictionApi,
    trainingApi,
    evaluationApi,
} from './services/api';
import {
    Zap,
    UploadCloud,
    Download,
    Plus,
    Trash2,
    RefreshCw,
    Activity,
    AlertCircle,
    LayoutDashboard,
    Database,
    BrainCircuit,
    Search,
    Settings,
    ClipboardList,
    Calendar,
    CheckCircle2,
    X,
} from 'lucide-react';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

function App() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [outages, setOutages] = useState([]);
    const [stats, setStats] = useState({
        total_outages: 0,
        total_duration: 0,
        avg_duration: 0,
        max_duration: 0,
        last_outage: null,
    });
    const [charts, setCharts] = useState({
        trend: [],
        time_distribution: [],
    });

    const [loading, setLoading] = useState(true);
    const [dashboardLoading, setDashboardLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        tanggal: '',
        jam_mati: '',
        jam_nyala: '',
        keterangan: '',
    });
    const fileInputRef = useRef(null);

    const [predictTargetDate, setPredictTargetDate] = useState('');
    const [predictionData, setPredictionData] = useState(null);
    const [predictLoading, setPredictLoading] = useState(false);
    const [trainLoading, setTrainLoading] = useState(false);
    const [trainResults, setTrainResults] = useState(null);

    const [prediction7DaysData, setPrediction7DaysData] = useState(null);
    const [toasts, setToasts] = useState([]);

    const addToast = (message, type = 'info') => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    };

    const [todayStr, setTodayStr] = useState(() =>
        new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    );

    useEffect(() => {
        const fmt = () =>
            new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        const now = new Date();
        const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now;
        const timeout = setTimeout(() => {
            setTodayStr(fmt());
            const interval = setInterval(() => setTodayStr(fmt()), 86400000);
            return () => clearInterval(interval);
        }, msUntilMidnight);
        const intervalDaily = setInterval(() => setTodayStr(fmt()), 60000);
        return () => {
            clearTimeout(timeout);
            clearInterval(intervalDaily);
        };
    }, []);

    const [evalLogs, setEvalLogs] = useState([]);
    const [evalMetrics, setEvalMetrics] = useState(null);
    const [evalLoading, setEvalLoading] = useState(false);

    useEffect(() => {
        if (activeTab === 'data') {
            fetchOutages();
        } else if (activeTab === 'dashboard') {
            fetchDashboard();
        } else if (activeTab === 'eval') {
            fetchEvaluation();
        }
    }, [activeTab]);

    const fetchOutages = async () => {
        setLoading(true);
        try {
            const response = await outageApi.getAll();
            setOutages(response.data);
        } catch (error) {
            console.error('Gagal mengambil data', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDashboard = async () => {
        setDashboardLoading(true);
        try {
            const [statsRes, chartsRes] = await Promise.all([
                dashboardApi.getStats(),
                dashboardApi.getCharts(),
            ]);
            setStats(statsRes.data);
            setCharts(chartsRes.data);
        } catch (error) {
            console.error('Gagal memuat dashboard', error);
        } finally {
            setDashboardLoading(false);
        }
    };

    const fetchEvaluation = async () => {
        setEvalLoading(true);
        try {
            const [logsRes, metricsRes] = await Promise.all([
                evaluationApi.getLogs(),
                evaluationApi.getMetrics(),
            ]);
            setEvalLogs(logsRes.data);
            setEvalMetrics(metricsRes.data);
        } catch (error) {
            console.error('Gagal memuat evaluasi', error);
        } finally {
            setEvalLoading(false);
        }
    };

    const handleRunEvaluation = async () => {
        setEvalLoading(true);
        try {
            await evaluationApi.runEvaluation();
            addToast('Evaluasi (pencocokan data aktual) selesai dijalankan!', 'success');
            fetchEvaluation();
        } catch (error) {
            console.error('Gagal menjalankan evaluasi', error);
            addToast('Gagal menjalankan evaluasi.', 'error');
        } finally {
            setEvalLoading(false);
        }
    };

    const handlePredict7Days = async (e) => {
        e.preventDefault();
        if (!predictTargetDate) return;
        setPredictLoading(true);
        setPrediction7DaysData(null);
        setPredictionData(null);
        try {
            const startDate = new Date(predictTargetDate);
            const promises = [];
            const dates = [];
            for (let i = 0; i < 7; i++) {
                const d = new Date(startDate);
                d.setDate(d.getDate() + i);
                const dateStr = d.toISOString().split('T')[0];
                dates.push(dateStr);
                promises.push(predictionApi.predict(dateStr));
            }
            const results = await Promise.all(promises);
            const formattedData = results.map((res, i) => ({
                tanggal: dates[i],
                probabilitas: res.data.probabilitas,
                prediksi_mati: res.data.prediksi_mati,
                durasi: res.data.prediksi_durasi,
            }));
            setPrediction7DaysData(formattedData);
        } catch (error) {
            console.error('Gagal melakukan prediksi 7 hari', error);
            addToast('Gagal memuat prediksi 7 hari.', 'error');
        } finally {
            setPredictLoading(false);
        }
    };

    const handlePredict = async (e) => {
        e.preventDefault();
        if (!predictTargetDate) return;
        setPredictLoading(true);
        setPrediction7DaysData(null);
        try {
            const response = await predictionApi.predict(predictTargetDate);
            setPredictionData(response.data);
        } catch (error) {
            console.error('Gagal melakukan prediksi', error);
            addToast('Gagal memuat prediksi.', 'error');
        } finally {
            setPredictLoading(false);
        }
    };

    const handleTrain = async () => {
        if (
            !window.confirm(
                'Apakah Anda yakin ingin melatih ulang model Machine Learning dengan data saat ini? Proses ini mungkin membutuhkan waktu.',
            )
        ) {
            return;
        }

        setTrainLoading(true);
        setTrainResults(null);
        try {
            const response = await trainingApi.train();
            if (response.data.status === 'success') {
                setTrainResults(response.data);
            } else {
                addToast(
                    response.data.message || 'Gagal melatih model (mungkin data kurang).',
                    'error',
                );
            }
        } catch (error) {
            console.error('Gagal melatih model', error);
            addToast('Gagal melatih model. Pastikan backend berjalan.', 'error');
        } finally {
            setTrainLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Add seconds if missing
            const dataToSubmit = {
                ...formData,
                jam_mati:
                    formData.jam_mati.length === 5 ? `${formData.jam_mati}:00` : formData.jam_mati,
                jam_nyala:
                    formData.jam_nyala.length === 5
                        ? `${formData.jam_nyala}:00`
                        : formData.jam_nyala,
            };
            await outageApi.create(dataToSubmit);
            setFormData({ tanggal: '', jam_mati: '', jam_nyala: '', keterangan: '' });
            setShowForm(false);

            if (activeTab === 'data') fetchOutages();
            else if (activeTab === 'dashboard') fetchDashboard();
        } catch (error) {
            console.error('Gagal menambahkan data', error);
            addToast('Gagal menambahkan data. Periksa konsol untuk detail.', 'error');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus data ini?')) {
            try {
                await outageApi.delete(id);
                if (activeTab === 'data') fetchOutages();
                else if (activeTab === 'dashboard') fetchDashboard();
            } catch (error) {
                console.error('Gagal menghapus', error);
            }
        }
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setLoading(true);
            await excelApi.import(file);
            addToast('File berhasil diimpor', 'success');
            if (activeTab === 'data') fetchOutages();
            else if (activeTab === 'dashboard') fetchDashboard();
        } catch (error) {
            console.error('Import gagal', error);
            addToast('Gagal mengimpor file Excel. Pastikan format kolom sesuai.', 'error');
        } finally {
            setLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleExport = () => {
        excelApi.export();
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-sm">
                    <p className="font-medium text-slate-300 mb-1">{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} style={{ color: entry.color }}>
                            {entry.name}: {entry.value}{' '}
                            {entry.name.toLowerCase().includes('durasi') ? 'jam' : ''}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-white">
            {/* Toast Container */}
            <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border animate-in fade-in slide-in-from-right-4 ${
                            toast.type === 'error'
                                ? 'bg-red-950/80 border-red-500/30 text-red-200'
                                : toast.type === 'success'
                                  ? 'bg-green-950/80 border-green-500/30 text-green-200'
                                  : 'bg-slate-900 border-slate-700 text-slate-200'
                        }`}
                    >
                        {toast.type === 'error' ? (
                            <AlertCircle className="w-5 h-5 text-red-400" />
                        ) : toast.type === 'success' ? (
                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                        ) : (
                            <Activity className="w-5 h-5 text-cyan-400" />
                        )}
                        <span className="text-sm font-medium">{toast.message}</span>
                        <button
                            onClick={() =>
                                setToasts((prev) => prev.filter((t) => t.id !== toast.id))
                            }
                            className="ml-2 text-slate-400 hover:text-white"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-900/20 blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/20 blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-white/10">
                            <Zap className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                                Power Outage Predictor
                            </h1>
                            <p className="text-sm text-slate-400">
                                Manajemen Data & Analisis | Hari Ini: {todayStr}
                            </p>
                        </div>
                    </div>

                    <div className="flex bg-slate-900/50 p-1 rounded-lg border border-slate-800">
                        <button
                            onClick={() => setActiveTab('dashboard')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                                activeTab === 'dashboard'
                                    ? 'bg-slate-800 text-cyan-400 shadow'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                            }`}
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            Dashboard
                        </button>
                        <button
                            onClick={() => setActiveTab('data')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                                activeTab === 'data'
                                    ? 'bg-slate-800 text-cyan-400 shadow'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                            }`}
                        >
                            <Database className="w-4 h-4" />
                            Data
                        </button>
                        <button
                            onClick={() => setActiveTab('predict')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                                activeTab === 'predict'
                                    ? 'bg-slate-800 text-indigo-400 shadow'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                            }`}
                        >
                            <BrainCircuit className="w-4 h-4" />
                            Prediksi
                        </button>
                        <button
                            onClick={() => setActiveTab('eval')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                                activeTab === 'eval'
                                    ? 'bg-slate-800 text-purple-400 shadow'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                            }`}
                        >
                            <ClipboardList className="w-4 h-4" />
                            Histori & Evaluasi
                        </button>
                    </div>
                </header>

                {/* Prediction Tab Content */}
                {activeTab === 'predict' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-800 p-6 shadow-lg max-w-2xl mx-auto">
                            <div className="flex justify-between items-start mb-2">
                                <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
                                    <BrainCircuit className="w-6 h-6 text-indigo-400" />
                                    Prediction Engine (ML)
                                </h2>
                                <button
                                    onClick={handleTrain}
                                    disabled={trainLoading}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-md border border-slate-700 transition-colors"
                                >
                                    {trainLoading ? (
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Settings className="w-3.5 h-3.5" />
                                    )}
                                    Latih Ulang Model
                                </button>
                            </div>
                            <p className="text-slate-400 text-sm mb-6">
                                Pilih tanggal untuk memprediksi probabilitas pemadaman dan estimasi
                                durasi menggunakan model Machine Learning.
                            </p>

                            {trainResults && (
                                <div className="mb-6 p-4 rounded-lg bg-indigo-900/20 border border-indigo-500/30 text-sm">
                                    <h3 className="font-semibold text-indigo-300 mb-2">
                                        ✅ Training Berhasil! (Menggunakan{' '}
                                        {trainResults.samples_used} sampel)
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4 text-slate-300">
                                        <div>
                                            <span className="text-xs text-slate-400">
                                                Model Klasifikasi:
                                            </span>
                                            <br />
                                            {trainResults.results.best_classification_model}
                                        </div>
                                        <div>
                                            <span className="text-xs text-slate-400">
                                                Model Regresi:
                                            </span>
                                            <br />
                                            {trainResults.results.best_regression_model}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handlePredict} className="flex gap-4 items-end mb-8">
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-slate-400 mb-1">
                                        Target Tanggal
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={predictTargetDate}
                                        onChange={(e) => setPredictTargetDate(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={predictLoading}
                                    className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-medium transition-all shadow-lg shadow-indigo-900/30 flex items-center gap-2 disabled:opacity-50"
                                >
                                    {predictLoading ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Search className="w-4 h-4" />
                                    )}
                                    Analisis
                                </button>
                                <button
                                    type="button"
                                    onClick={handlePredict7Days}
                                    disabled={predictLoading}
                                    className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {predictLoading ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Calendar className="w-4 h-4" />
                                    )}
                                    Prediksi 7 Hari
                                </button>
                            </form>

                            {prediction7DaysData && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <div className="p-5 rounded-xl border border-slate-700 bg-slate-900 mb-4 shadow-xl">
                                        <h3 className="text-lg font-semibold mb-4 text-slate-200">
                                            Forecast 7 Hari Ke Depan
                                        </h3>
                                        <div className="h-64 w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart
                                                    data={prediction7DaysData}
                                                    margin={{
                                                        top: 20,
                                                        right: 30,
                                                        left: 0,
                                                        bottom: 5,
                                                    }}
                                                >
                                                    <CartesianGrid
                                                        strokeDasharray="3 3"
                                                        stroke="#334155"
                                                        vertical={false}
                                                    />
                                                    <XAxis
                                                        dataKey="tanggal"
                                                        stroke="#94a3b8"
                                                        fontSize={12}
                                                        tickLine={false}
                                                        axisLine={false}
                                                    />
                                                    <YAxis
                                                        stroke="#94a3b8"
                                                        fontSize={12}
                                                        tickLine={false}
                                                        axisLine={false}
                                                        domain={[0, 100]}
                                                    />
                                                    <Tooltip
                                                        contentStyle={{
                                                            backgroundColor: '#0f172a',
                                                            borderColor: '#334155',
                                                            borderRadius: '0.5rem',
                                                        }}
                                                        itemStyle={{ color: '#e2e8f0' }}
                                                        formatter={(value) => [
                                                            `${value}%`,
                                                            'Probabilitas Mati',
                                                        ]}
                                                        labelStyle={{
                                                            color: '#94a3b8',
                                                            marginBottom: '4px',
                                                        }}
                                                    />
                                                    <Bar
                                                        dataKey="probabilitas"
                                                        name="Probabilitas"
                                                        radius={[4, 4, 0, 0]}
                                                    >
                                                        {prediction7DaysData.map((entry, index) => (
                                                            <Cell
                                                                key={`cell-${index}`}
                                                                fill={
                                                                    entry.probabilitas > 50
                                                                        ? '#ef4444'
                                                                        : '#10b981'
                                                                }
                                                            />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {predictionData && (
                                <div className="animate-in fade-in zoom-in-95 duration-300">
                                    <div className="p-5 rounded-xl border border-slate-700 bg-slate-800/50 mb-4">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <p className="text-sm text-slate-400">
                                                    Hasil Prediksi untuk:
                                                </p>
                                                <p className="text-lg font-bold text-white">
                                                    {predictionData.target_date}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-slate-400 mb-1">
                                                    Keandalan Data
                                                </p>
                                                <span
                                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                                        predictionData.reliability === 'Tinggi'
                                                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                                            : predictionData.reliability ===
                                                                'Sedang'
                                                              ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                                                    }`}
                                                >
                                                    {predictionData.reliability === 'Tinggi' &&
                                                        '🟢'}
                                                    {predictionData.reliability === 'Sedang' &&
                                                        '🟡'}
                                                    {predictionData.reliability.includes(
                                                        'Rendah',
                                                    ) && '🔴'}
                                                    <span className="ml-1">
                                                        {predictionData.reliability}
                                                    </span>
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 bg-slate-900 rounded-lg border border-slate-800">
                                                <p className="text-sm text-slate-400 mb-1">
                                                    Probabilitas Mati
                                                </p>
                                                <div className="flex items-end gap-2">
                                                    <p
                                                        className={`text-3xl font-bold ${predictionData.prediksi_mati ? 'text-red-400' : 'text-green-400'}`}
                                                    >
                                                        {predictionData.probabilitas}%
                                                    </p>
                                                    <p className="text-sm mb-1 text-slate-500">
                                                        (
                                                        {predictionData.prediksi_mati
                                                            ? 'Mati'
                                                            : 'Aman'}
                                                        )
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="p-4 bg-slate-900 rounded-lg border border-slate-800">
                                                <p className="text-sm text-slate-400 mb-1">
                                                    Estimasi Durasi
                                                </p>
                                                <p className="text-3xl font-bold text-white">
                                                    {predictionData.prediksi_durasi > 0
                                                        ? predictionData.prediksi_durasi + ' jam'
                                                        : '-'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-xs text-slate-500 text-center">
                                        <p>Model yang digunakan: {predictionData.model}</p>
                                        <p>
                                            Catatan: Prediksi heuristik ini menggunakan pola
                                            historis sederhana (hari dalam seminggu, kejadian
                                            terbaru, dan rata-rata durasi).
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Dashboard Tab Content */}
                {activeTab === 'dashboard' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {dashboardLoading ? (
                            <div className="h-64 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
                            </div>
                        ) : (
                            <>
                                {/* Stats Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-800 p-5 shadow-lg hover:border-slate-700 transition-colors">
                                        <p className="text-sm font-medium text-slate-400 mb-1">
                                            Total Pemadaman
                                        </p>
                                        <p className="text-3xl font-bold text-white">
                                            {stats.total_outages}{' '}
                                            <span className="text-sm font-normal text-slate-500">
                                                kali
                                            </span>
                                        </p>
                                    </div>
                                    <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-800 p-5 shadow-lg hover:border-slate-700 transition-colors">
                                        <p className="text-sm font-medium text-slate-400 mb-1">
                                            Total Durasi
                                        </p>
                                        <p className="text-3xl font-bold text-white">
                                            {stats.total_duration}{' '}
                                            <span className="text-sm font-normal text-slate-500">
                                                jam
                                            </span>
                                        </p>
                                    </div>
                                    <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-800 p-5 shadow-lg hover:border-slate-700 transition-colors">
                                        <p className="text-sm font-medium text-slate-400 mb-1">
                                            Rata-rata Durasi
                                        </p>
                                        <p className="text-3xl font-bold text-white">
                                            {stats.avg_duration}{' '}
                                            <span className="text-sm font-normal text-slate-500">
                                                jam/kejadian
                                            </span>
                                        </p>
                                    </div>
                                    <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-800 p-5 shadow-lg hover:border-slate-700 transition-colors">
                                        <p className="text-sm font-medium text-slate-400 mb-1">
                                            Pemadaman Terakhir
                                        </p>
                                        <p className="text-2xl font-bold text-white mt-1">
                                            {stats.last_outage || '-'}
                                        </p>
                                    </div>
                                </div>

                                {/* Charts */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Trend Chart */}
                                    <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-800 p-6 shadow-lg">
                                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                                            <Activity className="w-5 h-5 text-cyan-400" />
                                            Tren Durasi Pemadaman
                                        </h3>
                                        <div className="h-72 w-full">
                                            {charts.trend.length > 0 ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart
                                                        data={charts.trend}
                                                        margin={{
                                                            top: 5,
                                                            right: 20,
                                                            bottom: 5,
                                                            left: 0,
                                                        }}
                                                    >
                                                        <CartesianGrid
                                                            strokeDasharray="3 3"
                                                            stroke="#334155"
                                                            vertical={false}
                                                        />
                                                        <XAxis
                                                            dataKey="tanggal"
                                                            stroke="#94a3b8"
                                                            fontSize={12}
                                                            tickLine={false}
                                                            axisLine={false}
                                                        />
                                                        <YAxis
                                                            stroke="#94a3b8"
                                                            fontSize={12}
                                                            tickLine={false}
                                                            axisLine={false}
                                                        />
                                                        <Tooltip
                                                            content={<CustomTooltip />}
                                                            cursor={{
                                                                stroke: '#475569',
                                                                strokeWidth: 1,
                                                                strokeDasharray: '4 4',
                                                            }}
                                                        />
                                                        <Line
                                                            type="monotone"
                                                            dataKey="durasi"
                                                            name="Durasi"
                                                            stroke="#06b6d4"
                                                            strokeWidth={3}
                                                            dot={{
                                                                r: 4,
                                                                fill: '#06b6d4',
                                                                strokeWidth: 0,
                                                            }}
                                                            activeDot={{
                                                                r: 6,
                                                                fill: '#fff',
                                                                stroke: '#06b6d4',
                                                                strokeWidth: 2,
                                                            }}
                                                        />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div className="h-full flex items-center justify-center text-slate-500">
                                                    Belum ada data tren.
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Distribution Chart */}
                                    <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-800 p-6 shadow-lg">
                                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                                            <Activity className="w-5 h-5 text-indigo-400" />
                                            Distribusi Waktu Pemadaman
                                        </h3>
                                        <div className="h-72 w-full">
                                            {charts.time_distribution.length > 0 ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart
                                                        data={charts.time_distribution}
                                                        margin={{
                                                            top: 5,
                                                            right: 20,
                                                            bottom: 5,
                                                            left: 0,
                                                        }}
                                                    >
                                                        <CartesianGrid
                                                            strokeDasharray="3 3"
                                                            stroke="#334155"
                                                            vertical={false}
                                                        />
                                                        <XAxis
                                                            dataKey="waktu"
                                                            stroke="#94a3b8"
                                                            fontSize={12}
                                                            tickLine={false}
                                                            axisLine={false}
                                                        />
                                                        <YAxis
                                                            stroke="#94a3b8"
                                                            fontSize={12}
                                                            tickLine={false}
                                                            axisLine={false}
                                                            allowDecimals={false}
                                                        />
                                                        <Tooltip
                                                            content={<CustomTooltip />}
                                                            cursor={{ fill: '#1e293b' }}
                                                        />
                                                        <Bar
                                                            dataKey="jumlah"
                                                            name="Jumlah Kejadian"
                                                            fill="#6366f1"
                                                            radius={[4, 4, 0, 0]}
                                                        />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div className="h-full flex items-center justify-center text-slate-500">
                                                    Belum ada data distribusi.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Data Management Tab Content */}
                {activeTab === 'data' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Action Bar */}
                        <div className="flex flex-wrap items-center justify-end gap-3 mb-6">
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleImport}
                            />
                            <button
                                onClick={() => fileInputRef.current.click()}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 transition-all duration-300 hover:border-slate-500 text-sm font-medium"
                            >
                                <UploadCloud className="w-4 h-4" />
                                Impor
                            </button>
                            <button
                                onClick={handleExport}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 transition-all duration-300 hover:border-slate-500 text-sm font-medium"
                            >
                                <Download className="w-4 h-4" />
                                Ekspor
                            </button>
                            <button
                                onClick={() => setShowForm(!showForm)}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/50 transition-all duration-300 transform hover:-translate-y-0.5 text-sm font-medium"
                            >
                                <Plus className="w-4 h-4" />
                                Entri Baru
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            {/* Form Panel */}
                            {showForm && (
                                <div className="lg:col-span-4 transition-all duration-500 animate-in fade-in slide-in-from-left-4">
                                    <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-800 p-6 shadow-2xl">
                                        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                                            <Plus className="w-5 h-5 text-cyan-400" />
                                            Tambah Data Pemadaman
                                        </h2>
                                        <form onSubmit={handleSubmit} className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">
                                                    Tanggal
                                                </label>
                                                <input
                                                    type="date"
                                                    name="tanggal"
                                                    required
                                                    value={formData.tanggal}
                                                    onChange={handleInputChange}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-400 mb-1">
                                                        Jam Mati
                                                    </label>
                                                    <input
                                                        type="time"
                                                        name="jam_mati"
                                                        required
                                                        value={formData.jam_mati}
                                                        onChange={handleInputChange}
                                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-400 mb-1">
                                                        Jam Nyala
                                                    </label>
                                                    <input
                                                        type="time"
                                                        name="jam_nyala"
                                                        required
                                                        value={formData.jam_nyala}
                                                        onChange={handleInputChange}
                                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">
                                                    Keterangan (Opsional)
                                                </label>
                                                <textarea
                                                    name="keterangan"
                                                    value={formData.keterangan}
                                                    onChange={handleInputChange}
                                                    rows="3"
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all resize-none"
                                                    placeholder="Penyebab, cuaca, dsb..."
                                                ></textarea>
                                            </div>
                                            <div className="pt-2 flex gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowForm(false)}
                                                    className="flex-1 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-medium transition-colors"
                                                >
                                                    Batal
                                                </button>
                                                <button
                                                    type="submit"
                                                    className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-sm font-medium transition-all shadow-lg shadow-cyan-900/30"
                                                >
                                                    Simpan
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}

                            {/* Table Panel */}
                            <div className={showForm ? 'lg:col-span-8' : 'lg:col-span-12'}>
                                <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-800 flex flex-col h-[calc(100vh-16rem)] shadow-2xl">
                                    <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                                        <h2 className="text-lg font-semibold flex items-center gap-2">
                                            <RefreshCw
                                                className={`w-5 h-5 text-slate-400 ${loading ? 'animate-spin' : ''}`}
                                            />
                                            Histori Pemadaman
                                        </h2>
                                        <div className="text-sm text-slate-400">
                                            {outages.length} catatan ditemukan
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-auto custom-scrollbar p-2">
                                        {loading && outages.length === 0 ? (
                                            <div className="h-full flex items-center justify-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
                                            </div>
                                        ) : outages.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
                                                <AlertCircle className="w-12 h-12 opacity-50" />
                                                <p>
                                                    Belum ada catatan pemadaman. Tambahkan data atau
                                                    impor dari Excel.
                                                </p>
                                            </div>
                                        ) : (
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="sticky top-0 bg-slate-900/95 backdrop-blur z-10 text-xs uppercase tracking-wider text-slate-400">
                                                        <th className="px-4 py-3 font-medium rounded-tl-lg">
                                                            Tanggal
                                                        </th>
                                                        <th className="px-4 py-3 font-medium">
                                                            Jam Mati
                                                        </th>
                                                        <th className="px-4 py-3 font-medium">
                                                            Jam Nyala
                                                        </th>
                                                        <th className="px-4 py-3 font-medium">
                                                            Durasi (jam)
                                                        </th>
                                                        <th className="px-4 py-3 font-medium">
                                                            Keterangan
                                                        </th>
                                                        <th className="px-4 py-3 font-medium text-right rounded-tr-lg">
                                                            Aksi
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-sm">
                                                    {outages.map((item) => (
                                                        <tr
                                                            key={item.id}
                                                            className="group border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                                                        >
                                                            <td className="px-4 py-4 font-medium text-slate-300">
                                                                {item.tanggal}
                                                            </td>
                                                            <td className="px-4 py-4 text-slate-400">
                                                                {item.jam_mati}
                                                            </td>
                                                            <td className="px-4 py-4 text-slate-400">
                                                                {item.jam_nyala}
                                                            </td>
                                                            <td className="px-4 py-4">
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                                                    {item.durasi_jam.toFixed(2)}j
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-4 text-slate-400 max-w-xs truncate">
                                                                {item.keterangan || '-'}
                                                            </td>
                                                            <td className="px-4 py-4 text-right">
                                                                <button
                                                                    onClick={() =>
                                                                        handleDelete(item.id)
                                                                    }
                                                                    className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                                    title="Hapus catatan"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {/* Evaluation Tab Content */}
                {activeTab === 'eval' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
                                <ClipboardList className="w-6 h-6 text-purple-400" />
                                Histori & Evaluasi Prediksi
                            </h2>
                            <button
                                onClick={handleRunEvaluation}
                                disabled={evalLoading}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-medium transition-all shadow-lg shadow-purple-900/30 disabled:opacity-50"
                            >
                                {evalLoading ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Settings className="w-4 h-4" />
                                )}
                                Jalankan Evaluasi (Cocokkan Data)
                            </button>
                        </div>

                        {/* Metrics and Chart */}
                        {evalMetrics && evalMetrics.summary && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-800 p-6 shadow-lg">
                                    <h3 className="text-lg font-semibold mb-4 text-slate-200">
                                        Performa Nyata (Real-World)
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 bg-slate-800/50 rounded-lg">
                                                <p className="text-xs text-slate-400">
                                                    Total Dievaluasi
                                                </p>
                                                <p className="text-2xl font-bold text-white">
                                                    {evalMetrics.summary.total_evaluated}
                                                </p>
                                            </div>
                                            <div className="p-4 bg-slate-800/50 rounded-lg">
                                                <p className="text-xs text-slate-400">
                                                    Akurasi Prediksi
                                                </p>
                                                <p className="text-2xl font-bold text-green-400">
                                                    {evalMetrics.summary.classification?.accuracy
                                                        ? (
                                                              evalMetrics.summary.classification
                                                                  .accuracy * 100
                                                          ).toFixed(1) + '%'
                                                        : '-'}
                                                </p>
                                            </div>
                                            <div className="p-4 bg-slate-800/50 rounded-lg">
                                                <p className="text-xs text-slate-400">
                                                    F1 Score (Klasifikasi)
                                                </p>
                                                <p className="text-2xl font-bold text-cyan-400">
                                                    {evalMetrics.summary.classification?.f1_score
                                                        ? evalMetrics.summary.classification.f1_score.toFixed(
                                                              2,
                                                          )
                                                        : '-'}
                                                </p>
                                            </div>
                                            <div className="p-4 bg-slate-800/50 rounded-lg">
                                                <p className="text-xs text-slate-400">
                                                    MAE (Error Durasi)
                                                </p>
                                                <p className="text-2xl font-bold text-indigo-400">
                                                    {evalMetrics.summary.regression?.mae
                                                        ? evalMetrics.summary.regression.mae.toFixed(
                                                              2,
                                                          ) + ' jam'
                                                        : '-'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-800 p-6 shadow-lg">
                                    <h3 className="text-lg font-semibold mb-4 text-slate-200">
                                        Tren Akurasi
                                    </h3>
                                    <div className="h-48 w-full">
                                        {evalMetrics.chart_data &&
                                        evalMetrics.chart_data.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart
                                                    data={evalMetrics.chart_data}
                                                    margin={{
                                                        top: 5,
                                                        right: 20,
                                                        bottom: 5,
                                                        left: 0,
                                                    }}
                                                >
                                                    <CartesianGrid
                                                        strokeDasharray="3 3"
                                                        stroke="#334155"
                                                        vertical={false}
                                                    />
                                                    <XAxis
                                                        dataKey="tanggal"
                                                        stroke="#94a3b8"
                                                        fontSize={12}
                                                        tickLine={false}
                                                        axisLine={false}
                                                    />
                                                    <YAxis
                                                        stroke="#94a3b8"
                                                        fontSize={12}
                                                        tickLine={false}
                                                        axisLine={false}
                                                        domain={[0, 100]}
                                                    />
                                                    <Tooltip
                                                        content={<CustomTooltip />}
                                                        cursor={{
                                                            stroke: '#475569',
                                                            strokeWidth: 1,
                                                            strokeDasharray: '4 4',
                                                        }}
                                                    />
                                                    <Line
                                                        type="monotone"
                                                        dataKey="akurasi_prediksi"
                                                        name="Akurasi (%)"
                                                        stroke="#8b5cf6"
                                                        strokeWidth={3}
                                                        dot={{
                                                            r: 4,
                                                            fill: '#8b5cf6',
                                                            strokeWidth: 0,
                                                        }}
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="h-full flex items-center justify-center text-slate-500">
                                                Belum ada data evaluasi.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* History Table */}
                        <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-800 shadow-lg overflow-hidden">
                            <div className="p-4 border-b border-slate-800">
                                <h3 className="text-lg font-semibold text-white">Log Prediksi</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-900/95 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                                            <th className="px-4 py-3 font-medium">Tgl Prediksi</th>
                                            <th className="px-4 py-3 font-medium">Target Tgl</th>
                                            <th className="px-4 py-3 font-medium">Model</th>
                                            <th className="px-4 py-3 font-medium">
                                                Prediksi (Prob)
                                            </th>
                                            <th className="px-4 py-3 font-medium">Aktual</th>
                                            <th className="px-4 py-3 font-medium">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {evalLogs.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan="6"
                                                    className="px-4 py-8 text-center text-slate-500"
                                                >
                                                    Belum ada histori prediksi. Lakukan prediksi di
                                                    tab Prediksi.
                                                </td>
                                            </tr>
                                        ) : (
                                            evalLogs.map((log) => (
                                                <tr
                                                    key={log.id}
                                                    className="border-b border-slate-800/50 hover:bg-slate-800/30"
                                                >
                                                    <td className="px-4 py-3 text-slate-400">
                                                        {log.tanggal_prediksi}
                                                    </td>
                                                    <td className="px-4 py-3 font-medium text-slate-200">
                                                        {log.tanggal_target}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-400 text-xs">
                                                        {log.model}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span
                                                            className={
                                                                log.prediksi_mati
                                                                    ? 'text-red-400'
                                                                    : 'text-green-400'
                                                            }
                                                        >
                                                            {log.prediksi_mati ? 'Mati' : 'Aman'} (
                                                            {log.probabilitas}%)
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {log.aktual_mati === null ? (
                                                            '-'
                                                        ) : (
                                                            <span
                                                                className={
                                                                    log.aktual_mati
                                                                        ? 'text-red-400'
                                                                        : 'text-green-400'
                                                                }
                                                            >
                                                                {log.aktual_mati ? 'Mati' : 'Aman'}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span
                                                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                                                log.status === 'Selesai' &&
                                                                log.prediksi_benar
                                                                    ? 'bg-green-500/10 text-green-400'
                                                                    : log.status === 'Selesai' &&
                                                                        !log.prediksi_benar
                                                                      ? 'bg-red-500/10 text-red-400'
                                                                      : log.status ===
                                                                          'Belum Dievaluasi'
                                                                        ? 'bg-yellow-500/10 text-yellow-400'
                                                                        : 'bg-slate-700/50 text-slate-400'
                                                            }`}
                                                        >
                                                            {log.status === 'Selesai'
                                                                ? log.prediksi_benar
                                                                    ? 'Benar ✅'
                                                                    : 'Salah ❌'
                                                                : log.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #334155;
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #475569;
                }
            `}</style>
        </div>
    );
}

export default App;
