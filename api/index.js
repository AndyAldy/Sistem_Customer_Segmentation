/* eslint-disable no-undef */
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import kmeans from 'node-kmeans';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

app.get('/api/customers', async (req, res) => {

    const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('ID', { ascending: false })
        .limit(5000);

    if (error) {
        return res.status(500).json(error);
    }

    res.json(data);
});

app.post('/api/customers', async (req, res) => {
    const { income, recency, mnt_wines, mnt_meat } = req.body;
    const newId = Math.floor(Math.random() * 90000) + 10000; 
    const { error } = await supabase.from('customers').insert([{ ID: newId, Income: income, Recency: recency, MntWines: mnt_wines, MntMeatProducts: mnt_meat }]);
    if (error) return res.status(500).json(error);
    res.json({ message: 'Data berhasil ditambahkan' });
});

app.put('/api/customers/:id', async (req, res) => {
    const { income, recency, mnt_wines, mnt_meat } = req.body;
    const { error } = await supabase.from('customers').update({ Income: income, Recency: recency, MntWines: mnt_wines, MntMeatProducts: mnt_meat }).eq('ID', req.params.id);
    if (error) return res.status(500).json(error);
    res.json({ message: 'Data diupdate!' });
});

app.delete('/api/customers/:id', async (req, res) => {
    const { error } = await supabase.from('customers').delete().eq('ID', req.params.id);
    if (error) return res.status(500).json(error);
    res.json({ message: 'Data dihapus!' });
});

app.post('/api/run-kmeans', async (req, res) => {
    // Ambil data (Dibatasi 1000 agar tidak memberatkan memori algoritma)
    const { data, error } = await supabase
        .from('customers')
        .select('*')
        .limit(5000);

    if (error) return res.status(500).json(error);
    if (!data || data.length < 3) return res.status(400).json({ message: 'Minimal butuh 3 data untuk K-Means' });

    // Siapkan array data K-Means
    let vectors = data.map(item => [
        parseFloat(item.Income) || 0,
        parseFloat(item.Recency) || 0,
        parseFloat(item.MntWines) || 0,
        parseFloat(item.MntMeatProducts) || 0
    ]);

    kmeans.clusterize(vectors, { k: 3 }, async (err, result) => {
        if (err) return res.status(500).json(err);

        try {
            // Siapkan wadah kosong untuk menampung data yang sudah diolah
            let bulkUpdates = [];
            
            result.forEach((clusterObj, clusterIndex) => {
                clusterObj.clusterInd.forEach(dataIndex => {
                    // Salin data lama, lalu timpa bagian 'cluster'-nya saja
                    bulkUpdates.push({
                        ...data[dataIndex],
                        cluster: clusterIndex 
                    });
                });
            });

            // Lakukan UPSERT (Update massal) dalam SATU KALI kirim ke Supabase!
            const { error: upsertError } = await supabase
                .from('customers')
                .upsert(bulkUpdates);

            if (upsertError) throw upsertError;

            res.json({ message: 'Proses K-Means selesai! Segmentasi berhasil.' });
        } catch (updateError) {
            console.error("Error K-Means:", updateError);
            res.status(500).json({ message: 'Gagal mengupdate cluster', error: updateError });
        }
    });
});

// WAJIB ADA INI AGAR VERCEL BISA MENJALANKANNYA
export default app;