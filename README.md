# 🔧 Serba Tester App - Hardware & Internet Speed Tester

Aplikasi web lengkap untuk menguji perangkat keras dan kecepatan internet menggunakan **HTML, CSS, JavaScript, dan PHP**.

## 🎨 **Tampilan**

Antarmuka memakai tema **"Diagnostic HUD"**: konsol gelap dengan aksen neon, panel
glassmorphism, dan readout angka monospace.

- **Dark mode** sebagai default, lengkap dengan **light mode** (tombol di kanan atas atau `Alt` + `T`)
- Preferensi tema mengikuti setelan sistem pada kunjungan pertama, lalu disimpan di `localStorage`
- Navigasi cepat antar modul dengan `Alt` + `1` … `5`
- Indikator status jaringan live di topbar, plus notifikasi toast untuk setiap aksi
- Responsif sampai layar ponsel, menghormati `prefers-reduced-motion`, dan punya gaya khusus untuk cetak

## 🌟 **Fitur Utama**

### 🖥️ **Tes Hardware**
- **Tes Keyboard**: Layout penuh 104 tombol (termasuk numpad, `PrtSc`, `ScrLk`, `Pause`, `Menu`)
  dengan feedback real-time, meter **cakupan** dalam persen, readout kode tombol terakhir, dan tombol reset
- **Tes Monitor**: 12 pola visual untuk memeriksa dead/stuck pixel, backlight bleed, banding, dan gradien —
  navigasi manual penuh (tanpa auto-advance) serta mode layar penuh
- **Tes Audio**: Osilator Web Audio dengan kontrol volume, frekuensi (200–2000 Hz), preset frekuensi,
  pilihan bentuk gelombang (sine/square/triangle/sawtooth), **visualizer gelombang real-time**,
  dan indikator kanal kiri/kanan
- **Tes System**: Browser, layar (termasuk estimasi **refresh rate**), hardware, **GPU renderer**,
  dukungan Web API, koneksi, dan metrik performa halaman — bisa disalin atau diunduh sebagai JSON

### 🌐 **Tes Kecepatan Internet (Real-time)**
- **Ping/Latency Test**: Benar-benar diukur — 6 sampel RTT ke `speedtest.php`, outlier dibuang,
  plus perhitungan **jitter**
- **Download Speed Test**: Mengukur kecepatan download asli dengan PHP backend
- **Upload Speed Test**: Mengukur kecepatan upload asli dengan PHP backend
- **Gauge SVG**: Jarum dan busur gradien yang skalanya menyesuaikan fase
  (ms untuk ping, Mbps untuk download/upload)
- **Stepper fase**: Ping → Download → Upload dengan status berjalan/selesai
- **Connection Status**: Indikator real-time status koneksi (Sangat baik/Baik/Cukup/Lemah)

## 🛠️ **Teknologi yang Digunakan**

### **Frontend**
- **HTML5** - Struktur aplikasi, semantik + atribut ARIA untuk tab dan progress bar
- **CSS3 murni** - Design token via CSS custom properties, glassmorphism, `color-mix()`, SVG gauge.
  Tanpa framework dan tanpa build step (Tailwind CDN sudah dilepas agar tidak ada dependensi runtime berat)
- **JavaScript (ES6+)** - Interaktivitas dan logika aplikasi, tanpa dependensi selain ikon
- **Lucide** - Ikon SVG
- **Web Audio API** - Osilator, stereo panner, dan `AnalyserNode` untuk visualizer
- **Canvas 2D** - Menggambar bentuk gelombang audio
- **Fetch API + XHR** - Komunikasi dengan backend (XHR dipakai karena butuh event progress upload)

### **Backend**
- **🐘 PHP** - Backend untuk tes kecepatan internet
- **📡 External APIs** - Fallback ke layanan eksternal jika PHP tidak tersedia

## 🚀 **Cara Menjalankan dengan XAMPP**

### **Langkah 1: Install XAMPP**
1. Download XAMPP dari https://www.apachefriends.org/
2. Install XAMPP di komputer Anda
3. Pastikan Apache dan PHP aktif di XAMPP Control Panel

### **Langkah 2: Copy File ke XAMPP**
1. Buka folder XAMPP (biasanya `C:\xampp\htdocs\`)
2. Buat folder baru, misalnya `serba-tester`
3. Copy semua file ke folder tersebut:
   ```
   C:\xampp\htdocs\serba-tester\
   ├── index.html
   ├── styles.css
   ├── script.js
   ├── system_info.js
   ├── logo.svg
   └── speedtest.php
   ```

### **Langkah 3: Akses Website**
1. Buka XAMPP Control Panel
2. Start **Apache**
3. Buka browser dan akses: **http://localhost/serba-tester/**

### **Langkah 4: Verifikasi PHP Backend**
1. Buka: **http://localhost/serba-tester/speedtest.php?action=ping**
2. Seharusnya muncul JSON response dengan status "pong"

## 📁 **Struktur File**

```
serba-tester/
├── index.html          # Frontend utama (struktur HTML)
├── styles.css          # Design system & seluruh styling (CSS murni)
├── script.js           # Logika aplikasi (keyboard, speed, audio, monitor, tema, toast)
├── system_info.js      # Modul informasi sistem
├── logo.svg            # Logo & favicon
├── speedtest.php       # Backend PHP (API speed test)
└── README.md           # Dokumentasi ini
```

## 🎯 **Cara Kerja Tes Kecepatan**

### **Hierarki Testing**
1. **PHP Backend** (speedtest.php) - Prioritas utama
2. **External Services** (httpbin.org, google.com) - Fallback
3. **Simulation** (Realistic values) - Fallback terakhir

### **Algoritma**
```javascript
// Pseudocode untuk speed test
async function measureSpeed() {
    // 1. Coba PHP backend
    tryPHPBackend('speedtest.php?action=ping')

    // 2. Jika gagal, coba external
    tryExternalServices()

    // 3. Fallback ke simulasi realistis
    simulateRealisticSpeed()
}
```

## ⚙️ **Konfigurasi PHP (php.ini)**

Untuk hasil speed test yang optimal, pastikan konfigurasi berikut di `php.ini`:

```ini
upload_max_filesize = 50M
post_max_size = 50M
max_execution_time = 300
max_input_time = 300
memory_limit = 128M
```

**Lokasi php.ini**: `C:\xampp\php\php.ini`

## 🔧 **Troubleshooting**

### **Apache Tidak Bisa Start**
- Cek apakah port 80 atau 443 sudah digunakan
- Buka XAMPP Control Panel → Config → Apache → httpd.conf
- Ubah port jika diperlukan

### **PHP Backend Tidak Berfungsi**
- Pastikan Apache sudah running
- Cek `http://localhost/serba-tester/speedtest.php?action=ping`
- Pastikan file `speedtest.php` ada di folder yang benar
- Cek error log di XAMPP Control Panel

### **CORS Issues**
- File `speedtest.php` sudah dikonfigurasi untuk CORS
- Pastikan header Access-Control-Allow-Origin sudah di-set

### **Speed Test Gagal**
- Pastikan PHP backend bisa diakses
- Cek console browser (F12) untuk error
- Jika semua gagal → aplikasi akan menggunakan simulasi realistis

### **Audio Tidak Berfungsi**
- Pastikan browser mendukung Web Audio API
- Cek permission untuk audio di browser settings
- Beberapa browser memerlukan user interaction sebelum audio bisa dimainkan

## 📊 **Performa & Akurasi**

### **Kecepatan Tes**
- **Ping**: < 50ms (sangat cepat), 50-100ms (baik), >100ms (lambat)
- **Download**: >50 Mbps (excellent), 25-50 Mbps (good), <25 Mbps (fair)
- **Upload**: >20 Mbps (excellent), 10-20 Mbps (good), <10 Mbps (fair)

### **Akurasi**
- **PHP Backend**: ±5-10% akurasi (sangat akurat)
- **External Services**: ±10-15% akurasi
- **Simulation**: Estimasi realistis berdasarkan kondisi internet Indonesia

## 🌐 **Akses dari Perangkat Lain**

Jika ingin mengakses dari perangkat lain di jaringan yang sama:

1. Cari IP address komputer Anda:
   ```cmd
   ipconfig
   ```
   (Cari IPv4 Address, contoh: 192.168.1.100)

2. Akses dari perangkat lain:
   ```
   http://192.168.1.100/serba-tester/
   ```

3. Pastikan firewall mengizinkan koneksi ke port 80

## 📝 **Catatan Penting**

- **XAMPP hanya untuk development/testing**
- Untuk production, gunakan web server profesional (Apache/Nginx dengan konfigurasi yang tepat)
- Pastikan keamanan jika diakses dari internet (gunakan HTTPS, firewall, dll)

## 🤝 **Kontribusi**

Jika ingin menambah fitur:
1. Tambahkan HTML structure di `index.html`
2. Tambahkan CSS styling di `styles.css`
3. Implementasikan JavaScript logic di `script.js`
4. Jika perlu backend, tambahkan endpoint di `speedtest.php`

## 📄 **Lisensi**

Proyek ini dibuat untuk keperluan edukasi dan testing. Bebas digunakan dan dimodifikasi.

---

**🎉 Selamat menggunakan Serba Tester App dengan XAMPP!**

**Akses aplikasi di: http://localhost/serba-tester/**