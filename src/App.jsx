/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Play, Plus, Edit3, Trash2, Disc, User, Activity } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

export default function App() {
  const [customers, setCustomers] = useState([]);
  const [formData, setFormData] = useState({ name: '', income: '', recency: '', mnt_wines: '', mnt_meat: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/customers`);
      setCustomers(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => { 
    fetchData(); 
  }, [fetchData]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (isEditing) {
      await axios.put(`${API_URL}/customers/${editId}`, formData);
    } else {
      await axios.post(`${API_URL}/customers`, formData);
    }
    setFormData({ name: '', income: '', recency: '', mnt_wines: '', mnt_meat: '' });
    setIsEditing(false);
    setEditId(null);
    fetchData();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Yakin ingin menghapus data pelanggan ini?')) {
      await axios.delete(`${API_URL}/customers/${id}`);
      fetchData();
    }
  };

  const handleEdit = (cust) => {
    setFormData({ name: cust.name, income: cust.income, recency: cust.recency, mnt_wines: cust.mnt_wines, mnt_meat: cust.mnt_meat });
    setIsEditing(true);
    setEditId(cust.id);
  };

  const runKMeans = async () => {
    try {
      await axios.post(`${API_URL}/run-kmeans`);
      fetchData();
      alert("Berhasil! Data pelanggan telah disegmentasi.");
    } catch {
      alert('Gagal menjalankan K-Means. Pastikan ada minimal 3 data pelanggan.');
    }
  };

  const getClusterBadge = (cluster) => {
    if (cluster === 0) return 'text-fuchsia-300 bg-fuchsia-500/20 border-fuchsia-500/30'; 
    if (cluster === 1) return 'text-cyan-300 bg-cyan-500/20 border-cyan-500/30'; 
    if (cluster === 2) return 'text-emerald-300 bg-emerald-500/20 border-emerald-500/30'; 
    return 'text-zinc-400 bg-zinc-800 border-zinc-700'; 
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-fuchsia-500/30 text-left">
      
      {/* HEADER HERO (Ala Banner Spotify) */}
      <div className="relative h-[350px] w-full flex items-end pb-12 px-6 md:px-16 overflow-hidden bg-gradient-to-b from-[#1c102c] to-[#0a0a0a]">
        {/* Glow Effects */}
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
        
        {/* ACTION BAR */}
        <div className="flex items-center gap-5 py-6 mb-4">
          <button 
            onClick={runKMeans}
            className="w-16 h-16 bg-fuchsia-500 hover:bg-fuchsia-400 hover:scale-105 active:scale-95 transition-all rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(217,70,239,0.4)] text-black"
            title="Jalankan Algoritma K-Means"
          >
            <Play size={32} className="ml-1" fill="currentColor" />
          </button>
          <div>
            <h3 className="text-xl font-bold text-white">Proses Data</h3>
            <p className="text-sm text-zinc-500 font-medium">Klik untuk menjalankan clustering</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* TRACKLIST (TABEL DATA) */}
          <div className="lg:col-span-8 bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2 border-b border-zinc-800/80 pb-4 text-zinc-100">
              <Disc className="text-cyan-400" size={20} /> Dataset Pelanggan
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="text-zinc-500 border-b border-zinc-800/80 uppercase tracking-wider text-xs">
                  <tr>
                    <th className="pb-4 px-2 font-medium">#</th>
                    <th className="pb-4 px-2 font-medium">Pelanggan</th>
                    <th className="pb-4 px-2 font-medium">Income & Recency</th>
                    <th className="pb-4 px-2 font-medium">Pengeluaran</th>
                    <th className="pb-4 px-2 font-medium">Segmentasi</th>
                    <th className="pb-4 px-2 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {customers.map((cust, index) => (
                    <tr key={cust.id} className="hover:bg-zinc-800/40 transition-colors group">
                      <td className="py-4 px-2 text-zinc-500 font-mono text-xs">{index + 1}</td>
                      <td className="py-4 px-2 font-semibold text-zinc-200 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
                          <User size={16} className="text-zinc-400" />
                        </div>
                        {cust.name}
                      </td>
                      <td className="py-4 px-2 text-zinc-400">
                        <span className="text-zinc-100 font-medium">${cust.income}</span> <span className="text-zinc-600 mx-1">/</span> {cust.recency} hari
                      </td>
                      <td className="py-4 px-2 text-zinc-400">
                         🍷 <span className="text-zinc-100">${cust.mnt_wines}</span> <span className="text-zinc-600 mx-1">|</span> 🥩 <span className="text-zinc-100">${cust.mnt_meat}</span>
                      </td>
                      <td className="py-4 px-2">
                        {cust.cluster !== null ? (
                          <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${getClusterBadge(cust.cluster)}`}>
                            Klaster {cust.cluster + 1}
                          </span>
                        ) : (
                          <span className="text-zinc-600 text-xs italic bg-zinc-800 px-3 py-1 rounded-full">Belum Diolah</span>
                        )}
                      </td>
                      <td className="py-4 px-2 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(cust)} className="p-2 text-zinc-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors">
                          <Edit3 size={18} />
                        </button>
                        <button onClick={() => handleDelete(cust.id)} className="p-2 text-zinc-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {customers.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-zinc-500">
                        Belum ada data pelanggan di database.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* FORM PANEL (Glassmorphism) */}
          <div className="lg:col-span-4 sticky top-6">
            <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-800/80 p-6 shadow-2xl">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2 border-b border-zinc-800/80 pb-4 text-zinc-100">
                <Plus className="text-fuchsia-400" size={20} /> {isEditing ? 'Edit Data Pelanggan' : 'Tambah Pelanggan'}
              </h2>
              <form onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Nama Lengkap</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} required
                    className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 transition-all placeholder:text-zinc-700" placeholder="Contoh: John Doe" />
                </div>
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
                  <button type="submit" className="w-full bg-white text-black hover:bg-zinc-200 px-4 py-3.5 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-lg">
                    {isEditing ? 'Simpan Perubahan' : 'Tambahkan Data'}
                  </button>
                  {isEditing && (
                    <button type="button" onClick={() => { setIsEditing(false); setFormData({ name: '', income: '', recency: '', mnt_wines: '', mnt_meat: '' }) }} 
                      className="w-full bg-transparent border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 px-4 py-3 rounded-xl font-semibold transition-all mt-3">
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