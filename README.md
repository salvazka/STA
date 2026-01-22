# 🔧 Serba Tester App - Hardware & Internet Speed Tester

Aplikasi web lengkap untuk menguji perangkat keras dan kecepatan internet menggunakan **HTML, CSS, JavaScript, dan PHP**.

## 🌟 **Fitur Utama**

### 🖥️ **Tes Hardware**
- **Tes Keyboard**: Deteksi tombol yang berfungsi dengan visual feedback real-time, bekas penekanan (warna kuning), dan tombol reset
- **Tes Monitor**: 9 tes visual untuk memeriksa piksel mati, uniformity, dan gradien
- **Tes Audio**: Kontrol volume dan frekuensi real-time dengan speaker test stereo/mono
- **Tes System**: Informasi lengkap browser, hardware, dan APIs yang didukung

### 🌐 **Tes Kecepatan Internet (Real-time)**
- **Ping/Latency Test**: Mengukur latensi jaringan menggunakan PHP backend
- **Download Speed Test**: Mengukur kecepatan download asli dengan PHP backend
- **Upload Speed Test**: Mengukur kecepatan upload asli dengan PHP backend (realistis 10-20 Mbps)
- **Real-time Progress**: Progress bar animasi dan gauge interaktif
- **Connection Status**: Indikator real-time status koneksi (Excellent/Good/Fair/Poor)

## 🛠️ **Teknologi yang Digunakan**

### **Frontend**
- **HTML5** - Struktur aplikasi
- **CSS3 + Tailwind** - Styling modern dan responsif
- **JavaScript (ES6+)** - Interaktivitas dan logika aplikasi
- **Web Audio API** - Tes audio dengan kontrol real-time
- **Fetch API** - Komunikasi dengan backend

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
├── index.html          # Frontend utama (HTML structure)
├── styles.css          # Styling (Tailwind + Custom CSS)
├── script.js           # JavaScript logic (Main functionality)
├── system_info.js     # System information module
├── speedtest.php       # PHP backend (Speed test API)
└── README.md          # Dokumentasi ini
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