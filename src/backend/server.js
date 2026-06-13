/* eslint-disable no-undef */
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const kmeans = require('node-kmeans');

const app = express();
app.use(cors());
app.use(express.json());

// Konfigurasi koneksi MySQL Lokal
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'portofolio_kmeans'
});

// ================= CRUD API =================

// READ: Ambil semua data (Dibatasi 500 agar browser tidak berat)
app.get('/api/customers', (req, res) => {
    db.query('SELECT * FROM customers ORDER BY ID DESC LIMIT 500', (err, results) => { 
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// CREATE: Tambah pelanggan
app.post('/api/customers', (req, res) => {
    const { income, recency, mnt_wines, mnt_meat } = req.body;
    const newId = Math.floor(Math.random() * 90000) + 10000; // Generate ID acak untuk data baru
    const query = 'INSERT INTO customers (ID, Income, Recency, MntWines, MntMeatProducts) VALUES (?, ?, ?, ?, ?)';
    db.query(query, [newId, income, recency, mnt_wines, mnt_meat], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Data berhasil ditambahkan' });
    });
});

// UPDATE: Edit pelanggan
app.put('/api/customers/:id', (req, res) => {
    const { income, recency, mnt_wines, mnt_meat } = req.body;
    const query = 'UPDATE customers SET Income=?, Recency=?, MntWines=?, MntMeatProducts=? WHERE ID=?';
    db.query(query, [income, recency, mnt_wines, mnt_meat, req.params.id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Data diupdate!' });
    });
});

// DELETE: Hapus pelanggan
app.delete('/api/customers/:id', (req, res) => {
    db.query('DELETE FROM customers WHERE ID=?', [req.params.id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Data dihapus!' });
    });
});

// ================= K-MEANS ALGORITHM =================

app.post('/api/run-kmeans', (req, res) => {
    db.query('SELECT * FROM customers', (err, data) => {
        if (err) return res.status(500).json(err);
        if (data.length < 3) return res.status(400).json({ message: 'Minimal butuh 3 data untuk K-Means' });

        // Siapkan array data K-Means menggunakan huruf BESAR (sesuai nama kolom CSV/Database)
        let vectors = data.map(item => [
            parseFloat(item.Income) || 0,
            parseFloat(item.Recency) || 0,
            parseFloat(item.MntWines) || 0,
            parseFloat(item.MntMeatProducts) || 0
        ]);

        kmeans.clusterize(vectors, { k: 3 }, (err, result) => {
            if (err) return res.status(500).json(err);

            let updatePromises = [];
            result.forEach((clusterObj, clusterIndex) => {
                clusterObj.clusterInd.forEach(dataIndex => {
                    const customerId = data[dataIndex].ID; // Mengambil ID huruf besar
                    const updateQuery = new Promise((resolve, reject) => {
                        db.query('UPDATE customers SET cluster = ? WHERE ID = ?', [clusterIndex, customerId], (err) => {
                            if (err) reject(err); else resolve();
                        });
                    });
                    updatePromises.push(updateQuery);
                });
            });

            Promise.all(updatePromises)
                .then(() => res.json({ message: 'Proses K-Means selesai! Segmentasi berhasil.' }))
                .catch(error => res.status(500).json(error));
        });
    });
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Backend jalan di port ${PORT}`));