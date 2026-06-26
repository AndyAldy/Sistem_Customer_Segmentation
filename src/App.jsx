/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/set-state-in-effect */
// eslint-disable-next-line no-unused-vars
import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from 'axios';
import {
  Play, Plus, Edit3, Trash2, Disc, User, Activity, Filter, ChevronDown, Loader2, Sparkles,
} from 'lucide-react';

const API_URL = '/api';

const EMPTY_FORM = {
  age: '', education: 'Postgraduate', marital_status: 'In couple', income: '', spending: '',
  seniority: '', has_child: 'No child', children: 'No child', wines: '', fruits: '', meat: '',
  fish: '', sweets: '', gold: '',
};

export default function App() {
  const [customers, setCustomers] = useState([]);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  const [selectedCluster, setSelectedCluster] = useState('all');
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  // Hasil terakhir dari /api/run-kmeans: { best_k, chart_data, insights }
  const [result, setResult] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`${API_URL}/customers`);
      setCustomers(res.data);
    } catch (err) {
      console.error('Gagal mengambil data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData(); }, [fetchData]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (isEditing) {
      await axiosInstance.put(`${API_URL}/customers/${editId}`, formData);
    } else {
      await axiosInstance.post(`${API_URL}/customers`, formData);
    }
    setFormData(EMPTY_FORM);
    setIsEditing(false);
    setEditId(null);
    fetchData();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Yakin ingin menghapus data pelanggan ini?')) {
      await axiosInstance.delete(`${API_URL}/customers/${id}`);
      fetchData();
    }
  };

  const handleEdit = (cust) => {
    setFormData({
      age: cust.Age, education: cust.Education, marital_status: cust.Marital_Status,
      income: cust.Income, spending: cust.Spending, seniority: cust.Seniority,
      has_child: cust.Has_child, children: cust.Children, wines: cust.Wines,
      fruits: cust.Fruits, meat: cust.Meat, fish: cust.Fish, sweets: cust.Sweets, gold: cust.Gold,
    });
    setIsEditing(true);
    setEditId(cust.ID);
  };

  // Mengisi database dari marketing_campaign.csv (raw dataset) — feature
  // engineering dilakukan di backend (api/features.js), setara Cell 2-4 notebook.
  const handleSeed = async () => {
    try {
      setSeeding(true);
      const res = await axiosInstance.post(`${API_URL}/seed`);
      alert(`Seed berhasil: ${res.data.jumlah_disimpan} baris disimpan (${res.data.sebelum_cleaning} → ${res.data.setelah_cleaning} setelah cleaning).`);
      await fetchData();
    } catch (err) {
      alert(`Gagal seed data: ${err.response?.data?.message || err.message}`);
    } finally {
      setSeeding(false);
    }
  };

  const runKMeans = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.post(`${API_URL}/run-kmeans`);
      setResult(res.data);
      await fetchData();
      alert(`Berhasil! K optimal = ${res.data.best_k}. Data pelanggan telah disegmentasi.`);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message;
      alert(`Gagal menjalankan K-Means. Alasan: ${errorMessage}`);
      console.error('K-Means Error:', err.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

  const getClusterBadge = (clusterId) => {
    const palette = [
      'text-fuchsia-300 bg-fuchsia-500/20 border-fuchsia-500/30',
      'text-cyan-300 bg-cyan-500/20 border-cyan-500/30',
      'text-emerald-300 bg-emerald-500/20 border-emerald-500/30',
      'text-amber-300 bg-amber-500/20 border-amber-500/30',
      'text-violet-300 bg-violet-500/20 border-violet-500/30',
      'text-rose-300 bg-rose-500/20 border-rose-500/30',
    ];
    return palette[clusterId % palette.length];
  };

  const displayedCustomers = customers.filter((cust) => {
    if (selectedCluster === 'all') return true;
    return String(cust.cluster) === String(selectedCluster);
  });

  const availableClusters = result
    ? Array.from({ length: result.best_k }, (_, i) => i)
    : [...new Set(customers.map((c) => c.cluster).filter((c) => c !== null && c !== undefined))];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-fuchsia-500/30 text-left">

      {/* HEADER HERO */}
      <div className="relative h-[350px] w-full flex items-end pb-12 px-6 md:px-16 overflow-hidden bg-gradient-to-b from-[#1c102c] to-[#0a0a0a]">
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-fuchsia-600/30 blur-[150px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-cyan-600/20 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8 w-full max-w-7xl mx-auto">
          <div className="w-32 h-32 md:w-48 md:h-48 rounded-2xl bg-gradient-to-br from-fuchsia-500 via-purple-600 to-cyan-500 shadow-2xl shadow-fuchsia-500/30 flex items-center justify-center flex-shrink-0">
            <Activity size={72} className="text-white drop-shadow-md" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <p className="text-xs md:text-sm font-bold tracking-[0.2em] text-fuchsia-400 mb-2 uppercase">Sistem Rekomendasi</p>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">
              Segmentasi Pelanggan
            </h1>
            <p className="text-zinc-400 text-sm md:text-base max-w-2xl font-light leading-relaxed">
              K-Means Clustering dengan pemilihan K otomatis (Elbow + Silhouette Score) berdasarkan Age, Income, Spending, Seniority, dan rincian kategori belanja.
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-16 pb-24 pt-4 max-w-7xl mx-auto">

        <div className="flex flex-wrap items-center gap-5 py-6 mb-4">
          <button
            onClick={runKMeans}
            className="w-16 h-16 cursor-pointer hover:cursor-pointer active:cursor-grabbing bg-fuchsia-500 hover:bg-fuchsia-400 hover:scale-105 active:scale-95 transition-all rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(217,70,239,0.4)] text-black"
            title="Jalankan Algoritma K-Means"
          >
            <Play size={32} className="ml-1" fill="currentColor" />
          </button>
          <div>
            <h3 className="text-xl font-bold text-white">Jalankan Analisis</h3>
            <p className="text-sm text-zinc-500 font-medium">K optimal dicari otomatis (Elbow Method)</p>
          </div>

          <button
            onClick={handleSeed}
            disabled={seeding}
            className="ml-auto cursor-pointer flex items-center gap-2 bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/50 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-md disabled:opacity-50"
            title="Muat ulang dataset dari marketing_campaign.csv"
          >
            {seeding ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="text-fuchsia-400" />}
            {seeding ? 'Memuat dataset...' : 'Seed dari CSV'}
          </button>
        </div>

        {/* PANEL HASIL ANALISIS (Elbow, Silhouette, Insight Bisnis) */}
        {result && (
          <div className="mb-8 bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-zinc-100">
              <Sparkles className="text-fuchsia-400" size={20} /> Hasil Analisis K-Means
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Stat label="K Optimal (Elbow)" value={result.best_k} />
              <Stat label="K Terbaik (Silhouette)" value={result.chart_data.silhouette_k} />
              <Stat label="Silhouette Score" value={result.insights.silhouette_score.toFixed(3)} />
              <Stat label="Total Pelanggan" value={result.total} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(result.insights.clusters).map(([name, c]) => (
                <div key={name} className={`rounded-xl border p-4 ${getClusterBadge(Number(name.split(' ')[1]))}`}>
                  <p className="font-bold text-sm mb-1">{name} — {c.jumlah_pelanggan.toLocaleString()} pelanggan ({c.persen}%)</p>
                  <p className="text-xs opacity-80 mb-2">
                    Income {c.income_level} (${c.rata_income.toLocaleString()}) · Spending {c.spending_level} (${c.rata_spending.toLocaleString()}) · {c.seniority_level} ({c.rata_seniority} bln) · usia {c.rata_age}
                  </p>
                  <p className="text-xs font-medium">{c.strategi}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* TABEL DATA */}
          <div className="lg:col-span-8 bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-6 shadow-2xl">

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-zinc-800/80 pb-4">
              <h2 className="text-lg font-bold flex items-center gap-2 text-zinc-100">
                <Disc className="text-cyan-400" size={20} /> Dataset Pelanggan
              </h2>

              <div className="relative group z-30">
                <button className="flex items-center gap-2 cursor-pointer hover:cursor-grab active:cursor-grabbing bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/50 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-md">
                  <Filter size={16} className="text-zinc-400" />
                  {selectedCluster === 'all' ? 'Semua Segmentasi' : `Cluster ${selectedCluster}`}
                  <ChevronDown size={16} className="text-zinc-500 group-hover:rotate-180 transition-transform duration-300 ml-1" />
                </button>

                <div className="absolute right-0 top-full mt-2 w-60 bg-[#1a1a1a] border border-zinc-800/80 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 translate-y-2 transition-all duration-300 overflow-hidden backdrop-blur-xl">
                  <div className="p-1.5 flex flex-col gap-1">
                    <button onClick={() => setSelectedCluster('all')} className={`text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-3 cursor-pointer ${selectedCluster === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}>
                      Semua Segmentasi
                    </button>
                    {availableClusters.map((id) => (
                      <button key={id} onClick={() => setSelectedCluster(String(id))} className={`text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-3 cursor-pointer ${String(selectedCluster) === String(id) ? getClusterBadge(id) : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}>
                        Cluster {id}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-left text-sm whitespace-nowrap relative">
                <thead className="text-zinc-500 border-b border-zinc-800/80 uppercase tracking-wider text-xs sticky top-0 bg-[#161616] z-10">
                  <tr>
                    <th className="pb-4 px-2 font-medium">#</th>
                    <th className="pb-4 px-2 font-medium">Pelanggan</th>
                    <th className="pb-4 px-2 font-medium">Profil</th>
                    <th className="pb-4 px-2 font-medium">Income & Spending</th>
                    <th className="pb-4 px-2 font-medium">Rincian Belanja</th>
                    <th className="pb-4 px-2 font-medium">Cluster</th>
                    <th className="pb-4 px-2 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center text-zinc-500">
                          <Loader2 className="w-8 h-8 animate-spin text-fuchsia-500 mb-3" />
                          <p>Sedang menghubungkan ke database...</p>
                        </div>
                      </td>
                    </tr>
                  ) : displayedCustomers.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-zinc-500 italic">
                        Tidak ada data. Klik &quot;Seed dari CSV&quot; untuk memuat dataset.
                      </td>
                    </tr>
                  ) : (
                    displayedCustomers.map((cust, index) => (
                      <tr key={cust.ID} className="hover:bg-zinc-800/40 transition-colors group">
                        <td className="py-4 px-2 text-zinc-500 font-mono text-xs">{index + 1}</td>
                        <td className="py-4 px-2 font-semibold text-zinc-200 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
                            <User size={16} className="text-zinc-400" />
                          </div>
                          ID #{cust.ID}
                        </td>
                        <td className="py-4 px-2 text-zinc-400 text-xs">
                          {cust.Age} thn · {cust.Education} <br />
                          {cust.Marital_Status} · {cust.Children}
                        </td>
                        <td className="py-4 px-2 text-zinc-400">
                          <span className="text-zinc-100 font-medium">${cust.Income || 0}</span> <span className="text-zinc-600 mx-1">/</span> ${cust.Spending || 0}
                        </td>
                        <td className="py-4 px-2 text-zinc-400 text-xs">
                          🍷{cust.Wines || 0} 🍎{cust.Fruits || 0} 🥩{cust.Meat || 0} 🐟{cust.Fish || 0} 🍬{cust.Sweets || 0} 🥇{cust.Gold || 0}
                        </td>
                        <td className="py-4 px-2">
                          {cust.cluster !== null && cust.cluster !== undefined ? (
                            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${getClusterBadge(cust.cluster)}`}>
                              Cluster {cust.cluster}
                            </span>
                          ) : (
                            <span className="text-zinc-600 text-xs italic bg-zinc-800 px-3 py-1 rounded-full">Belum Diolah</span>
                          )}
                        </td>
                        <td className="py-4 px-2 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEdit(cust)} className="p-2 cursor-pointer text-zinc-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors">
                            <Edit3 size={18} />
                          </button>
                          <button onClick={() => handleDelete(cust.ID)} className="p-2 cursor-pointer text-zinc-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors">
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* FORM PANEL */}
          <div className="lg:col-span-4 sticky top-6">
            <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-800/80 p-6 shadow-2xl">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2 border-b border-zinc-800/80 pb-4 text-zinc-100">
                <Plus className="text-fuchsia-400" size={20} /> {isEditing ? 'Edit Data Pelanggan' : 'Tambah Baru'}
              </h2>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Usia" name="age" value={formData.age} onChange={handleChange} type="number" />
                  <SelectField label="Pendidikan" name="education" value={formData.education} onChange={handleChange}
                    options={['Undergraduate', 'Postgraduate']} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <SelectField label="Status" name="marital_status" value={formData.marital_status} onChange={handleChange}
                    options={['Alone', 'In couple']} />
                  <SelectField label="Anak" name="children" value={formData.children} onChange={handleChange}
                    options={['No child', '1 child', '2 children', '3 children']} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Income ($)" name="income" value={formData.income} onChange={handleChange} type="number" />
                  <Field label="Spending ($)" name="spending" value={formData.spending} onChange={handleChange} type="number" />
                </div>
                <Field label="Seniority (bulan)" name="seniority" value={formData.seniority} onChange={handleChange} type="number" />
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Wine" name="wines" value={formData.wines} onChange={handleChange} type="number" small />
                  <Field label="Fruit" name="fruits" value={formData.fruits} onChange={handleChange} type="number" small />
                  <Field label="Meat" name="meat" value={formData.meat} onChange={handleChange} type="number" small />
                  <Field label="Fish" name="fish" value={formData.fish} onChange={handleChange} type="number" small />
                  <Field label="Sweets" name="sweets" value={formData.sweets} onChange={handleChange} type="number" small />
                  <Field label="Gold" name="gold" value={formData.gold} onChange={handleChange} type="number" small />
                </div>
                <div className="pt-2">
                  <button type="submit" className="w-full cursor-pointer bg-white text-black hover:bg-zinc-200 px-4 py-3.5 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-lg">
                    {isEditing ? 'Simpan Perubahan' : 'Tambahkan ke Database'}
                  </button>
                  {isEditing && (
                    <button type="button" onClick={() => { setIsEditing(false); setFormData(EMPTY_FORM); }}
                      className="w-full cursor-pointer bg-transparent border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 px-4 py-3 rounded-xl font-semibold transition-all mt-3">
                      Batal
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-4">
      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function Field({ label, name, value, onChange, type = 'text', small = false }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">{label}</label>
      <input type={type} name={name} value={value} onChange={onChange} required
        className={`w-full bg-zinc-950/50 border border-zinc-800 rounded-xl ${small ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'} text-white focus:outline-none focus:border-fuchsia-500 transition-all`} />
    </div>
  );
}

function SelectField({ label, name, value, onChange, options }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">{label}</label>
      <select name={name} value={value} onChange={onChange}
        className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-fuchsia-500 transition-all">
        {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}
