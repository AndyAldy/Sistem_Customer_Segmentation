-- ============================================================
-- SCHEMA BARU — tabel `customers` mengikuti fitur hasil feature
-- engineering di notebook Python (Marketing_Campaign.ipynb).
-- Jalankan di Supabase SQL Editor.
-- ============================================================

-- Hapus tabel lama jika ingin mulai dari awal (HATI-HATI: data lama hilang)
-- drop table if exists customers;

create table if not exists customers (
  "ID" bigint primary key,
  "Age" integer,
  "Education" text,           -- 'Undergraduate' | 'Postgraduate'
  "Marital_Status" text,      -- 'Alone' | 'In couple'
  "Income" numeric,
  "Spending" numeric,         -- total Wines+Fruits+Meat+Fish+Sweets+Gold
  "Seniority" numeric,        -- lama jadi pelanggan, dalam bulan
  "Has_child" text,           -- 'Has child' | 'No child'
  "Children" text,            -- 'No child' | '1 child' | '2 children' | '3 children'
  "Wines" numeric,
  "Fruits" numeric,
  "Meat" numeric,
  "Fish" numeric,
  "Sweets" numeric,
  "Gold" numeric,
  "cluster" integer
);

-- Jika tabel sudah ada dari versi sebelumnya (skema lama: Income, Recency,
-- MntWines, MntMeatProducts), migrasikan dengan menambah kolom baru:
--
-- alter table customers add column if not exists "Age" integer;
-- alter table customers add column if not exists "Education" text;
-- alter table customers add column if not exists "Marital_Status" text;
-- alter table customers add column if not exists "Spending" numeric;
-- alter table customers add column if not exists "Seniority" numeric;
-- alter table customers add column if not exists "Has_child" text;
-- alter table customers add column if not exists "Children" text;
-- alter table customers add column if not exists "Wines" numeric;
-- alter table customers add column if not exists "Fruits" numeric;
-- alter table customers add column if not exists "Meat" numeric;
-- alter table customers add column if not exists "Fish" numeric;
-- alter table customers add column if not exists "Sweets" numeric;
-- alter table customers add column if not exists "Gold" numeric;
-- -- kolom lama (Recency, MntWines, MntMeatProducts) boleh dihapus setelah migrasi data selesai
