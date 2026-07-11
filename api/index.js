/* eslint-disable no-undef */
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import mysql from 'mysql2/promise';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url'; // <--- Tambahkan ini

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
// KONFIGURASI DATABASE (DINAMIS: VERCEL vs LOCALHOST)
// ============================================================
// Mengecek apakah aplikasi sedang berjalan di Vercel/Production
const isProduction = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';

let supabase;
let pool;

if (isProduction) {
  // Mode Server (Vercel) -> Gunakan Supabase
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('Mode Production (Vercel) -> Menggunakan Supabase');
} else {
  // Mode Localhost -> Gunakan MySQL XAMPP
  pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'db_customer_segmentation',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  
  pool.getConnection()
    .then(conn => {
      console.log('Mode Localhost -> Berhasil terkoneksi ke database MySQL XAMPP!');
      conn.release();
    })
    .catch(err => {
      console.error('Gagal terkoneksi ke database MySQL:', err.message);
    });
}

// ============================================================
// CRUD API
// ============================================================

app.get('/api/customers', async (req, res) => {
  try {
    if (isProduction) {
      const { data, error } = await supabase.from('customers').select('*').order('ID', { ascending: false }).limit(2500);
      if (error) throw error;
      res.json(data);
    } else {
      const [data] = await pool.query('SELECT * FROM customers ORDER BY ID DESC LIMIT 2500');
      res.json(data);
    }
  } catch (error) {
    res.status(500).json({ error: error.message || error });
  }
});

app.post('/api/customers', async (req, res) => {
  const {
    age, education, marital_status, income, spending, seniority,
    has_child, children, wines, fruits, meat, fish, sweets, gold,
  } = req.body;

  const newId = Math.floor(Math.random() * 90000) + 10000;

  try {
    if (isProduction) {
      const { error } = await supabase.from('customers').insert([{
        ID: newId, Age: age, Education: education, Marital_Status: marital_status,
        Income: income, Spending: spending, Seniority: seniority, Has_child: has_child,
        Children: children, Wines: wines, Fruits: fruits, Meat: meat, Fish: fish,
        Sweets: sweets, Gold: gold,
      }]);
      if (error) throw error;
    } else {
      const query = `
        INSERT INTO customers 
        (ID, Age, Education, Marital_Status, Income, Spending, Seniority, Has_child, Children, Wines, Fruits, Meat, Fish, Sweets, Gold) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const values = [newId, age, education, marital_status, income, spending, seniority, has_child, children, wines, fruits, meat, fish, sweets, gold];
      await pool.execute(query, values);
    }
    res.json({ message: 'Data berhasil ditambahkan' });
  } catch (error) {
    res.status(500).json({ error: error.message || error });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  const {
    age, education, marital_status, income, spending, seniority,
    has_child, children, wines, fruits, meat, fish, sweets, gold,
  } = req.body;

  try {
    if (isProduction) {
      const { error } = await supabase.from('customers').update({
        Age: age, Education: education, Marital_Status: marital_status, Income: income,
        Spending: spending, Seniority: seniority, Has_child: has_child, Children: children,
        Wines: wines, Fruits: fruits, Meat: meat, Fish: fish, Sweets: sweets, Gold: gold,
      }).eq('ID', req.params.id);
      if (error) throw error;
    } else {
      const query = `
        UPDATE customers SET 
        Age = ?, Education = ?, Marital_Status = ?, Income = ?, Spending = ?, Seniority = ?, 
        Has_child = ?, Children = ?, Wines = ?, Fruits = ?, Meat = ?, Fish = ?, Sweets = ?, Gold = ? 
        WHERE ID = ?
      `;
      const values = [age, education, marital_status, income, spending, seniority, has_child, children, wines, fruits, meat, fish, sweets, gold, req.params.id];
      await pool.execute(query, values);
    }
    res.json({ message: 'Data diupdate!' });
  } catch (error) {
    res.status(500).json({ error: error.message || error });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  try {
    if (isProduction) {
      const { error } = await supabase.from('customers').delete().eq('ID', req.params.id);
      if (error) throw error;
    } else {
      await pool.execute('DELETE FROM customers WHERE ID = ?', [req.params.id]);
    }
    res.json({ message: 'Data dihapus!' });
  } catch (error) {
    res.status(500).json({ error: error.message || error });
  }
});

// ============================================================
// SEED API
// ============================================================
app.post('/api/seed', async (req, res) => {
  try {const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const csvPath = path.join(__dirname, '../marketing_campaign.csv');
    const raw = fs.readFileSync(csvPath, 'utf-8');

    const rows = parse(raw, { columns: true, delimiter: '\t', skip_empty_lines: true });

    const { cleaned, before, after } = cleanRawData(rows);
    const features = buildFeatures(cleaned);

    let inserted = 0;

    if (isProduction) {
      const records = features.map((f, idx) => ({ ID: cleaned[idx].ID, ...f }));
      const BATCH_SIZE = 500;
      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('customers').upsert(batch, { onConflict: 'ID' });
        if (error) throw error;
        inserted += batch.length;
      }
    } else {
      const records = features.map((f, idx) => [
        cleaned[idx].ID, f.age, f.education, f.marital_status, f.income, f.spending, 
        f.seniority, f.has_child, f.children, f.wines, f.fruits, f.meat, f.fish, f.sweets, f.gold
      ]);
      const query = `
        INSERT IGNORE INTO customers 
        (ID, Age, Education, Marital_Status, Income, Spending, Seniority, Has_child, Children, Wines, Fruits, Meat, Fish, Sweets, Gold) 
        VALUES ?
      `;
      const [result] = await pool.query(query, [records]);
      inserted = result.affectedRows;
    }

    res.json({ message: 'Seed selesai', sebelum_cleaning: before, setelah_cleaning: after, jumlah_disimpan: inserted });
  } catch (err) {
    console.error('Seed error:', err);
    res.status(500).json({ message: err.message || err });
  }
});

// ============================================================
// K-MEANS API
// ============================================================
app.post('/api/run-kmeans', async (req, res) => {
  try {
    let data;
    if (isProduction) {
      const { data: supabaseData, error } = await supabase.from('customers').select('*').limit(2500);
      if (error) throw error;
      data = supabaseData;
    } else {
      const [mysqlData] = await pool.query('SELECT * FROM customers ORDER BY ID DESC LIMIT 2500');
      data = mysqlData;
    }

    if (!data || data.length < 8) {
      return res.status(400).json({ message: 'Minimal 8 data (dibutuhkan untuk uji K hingga 8)' });
    }

    const { scaled: X } = standardScale(data, CLUSTER_FEATURES);
    const { bestK, chartData } = findBestK(X);
    const { labels, silhouetteScore: silScore } = runFinalKMeans(X, bestK);
    const insights = generateBusinessInsights(data, labels, bestK, silScore);

    if (isProduction) {
      const updates = data.map((row, idx) => ({ ID: row.ID, cluster: labels[idx] }));
      const BATCH_SIZE = 500;
      for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = updates.slice(i, i + BATCH_SIZE);
        const { error: upsertError } = await supabase.from('customers').upsert(batch, { onConflict: 'ID' });
        if (upsertError) throw upsertError;
      }
    } else {
      let updateQuery = 'UPDATE customers SET cluster = CASE ID ';
      const updateIds = [];
      data.forEach((row, idx) => {
        updateQuery += `WHEN ${pool.escape(row.ID)} THEN ${pool.escape(labels[idx])} `;
        updateIds.push(row.ID);
      });
      updateQuery += `END WHERE ID IN (${updateIds.map(id => pool.escape(id)).join(',')})`;
      await pool.query(updateQuery);
    }

    res.json({
      message: 'KMeans selesai',
      total: data.length,
      best_k: bestK,
      chart_data: chartData,
      insights,
    });
  } catch (err) {
    console.error('KMeans error:', err);
    res.status(500).json({ message: err.message || err });
  }
});

app.post('/api/reset-cluster', async (req, res) => {
  try {
    if (isProduction) {
      const { error } = await supabase.from('customers').update({ cluster: null }).not('ID', 'is', null);
      if (error) throw error;
    } else {
      await pool.execute('UPDATE customers SET cluster = NULL');
    }
    res.json({ message: 'reset' });
  } catch (error) {
    res.status(500).json({ error: error.message || error });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server API berjalan di port ${PORT}`);
});

export default app;