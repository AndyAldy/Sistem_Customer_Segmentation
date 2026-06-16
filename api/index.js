/* eslint-disable no-undef */
require('dotenv').config(); // Load environment variables dari .env
const express = require('express');
const cors = require('cors');
const kmeans = require('node-kmeans');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// Konfigurasi koneksi Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ================= CRUD API =================

// READ: Ambil semua data (Dibatasi 500 agar browser tidak berat)
app.get('/api/customers', async (req, res) => {
    const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('ID', { ascending: false })
        .limit(500);

    if (error) return res.status(500).json(error);
    res.json(data);
});

// CREATE: Tambah pelanggan
app.post('/api/customers', async (req, res) => {
    const { income, recency, mnt_wines, mnt_meat } = req.body;
    const newId = Math.floor(Math.random() * 90000) + 10000; // Generate ID acak untuk data baru
    
    const { error } = await supabase
        .from('customers')
        .insert([{ 
            ID: newId, 
            Income: income, 
            Recency: recency, 
            MntWines: mnt_wines, 
            MntMeatProducts: mnt_meat 
        }]);

    if (error) return res.status(500).json(error);
    res.json({ message: 'Data berhasil ditambahkan' });
});

// UPDATE: Edit pelanggan
app.put('/api/customers/:id', async (req, res) => {
    const { income, recency, mnt_wines, mnt_meat } = req.body;
    
    const { error } = await supabase
        .from('customers')
        .update({ 
            Income: income, 
            Recency: recency, 
            MntWines: mnt_wines, 
            MntMeatProducts: mnt_meat 
        })
        .eq('ID', req.params.id);

    if (error) return res.status(500).json(error);
    res.json({ message: 'Data diupdate!' });
});

// DELETE: Hapus pelanggan
app.delete('/api/customers/:id', async (req, res) => {
    const { error } = await supabase
        .from('customers')
        .delete()
        .eq('ID', req.params.id);

    if (error) return res.status(500).json(error);
    res.json({ message: 'Data dihapus!' });
});

// ================= K-MEANS ALGORITHM =================

app.post('/api/run-kmeans', async (req, res) => {
    // Ambil semua data untuk diproses
    const { data, error } = await supabase
        .from('customers')
        .select('*');

    if (error) return res.status(500).json(error);
    if (!data || data.length < 3) return res.status(400).json({ message: 'Minimal butuh 3 data untuk K-Means' });

    // Siapkan array data K-Means menggunakan huruf BESAR (sesuai nama kolom CSV/Database)
    let vectors = data.map(item => [
        parseFloat(item.Income) || 0,
        parseFloat(item.Recency) || 0,
        parseFloat(item.MntWines) || 0,
        parseFloat(item.MntMeatProducts) || 0
    ]);

    kmeans.clusterize(vectors, { k: 3 }, async (err, result) => {
        if (err) return res.status(500).json(err);

        let updatePromises = [];
        
        result.forEach((clusterObj, clusterIndex) => {
            clusterObj.clusterInd.forEach(dataIndex => {
                const customerId = data[dataIndex].ID; 
                
                // Masukkan query update Supabase ke dalam array Promise
                const updateQuery = supabase
                    .from('customers')
                    .update({ cluster: clusterIndex })
                    .eq('ID', customerId);
                    
                updatePromises.push(updateQuery);
            });
        });

        // Jalankan semua query update secara bersamaan (parallel)
        try {
            const results = await Promise.all(updatePromises);
            
            // Cek jika ada error di salah satu promise
            const errors = results.filter(res => res.error);
            if (errors.length > 0) throw errors[0].error;

            res.json({ message: 'Proses K-Means selesai! Segmentasi berhasil.' });
        } catch (updateError) {
            res.status(500).json({ message: 'Gagal mengupdate cluster', error: updateError });
        }
    });
});
module.exports = app;