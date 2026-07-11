# Buku Panduan: Sistem Customer Segmentation

Sistem ini dirancang untuk mendeteksi lingkungannya secara otomatis. Saat dijalankan di komputer (Localhost), sistem akan menggunakan **MySQL XAMPP**. Saat di-*deploy* ke Vercel (Web Server), sistem akan beralih menggunakan **Supabase**.

### Kebutuhan Sistem (Prasyarat)

* **Node.js**: Sebagai *runtime* aplikasi (gunakan versi LTS).
* **XAMPP**: Untuk penyedia server lokal dan database MySQL.
* **Code Editor**: Visual Studio Code (VSCode) atau sejenisnya.

---

## BAGIAN 1: Menjalankan Sistem di Localhost (Komputer Sendiri)

Bagian ini digunakan saat kamu sedang mengembangkan atau menguji aplikasi secara lokal menggunakan database MySQL XAMPP.

### Langkah 1: Setup Database MySQL XAMPP

1. Buka aplikasi **XAMPP Control Panel**.
2. Klik tombol **Start** pada modul **Apache** dan **MySQL** (pastikan keduanya berwarna hijau).
3. Buka *browser* dan akses URL: `http://localhost/phpmyadmin`.
4. Buat database baru dengan nama `db_customer_segmentation`.


5. Klik database tersebut, lalu pilih tab **SQL** di bagian atas.
6. Salin semua teks kode yang ada di dalam file `sql/schema.sql` (dari folder proyekmu).


7. Tempel (*paste*) ke kotak SQL di phpMyAdmin, lalu klik **Kirim (Go)** untuk membuat tabel. Tabel biarkan dalam keadaan kosong.

### Langkah 2: Menyalakan Server (Backend & Frontend)

1. Buka folder proyek di VSCode.
2. Buka terminal pertama (tekan `Ctrl + ``), lalu jalankan perintah ini untuk menginstal *library* dan menyalakan *backend*:


```bash
npm install
node api/index.js

```


*(Tunggu hingga muncul tulisan: "Berhasil terkoneksi ke database MySQL XAMPP!").*
3. Buka terminal kedua (klik ikon `+` di panel terminal), lalu nyalakan antarmuka *frontend* dengan perintah:


```bash
npm run dev

```


4. Buka *browser* dan akses tautan lokal yang diberikan (biasanya `http://localhost:5173`).

### Langkah 3: Cara Menggunakan Sistem di Localhost

Setelah web terbuka, ikuti urutan ini untuk melakukan analisis:

1. **Memasukkan Data (Seed):** Klik tombol **Seed dari CSV**.
* *Proses di balik layar:* Sistem lokal akan membaca file `marketing_campaign.csv` yang ada di komputermu, membersihkan data yang kotor/kosong, dan menyimpannya secara otomatis ke tabel MySQL XAMPP.




2. **Menjalankan Elbow Method & K-Means:** Klik tombol **Jalankan Analisis**.
* *Proses di balik layar:* Sistem akan mengambil data dari MySQL, mencari nilai *K* (jumlah *cluster*) paling optimal menggunakan *Elbow Method*, mengelompokkan pelanggan, dan menampilkan visualisasi serta *insight* bisnisnya di layar.



---

## BAGIAN 2: Menjalankan Sistem di Web Server (Vercel & Supabase)

Bagian ini digunakan jika aplikasi sudah diunggah (*deploy*) ke internet agar bisa diakses oleh siapa saja. Sistem akan menggunakan Supabase sebagai database *cloud*.

### Langkah 1: Persiapan Database Cloud (Supabase)

1. Masuk ke situs Supabase dan buat proyek baru.
2. Di dasbor Supabase, buka menu **SQL Editor**.
3. Salin isi file `sql/schema.sql`, tempel di editor tersebut, dan tekan **Run** untuk membuat kerangka tabel `customers`.


4. Masuk ke **Project Settings > API**. Catat nilai `Project URL` dan `anon/public key` milikmu.

### Langkah 2: Deployment ke Vercel

1. Masuk ke dasbor Vercel dan buat proyek baru (*Add New Project*), lalu hubungkan ke repositori GitHub milikmu.
2. Sebelum mengklik tombol *Deploy*, buka menu **Environment Variables**.
3. Tambahkan variabel `SUPABASE_URL` dan masukkan URL Supabase milikmu.


4. Tambahkan variabel `SUPABASE_ANON_KEY` dan masukkan kunci rahasia (*anon key*) Supabase milikmu.


5. Klik **Deploy** dan tunggu hingga proses selesai. Vercel akan otomatis menyertakan file CSV berkat pengaturan di `vercel.json`.



### Langkah 3: Cara Menggunakan Sistem di Web Server

Setelah *deploy* sukses, Vercel akan memberikan tautan publik (misal: `[https://customer-segmentation-rosy.vercel.app/]`. Buka tautan tersebut:

1. **Memasukkan Data (Seed):** Klik tombol **Seed dari CSV**.
* *Proses di balik layar:* Karena berada di *server*, API Vercel akan membaca file `marketing_campaign.csv` yang ikut di-*bundle* saat *deploy*, membersihkan datanya, lalu mengirim dan menyimpannya ke database Supabase.




2. **Menjalankan Elbow Method & K-Means:** Klik tombol **Jalankan Analisis**.
* *Proses di balik layar:* Sistem Vercel akan menarik data dari Supabase, memproses algoritma *Elbow* dan K-Means secara *cloud*, lalu menyajikan hasilnya ke layar web milikmu.