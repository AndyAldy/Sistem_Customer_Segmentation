/* eslint-disable no-undef */
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';

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

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================
// CRUD — skema baru (lihat sql/schema.sql)
// Kolom: ID, Age, Education, Marital_Status, Income, Spending,
// Seniority, Has_child, Children, Wines, Fruits, Meat, Fish,
// Sweets, Gold, cluster
// ============================================================

app.get('/api/customers', async (req, res) => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('ID', { ascending: false })
    .limit(2500);

  if (error) return res.status(500).json(error);
  res.json(data);
});

app.post('/api/customers', async (req, res) => {
  const {
    age, education, marital_status, income, spending, seniority,
    has_child, children, wines, fruits, meat, fish, sweets, gold,
  } = req.body;

  const newId = Math.floor(Math.random() * 90000) + 10000;

  const { error } = await supabase.from('customers').insert([{
    ID: newId,
    Age: age,
    Education: education,
    Marital_Status: marital_status,
    Income: income,
    Spending: spending,
    Seniority: seniority,
    Has_child: has_child,
    Children: children,
    Wines: wines,
    Fruits: fruits,
    Meat: meat,
    Fish: fish,
    Sweets: sweets,
    Gold: gold,
  }]);

  if (error) return res.status(500).json(error);
  res.json({ message: 'Data berhasil ditambahkan' });
});

app.put('/api/customers/:id', async (req, res) => {
  const {
    age, education, marital_status, income, spending, seniority,
    has_child, children, wines, fruits, meat, fish, sweets, gold,
  } = req.body;

  const { error } = await supabase.from('customers').update({
    Age: age,
    Education: education,
    Marital_Status: marital_status,
    Income: income,
    Spending: spending,
    Seniority: seniority,
    Has_child: has_child,
    Children: children,
    Wines: wines,
    Fruits: fruits,
    Meat: meat,
    Fish: fish,
    Sweets: sweets,
    Gold: gold,
  }).eq('ID', req.params.id);

  if (error) return res.status(500).json(error);
  res.json({ message: 'Data diupdate!' });
});

app.delete('/api/customers/:id', async (req, res) => {
  const { error } = await supabase.from('customers').delete().eq('ID', req.params.id);
  if (error) return res.status(500).json(error);
  res.json({ message: 'Data dihapus!' });
});

// ============================================================
// SEED — baca marketing_campaign.csv (raw Kaggle dataset, format TSV),
// lakukan cleaning + feature engineering, lalu isi tabel `customers`.
// Setara Cell 2 + Cell 3 + Cell 4 di notebook Python (load, clean, build_features, save).
// ============================================================
app.post('/api/seed', async (req, res) => {
  try {
    const csvPath = path.join(process.cwd(), 'marketing_campaign.csv');
    const raw = fs.readFileSync(csvPath, 'utf-8');

    const rows = parse(raw, { columns: true, delimiter: '\t', skip_empty_lines: true });

    const { cleaned, before, after } = cleanRawData(rows);
    const features = buildFeatures(cleaned);

    // ID memakai ID asli dari dataset supaya konsisten saat di-upsert ulang
    const records = features.map((f, idx) => ({ ID: cleaned[idx].ID, ...f }));

    // Upsert per-batch agar tidak melebihi limit payload Supabase
    const BATCH_SIZE = 500;
    let inserted = 0;
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from('customers').upsert(batch, { onConflict: 'ID' });
      if (error) return res.status(500).json(error);
      inserted += batch.length;
    }

    res.json({ message: 'Seed selesai', sebelum_cleaning: before, setelah_cleaning: after, jumlah_disimpan: inserted });
  } catch (err) {
    console.error('Seed error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ============================================================
// K-MEANS — terjemahan Cell 4 (find_best_k), Cell 5 (run_kmeans),
// dan Cell 8 (generate_business_insights) di notebook Python.
// ============================================================
app.post('/api/run-kmeans', async (req, res) => {
  const { data, error } = await supabase.from('customers').select('*').limit(2500);

  if (error) return res.status(500).json(error);
  if (!data || data.length < 8) {
    return res.status(400).json({ message: 'Minimal 8 data (dibutuhkan untuk uji K hingga 8)' });
  }

  try {
    // LANGKAH 1: standarisasi fitur numerik (setara StandardScaler)
    const { scaled: X } = standardScale(data, CLUSTER_FEATURES);

    // LANGKAH 2: cari K terbaik (Elbow Method + Silhouette Score)
    const { bestK, chartData } = findBestK(X);

    // LANGKAH 3: jalankan K-Means final dengan K terbaik
    const { labels, silhouetteScore: silScore } = runFinalKMeans(X, bestK);

    // LANGKAH 4: insight & strategi bisnis otomatis per cluster
    const insights = generateBusinessInsights(data, labels, bestK, silScore);

    // LANGKAH 5: simpan label cluster ke Supabase
    const updates = data.map((row, idx) => ({ ID: row.ID, cluster: labels[idx] }));

    const BATCH_SIZE = 500;
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE);
      const { error: upsertError } = await supabase.from('customers').upsert(batch, { onConflict: 'ID' });
      if (upsertError) {
        console.error('Upsert Error:', upsertError);
        return res.status(500).json(upsertError);
      }
    }

    res.json({
      message: 'KMeans selesai',
      total: updates.length,
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
  const { error } = await supabase.from('customers').update({ cluster: null }).not('ID', 'is', null);
  if (error) return res.status(500).json(error);
  res.json({ message: 'reset' });
});

// WAJIB ADA INI AGAR VERCEL BISA MENJALANKANNYA
export default app;
