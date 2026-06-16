// eslint-disable-next-line no-unused-vars
import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from 'axios';
import { Play, Plus, Edit3, Trash2, Disc, User, Activity, Filter, ChevronDown, Loader2 } from 'lucide-react';

const API_URL = '/api';

export default function App() {
  const [customers, setCustomers] = useState([]);
  const [formData, setFormData] = useState({ income: '', recency: '', mnt_wines: '', mnt_meat: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  
  const [selectedCluster, setSelectedCluster] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`${API_URL}/customers`);
      setCustomers(res.data);
    } catch (err) {
      console.error("Gagal mengambil data:", err);
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
    setFormData({ income: '', recency: '', mnt_wines: '', mnt_meat: '' });
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
    setFormData({ income: cust.Income, recency: cust.Recency, mnt_wines: cust.MntWines, mnt_meat: cust.MntMeatProducts });
    setIsEditing(true);
    setEditId(cust.ID);
  };

  const runKMeans = async () => {
    try {
      await axiosInstance.post(`${API_URL}/run-kmeans`);
      fetchData();
      alert("Berhasil! Data pelanggan telah disegmentasi.");
    } catch (err) {
      const errorMessage = err.response?.data?.error?.message || err.response?.data?.message || err.message;
      alert(`Gagal menjalankan K-Means. Alasan: ${errorMessage}`);
      console.error('K-Means Error:', err.response?.data || err);
    }
  };

  // Menggunakan karakteristik pengeluaran untuk menentukan label yang konsisten
  const determineCategory = (cust) => {
    if (cust.cluster === null || cust.cluster === undefined) return 'belum-diolah';
    
    const totalPengeluaran = (parseFloat(cust.MntWines) || 0) + (parseFloat(cust.MntMeatProducts) || 0);
    
    // Anda bisa menyesuaikan angka batas (threshold) ini jika diperlukan
    if (totalPengeluaran > 1000) return 'prioritas';
    if (totalPengeluaran > 300) return 'reguler';
    return 'pasif';
  };

  const getClusterBadge = (cust) => {
    const category = determineCategory(cust);
    if (category === 'prioritas') return 'text-fuchsia-300 bg-fuchsia-500/20 border-fuchsia-500/30';
    if (category === 'reguler') return 'text-cyan-300 bg-cyan-500/20 border-cyan-500/30';
    if (category === 'pasif') return 'text-emerald-300 bg-emerald-500/20 border-emerald-500/30';
    return 'text-zinc-400 bg-zinc-800 border-zinc-700';
  };

  const getClusterName = (cust) => {
    const category = determineCategory(cust);
    if (category === 'prioritas') return '💎 Prioritas (High Value)';
    if (category === 'reguler') return '⭐ Reguler (Medium Value)';
    if (category === 'pasif') return '⚠️ Pasif (Low Value)';
    return 'Belum Diolah';
  };

const displayedCustomers = customers.filter(cust => {
    if (selectedCluster === 'all') return true;
    return determineCategory(cust) === selectedCluster;
  });

  const getFilterLabel = () => {
    if (selectedCluster === 'prioritas') return '💎 Prioritas';
    if (selectedCluster === 'reguler') return '⭐ Reguler';
    if (selectedCluster === 'pasif') return '⚠️ Pasif';
    return 'Semua Segmentasi';
  };

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
              Model Machine Learning menggunakan Algoritma K-Means Clustering untuk membedah perilaku pembelian berdasarkan pendapatan dan pengeluaran.
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-16 pb-24 pt-4 max-w-7xl mx-auto">

        <div className="flex items-center gap-5 py-6 mb-4">
          <button
            onClick={runKMeans}
            className="w-16 h-16 cursor-pointer hover:cursor-pointer active:cursor-grabbing bg-fuchsia-500 hover:bg-fuchsia-400 hover:scale-105 active:scale-95 transition-all rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(217,70,239,0.4)] text-black"
            title="Jalankan Algoritma K-Means"
          >
            <Play size={32} className="ml-1" fill="currentColor" />
          </button>
          <div>
            <h3 className="text-xl font-bold text-white">Proses Data</h3>
            <p className="text-sm text-zinc-500 font-medium">Klik untuk memproses dataset CSV</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* TABEL DATA */}
          <div className="lg:col-span-8 bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-6 shadow-2xl">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-zinc-800/80 pb-4">
              <h2 className="text-lg font-bold flex items-center gap-2 text-zinc-100">
                <Disc className="text-cyan-400" size={20} /> Dataset Pelanggan
              </h2>
              
              {/* DROPDOWN MENU */}
              <div className="relative group z-30">
                <button className="flex items-center gap-2 cursor-pointer hover:cursor-grab active:cursor-grabbing bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/50 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-md">
                  <Filter size={16} className="text-zinc-400" />
                  {getFilterLabel()}
                  <ChevronDown size={16} className="text-zinc-500 group-hover:rotate-180 transition-transform duration-300 ml-1" />
                </button>

                <div className="absolute right-0 top-full mt-2 w-60 bg-[#1a1a1a] border border-zinc-800/80 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 translate-y-2 transition-all duration-300 overflow-hidden backdrop-blur-xl">
                  <div className="p-1.5 flex flex-col gap-1">
                    <button onClick={() => setSelectedCluster('all')} className={`text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-3 cursor-pointer hover:cursor-pointer ${selectedCluster === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}>
                      <div className={`w-2 h-2 rounded-full ${selectedCluster === 'all' ? 'bg-white' : 'bg-transparent'}`}></div> 
                      Semua Segmentasi
                    </button>
                    <button onClick={() => setSelectedCluster('prioritas')} className={`text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-3 cursor-pointer hover:cursor-pointer ${selectedCluster === 'prioritas' ? 'bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20' : 'text-zinc-400 hover:bg-fuchsia-500/10 hover:text-fuchsia-400'}`}>
                      <div className="w-2 h-2 rounded-full bg-fuchsia-500 shadow-[0_0_8px_rgba(217,70,239,0.8)]"></div> 
                      💎 Prioritas (High Value)
                    </button>
                    <button onClick={() => setSelectedCluster('reguler')} className={`text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-3 cursor-pointer hover:cursor-pointer ${selectedCluster === 'reguler' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-zinc-400 hover:bg-cyan-500/10 hover:text-cyan-400'}`}>
                      <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div> 
                      ⭐ Reguler (Medium Value)
                    </button>
                    <button onClick={() => setSelectedCluster('pasif')} className={`text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-3 cursor-pointer hover:cursor-pointer ${selectedCluster === 'pasif' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-zinc-400 hover:bg-emerald-500/10 hover:text-emerald-400'}`}>
                      <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div> 
                      ⚠️ Pasif (Low Value)
                    </button>
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
                    <th className="pb-4 px-2 font-medium">Income & Recency</th>
                    <th className="pb-4 px-2 font-medium">Pengeluaran</th>
                    <th className="pb-4 px-2 font-medium">Segmentasi Spesifik</th>
                    <th className="pb-4 px-2 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center text-zinc-500">
                          <Loader2 className="w-8 h-8 animate-spin text-fuchsia-500 mb-3" />
                          <p>Sedang menghubungkan ke database...</p>
                        </div>
                      </td>
                    </tr>
                  ) : displayedCustomers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-zinc-500 italic">
                        Tidak ada data yang ditemukan.
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
                        <td className="py-4 px-2 text-zinc-400">
                          <span className="text-zinc-100 font-medium">${cust.Income || 0}</span> <span className="text-zinc-600 mx-1">/</span> {cust.Recency || 0} hari
                        </td>
                        <td className="py-4 px-2 text-zinc-400">
                           🍷 <span className="text-zinc-100">${cust.MntWines || 0}</span> <span className="text-zinc-600 mx-1">|</span> 🥩 <span className="text-zinc-100">${cust.MntMeatProducts || 0}</span>
                        </td>
                        <td className="py-4 px-2">
                          {/* Meneruskan 'cust' utuh ke fungsi getClusterBadge & getClusterName */}
                          {cust.cluster !== null ? (
                            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${getClusterBadge(cust)}`}>
                              {getClusterName(cust)}
                            </span>
                          ) : (
                            <span className="text-zinc-600 text-xs italic bg-zinc-800 px-3 py-1 rounded-full">Belum Diolah</span>
                          )}
                        </td>
                        <td className="py-4 px-2 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEdit(cust)} className="p-2 cursor-pointer hover:cursor-pointer active:cursor-grabbing text-zinc-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors">
                            <Edit3 size={18} />
                          </button>
                          <button onClick={() => handleDelete(cust.ID)} className="p-2 cursor-pointer hover:cursor-pointer active:cursor-grabbing text-zinc-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors">
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
              <form onSubmit={handleSave} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Pendapatan ($)</label>
                    <input type="number" name="income" value={formData.income} onChange={handleChange} required
                      className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-fuchsia-500 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Recency (Hari)</label>
                    <input type="number" name="recency" value={formData.recency} onChange={handleChange} required
                      className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-fuchsia-500 transition-all" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Wine ($)</label>
                    <input type="number" name="mnt_wines" value={formData.mnt_wines} onChange={handleChange} required
                      className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Daging ($)</label>
                    <input type="number" name="mnt_meat" value={formData.mnt_meat} onChange={handleChange} required
                      className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition-all" />
                  </div>
                </div>
                <div className="pt-2">
                  <button type="submit" className="w-full cursor-pointer hover:cursor-pointer active:cursor-grabbing bg-white text-black hover:bg-zinc-200 px-4 py-3.5 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-lg">
                    {isEditing ? 'Simpan Perubahan' : 'Tambahkan ke Database'}
                  </button>
                  {isEditing && (
                    <button type="button" onClick={() => { setIsEditing(false); setFormData({ income: '', recency: '', mnt_wines: '', mnt_meat: '' }) }}
                      className="w-full cursor-pointer hover:cursor-pointer bg-transparent border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 px-4 py-3 rounded-xl font-semibold transition-all mt-3">
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