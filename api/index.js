/* eslint-disable no-undef */
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import mysql from 'mysql2/promise'; // Menggunakan versi promise untuk async/await

import { cleanRawData, buildFeatures } from './features.js';
import {
  CLUSTER_FEATURES,
  standardScale,
  findBestK,
  runFinalKMeans,
  generateBusinessInsights,
} from './clustering.js';

const app = express();
app.use(cors());
app.use(express.json());

// ============================================================
// KONFIGURASI KONEKSI DATABASE MYSQL XAMPP
// ============================================================
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '', // Password default XAMPP adalah kosong
  database: 'db_customer_segmentation', // Pastikan nama DB ini sesuai dengan yang Anda buat di phpMyAdmin
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Mengecek koneksi saat server berjalan
pool.getConnection()
  .then(conn => {
    console.log('Berhasil terkoneksi ke database MySQL XAMPP!');
    conn.release();
  })
  .catch(err => {
    console.error('Gagal terkoneksi ke database MySQL:', err.message);
  });

// ============================================================
// CRUD
// ============================================================

app.get('/api/customers', async (req, res) => {
  try {
    const [data] = await pool.query('SELECT * FROM customers ORDER BY ID DESC LIMIT 2500');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/customers', async (req, res) => {
  const {
    age, education, marital_status, income, spending, seniority,
    has_child, children, wines, fruits, meat, fish, sweets, gold,
  } = req.body;

  const newId = Math.floor(Math.random() * 90000) + 10000;

  try {
    const query = `
      INSERT INTO customers 
      (ID, Age, Education, Marital_Status, Income, Spending, Seniority, Has_child, Children, Wines, Fruits, Meat, Fish, Sweets, Gold) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [newId, age, education, marital_status, income, spending, seniority, has_child, children, wines, fruits, meat, fish, sweets, gold];
    
    await pool.execute(query, values);
    res.json({ message: 'Data berhasil ditambahkan' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  const {
    age, education, marital_status, income, spending, seniority,
    has_child, children, wines, fruits, meat, fish, sweets, gold,
  } = req.body;

  try {
    const query = `
      UPDATE customers SET 
      Age = ?, Education = ?, Marital_Status = ?, Income = ?, Spending = ?, Seniority = ?, 
      Has_child = ?, Children = ?, Wines = ?, Fruits = ?, Meat = ?, Fish = ?, Sweets = ?, Gold = ? 
      WHERE ID = ?
    `;
    const values = [age, education, marital_status, income, spending, seniority, has_child, children, wines, fruits, meat, fish, sweets, gold, req.params.id];
    
    await pool.execute(query, values);
    res.json({ message: 'Data diupdate!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM customers WHERE ID = ?', [req.params.id]);
    res.json({ message: 'Data dihapus!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// SEED
// ============================================================
app.post('/api/seed', async (req, res) => {
  try {
    const csvPath = path.join(process.cwd(), 'marketing_campaign.csv');
    const raw = fs.readFileSync(csvPath, 'utf-8');

    const rows = parse(raw, { columns: true, delimiter: '\t', skip_empty_lines: true });

    const { cleaned, before, after } = cleanRawData(rows);
    const features = buildFeatures(cleaned);

    const records = features.map((f, idx) => [
      cleaned[idx].ID, f.age, f.education, f.marital_status, f.income, f.spending, 
      f.seniority, f.has_child, f.children, f.wines, f.fruits, f.meat, f.fish, f.sweets, f.gold
    ]);

    // Menggunakan INSERT IGNORE agar tidak error jika ID sudah ada
    const query = `
      INSERT IGNORE INTO customers 
      (ID, Age, Education, Marital_Status, Income, Spending, Seniority, Has_child, Children, Wines, Fruits, Meat, Fish, Sweets, Gold) 
      VALUES ?
    `;
    
    const [result] = await pool.query(query, [records]);

    res.json({ message: 'Seed selesai', sebelum_cleaning: before, setelah_cleaning: after, jumlah_disimpan: result.affectedRows });
  } catch (err) {
    console.error('Seed error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ============================================================
// K-MEANS
// ============================================================
app.post('/api/run-kmeans', async (req, res) => {
  try {
    const [data] = await pool.query('SELECT * FROM customers ORDER BY ID DESC LIMIT 2500');

    if (!data || data.length < 8) {
      return res.status(400).json({ message: 'Minimal 8 data (dibutuhkan untuk uji K hingga 8)' });
    }

    const { scaled: X } = standardScale(data, CLUSTER_FEATURES);
    const { bestK, chartData } = findBestK(X);
    const { labels, silhouetteScore: silScore } = runFinalKMeans(X, bestK);
    const insights = generateBusinessInsights(data, labels, bestK, silScore);

    // Update label cluster ke database secara bulk menggunakan CASE
    let updateQuery = 'UPDATE customers SET cluster = CASE ID ';
    const updateIds = [];
    
    data.forEach((row, idx) => {
      updateQuery += `WHEN ${pool.escape(row.ID)} THEN ${pool.escape(labels[idx])} `;
      updateIds.push(row.ID);
    });
    
    updateQuery += `END WHERE ID IN (${updateIds.map(id => pool.escape(id)).join(',')})`;
    
    await pool.query(updateQuery);

    res.json({
      message: 'KMeans selesai',
      total: data.length,
      best_k: bestK,
      chart_data: chartData,
      insights,
    });
  } catch (err) {
    console.error('KMeans error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/reset-cluster', async (req, res) => {
  try {
    await pool.execute('UPDATE customers SET cluster = NULL');
    res.json({ message: 'reset' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Menambahkan listener untuk local development
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server API berjalan di http://localhost:${PORT}`);
});

export default app;