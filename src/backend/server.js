const express = ('express');
const mysql = ('mysql2');
const cors = ('cors');
const kmeans = ('node-kmeans');

const app = express();
app.use(cors());
app.use(express.json());

// Konfigurasi koneksi MySQL Lokal
const db = mysql.createPool({
    host: 'localhost',
    user: 'root', // Sesuaikan jika ada password (biasanya kosong di XAMPP)
    password: '',
    database: 'portofolio_kmeans'
});

// ================= CRUD API =================

// READ: Ambil semua data
app.get('/api/customers', (req, res) => {
    db.query('SELECT * FROM customers ORDER BY id DESC', (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// CREATE: Tambah pelanggan
app.post('/api/customers', (req, res) => {
    const { name, income, recency, mnt_wines, mnt_meat } = req.body;
    const query = 'INSERT INTO customers (name, income, recency, mnt_wines, mnt_meat) VALUES (?, ?, ?, ?, ?)';
    db.query(query, [name, income, recency, mnt_wines, mnt_meat], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Data berhasil ditambahkan', id: result.insertId });
    });
});

// UPDATE: Edit pelanggan
app.put('/api/customers/:id', (req, res) => {
    const { name, income, recency, mnt_wines, mnt_meat } = req.body;
    const query = 'UPDATE customers SET name=?, income=?, recency=?, mnt_wines=?, mnt_meat=? WHERE id=?';
    db.query(query, [name, income, recency, mnt_wines, mnt_meat, req.params.id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Data diupdate!' });
    });
});

// DELETE: Hapus pelanggan
app.delete('/api/customers/:id', (req, res) => {
    db.query('DELETE FROM customers WHERE id=?', [req.params.id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Data dihapus!' });
    });
});

// ================= K-MEANS ALGORITHM =================

app.post('/api/run-kmeans', (req, res) => {
    db.query('SELECT * FROM customers', (err, data) => {
        if (err) return res.status(500).json(err);
        if (data.length < 3) return res.status(400).json({ message: 'Minimal butuh 3 data untuk K-Means' });

        // Siapkan array data untuk K-Means (hanya angka)
        let vectors = data.map(item => [item.income, item.recency, item.mnt_wines, item.mnt_meat]);

        // Jalankan K-Means dengan jumlah klaster = 3
        kmeans.clusterize(vectors, { k: 3 }, (err, result) => {
            if (err) return res.status(500).json(err);

            // Update database dengan hasil klaster
            let updatePromises = [];
            result.forEach((clusterObj, clusterIndex) => {
                clusterObj.clusterInd.forEach(dataIndex => {
                    const customerId = data[dataIndex].id;
                    const updateQuery = new Promise((resolve, reject) => {
                        db.query('UPDATE customers SET cluster = ? WHERE id = ?', [clusterIndex, customerId], (err) => {
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