# 🔧 Serba Tester App — Hardware &amp; Internet Speed Tester

Konsol diagnostik berbasis browser untuk menguji **keyboard, monitor, speaker, informasi sistem, dan kecepatan internet**.
Dibangun dengan **Vite + JavaScript vanilla** di frontend dan **Node.js serverless functions** di backend.

## 🗺️ Struktur Halaman

Aplikasi punya dua view yang dikelola router berbasis hash:

| View | URL | Isi |
|------|-----|-----|
| **Beranda** | `#/` | Hero, metrik, section kartu modul, cara pakai, CTA |
| **Alat Uji** | `#/test/<modul>` | Tab + panel diagnostik (keyboard, speed, audio, monitor, system) |

Tautan dalam (deep link) berfungsi: `#/test/speed` langsung membuka modul kecepatan.
Tombol maju/mundur browser juga tersinkron.

## 🎨 Tampilan

Antarmuka memakai tema **"Diagnostic HUD"** dengan **palet hijau**: konsol gelap berona hijau,
aksen neon, panel glassmorphism, dan readout angka monospace.

Palet memakai keluarga hijau analogus supaya elemen yang harus dibedakan tetap terbaca:

| Token | Nilai (dark) | Peran |
|-------|--------------|-------|
| `--brand` | `#34d399` emerald | Aksen utama |
| `--brand-2` / `--lime` | `#a3e635` lime | Pasangan gradien, tombol keyboard ditekan |
| `--emerald` | `#4ade80` green | Sukses / status aktif |
| `--teal` | `#2dd4bf` | Aksen dingin |
| `--amber` | `#fbbf24` | Peringatan |
| `--rose` | `#fb7185` | Galat |

Amber dan rose sengaja dipertahankan di luar keluarga hijau karena keduanya menandakan
peringatan dan galat — kalau ikut dihijaukan, sinyalnya hilang.

- **Dark mode** sebagai default, lengkap dengan **light mode** (tombol di kanan atas atau `Alt` + `T`)
- Preferensi tema mengikuti setelan sistem pada kunjungan pertama, lalu disimpan di `localStorage`
- Navigasi cepat antar modul dengan `Alt` + `1` … `5`
- Indikator status jaringan live di topbar, plus notifikasi toast untuk setiap aksi
- Responsif sampai layar ponsel, menghormati `prefers-reduced-motion`, dan punya gaya khusus untuk cetak

## 🌟 Fitur

### 🖥️ Tes Hardware

- **Tes Keyboard** — layout penuh 104 tombol (numpad, `PrtSc`, `ScrLk`, `Pause`, `Menu`) dengan feedback
  realtime, meter **cakupan** dalam persen, readout kode tombol terakhir, dan tombol reset
- **Tes Monitor** — 12 pola untuk memeriksa dead/stuck pixel, backlight bleed, banding, dan gradien.
  Navigasi manual penuh serta mode layar penuh
- **Tes Audio** — osilator Web Audio dengan kontrol volume, frekuensi (200–2000 Hz) + preset,
  pilihan bentuk gelombang (sine/square/triangle/sawtooth), **visualizer gelombang realtime**,
  dan indikator kanal kiri/kanan
- **Info Sistem** — browser, layar (termasuk estimasi **refresh rate**), hardware, **GPU renderer**,
  dukungan Web API, koneksi, dan metrik performa halaman. Bisa disalin atau diunduh sebagai JSON

### 🌐 Tes Kecepatan Internet (realtime)

Pengukuran berjalan **streaming**, bukan sekali jalan lalu dilaporkan di akhir. Gauge, grafik,
dan angka bergerak terus selama tes:

| Fase | Cara kerja |
|------|-----------|
| **Ping** | 8 round-trip, dilaporkan **median** + **jitter** |
| **Download** | **4 koneksi paralel** `fetch`, body dibaca lewat `ReadableStream` sambil byte dihitung |
| **Upload** | **3 koneksi paralel** `XHR`, chunk 1 MB berulang, hanya byte yang **dikonfirmasi server** yang dihitung |

### 🎯 Server uji

Ada pemilih target di panel Kecepatan:

| Target | Kapan dipakai | Yang diukur |
|--------|---------------|-------------|
| **Cloudflare** | Default saat aplikasi jalan di `localhost` | Koneksi internet Anda yang sebenarnya |
| **Server aplikasi** | Default saat sudah di-deploy | Jalur ke server tempat aplikasi berjalan |

Ini penting: kalau aplikasi diakses dari `localhost`, mengukur ke `/api` berarti mengukur **loopback**
(kecepatan RAM/CPU, bisa ribuan Mbps) — bukan internet. Karena itu targetnya otomatis dialihkan ke
Cloudflare saat di localhost, dan akan muncul peringatan kuning kalau Anda memilih "Server aplikasi"
dalam kondisi tersebut.

Detail teknis:

- **Sampling tiap 100 ms** dengan **jendela geser 1 detik** — satu lonjakan sesaat tidak lagi membuat
  angka (terutama "puncak") melambung
- **Upload hanya menghitung byte yang dikonfirmasi server.** `xhr.upload.onprogress` sengaja tidak
  dipakai sebagai sumber angka, karena `event.loaded` hanya berarti "sudah masuk buffer socket OS",
  bukan "sudah diterima server" — itu membuat hasil upload jauh lebih tinggi dari kenyataan
- **Warm-up 1,5 detik diabaikan** dari hasil akhir supaya ramp-up TCP tidak menekan angka
- **Puncak hanya dicatat setelah warm-up**, agar burst awal dari buffer tidak tercatat sebagai puncak
- **Gauge auto-scale** — skala naik otomatis (10 → 25 → 50 → … → 2500 Mbps) mengikuti kecepatan terukur
- **Grafik throughput realtime** di Canvas, warna berbeda per fase
- **Angka live**: saat ini / rata-rata / puncak
- **Bisa dibatalkan** kapan saja lewat tombol Batalkan atau `Esc` (`AbortController` memutus semua stream)
- **Payload tidak bisa dikompresi** — server mengirim blok acak dengan `Content-Encoding: identity`
  supaya hasil pengukuran tidak melambung akibat gzip

## 🛠️ Teknologi

### Frontend
- **Vite** — dev server dengan HMR dan bundling produksi
- **JavaScript ES modules** — dipecah jadi `lib/` (dom, ikon, toast, tema, chart) dan `modules/` (per alat tes)
- **CSS3 murni** — design token via custom properties, glassmorphism, `color-mix()`, gauge SVG. Tanpa framework CSS
- **Lucide** — ikon SVG, diimpor per-ikon lewat npm supaya ikut tree-shaking
- **Web Audio API** — osilator, stereo panner, `AnalyserNode` untuk visualizer
- **Canvas 2D** — grafik throughput dan bentuk gelombang audio
- **Streams API + XHR** — `fetch`/`ReadableStream` untuk download, XHR untuk upload (butuh event progres)

### Backend
- **Node.js** — tiga handler polos `(req, res)` di `server/handlers.js`
- Handler yang sama dipakai di **tiga lingkungan** tanpa duplikasi:
  - Vercel Serverless Functions (`api/*.js`)
  - Vite dev &amp; preview server (middleware di `vite.config.js`)
  - Server Node standalone (`server/standalone.js`)

> Backend PHP (`speedtest.php`) dan panduan XAMPP sudah dihapus pada v2.

## 🚀 Menjalankan secara lokal

Butuh **Node.js 20.19+** (atau 22.12+).

```bash
npm install
npm run dev
```

Buka **http://localhost:5173**. Endpoint `/api/*` otomatis aktif di dev server, jadi tes kecepatan
langsung bisa dipakai tanpa menjalankan proses terpisah.

### Skrip yang tersedia

| Perintah | Kegunaan |
|----------|----------|
| `npm run dev` | Dev server Vite + endpoint `/api` (port 5173) |
| `npm run build` | Build produksi ke `dist/` |
| `npm run preview` | Pratinjau hasil build + endpoint `/api` (port 4173) |
| `npm run serve` | Server Node standalone menyajikan `dist/` + `/api` (port 3000) |

Untuk menjalankan tanpa Vercel sama sekali:

```bash
npm run build
npm run serve      # http://localhost:3000
```

## ☁️ Deploy ke Vercel

1. Push repositori ini ke GitHub
2. Di Vercel, **Add New → Project**, lalu import repo-nya
3. **Framework Preset: `Vite`** (terdeteksi otomatis)

| Setting | Nilai |
|---------|-------|
| Framework Preset | **Vite** |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

Folder `api/` otomatis dideploy sebagai Serverless Functions, tidak perlu konfigurasi tambahan.
`vercel.json` sudah mengatur `maxDuration` dan header `no-store` untuk `/api/*`.

### ⚠️ Catatan penting soal deploy

- **Batas body request Vercel ~4,5 MB.** Karena itu upload dikirim per chunk 1 MB, bukan satu request besar.
  Jangan naikkan `CONFIG.upload.chunkBytes` di `src/modules/speedtest.js` melebihi batas ini.
- **Tes kecepatan memakan bandwidth.** Satu kali tes bisa mentransfer ratusan MB sampai beberapa GB
  tergantung kecepatan koneksi. Di Vercel ini dihitung sebagai bandwidth keluar dan bisa cepat menghabiskan
  kuota Hobby. Kalau aplikasinya dipakai publik, pertimbangkan memperkecil `CONFIG.download.durationMs`
  dan `CONFIG.download.streams`, atau memindahkan endpoint ke VPS sendiri.
- **Hasil mencerminkan jalur ke server aplikasi**, yaitu region Vercel tempat function berjalan —
  bukan ke server terdekat seperti Speedtest.net. Region bisa dilihat di field `region` pada respons `/api/ping`.

## 📁 Struktur Proyek

```
serba-tester/
├── api/                     # Vercel Serverless Functions (tipis, hanya re-export)
│   ├── ping.js
│   ├── download.js
│   └── upload.js
├── server/
│   ├── handlers.js          # Logika backend: ping, download streaming, upload counter
│   └── standalone.js        # Server Node opsional (dist/ + /api) untuk non-Vercel
├── public/
│   └── logo.svg             # Aset statis, disalin apa adanya ke dist/
├── src/
│   ├── lib/
│   │   ├── chart.js         # Grafik throughput realtime (Canvas)
│   │   ├── dom.js           # Helper DOM & format angka
│   │   ├── icons.js         # Ikon Lucide (impor per-ikon)
│   │   ├── theme.js         # Dark/light mode
│   │   └── toast.js         # Notifikasi
│   ├── modules/
│   │   ├── keyboard.js
│   │   ├── speedtest.js     # Mesin pengukuran realtime
│   │   ├── audio.js
│   │   ├── monitor.js
│   │   └── systemInfo.js
│   ├── main.js              # Entry point: navigasi tab + wiring modul
│   └── styles.css           # Design system
├── index.html
├── vite.config.js           # Termasuk middleware /api untuk dev & preview
├── vercel.json
└── package.json
```

## 🔌 API

| Endpoint | Method | Keterangan |
|----------|--------|-----------|
| `/api/ping` | `GET` | Respons JSON minimal (`{ status, now, region }`) untuk mengukur RTT |
| `/api/download?bytes=N` | `GET` | Mengalirkan `N` byte acak. Dijepit antara 1 KB dan 200 MB, default 25 MB |
| `/api/upload` | `POST` | Menghitung byte diterima, membalas `{ bytes, ms, mbps }` |

Semuanya mengirim header `Cache-Control: no-store` dan mendukung preflight CORS.

## ⌨️ Pintasan Keyboard

| Pintasan | Aksi |
|----------|------|
| `Alt` + `1` … `5` | Pindah antar modul |
| `Alt` + `T` | Ganti tema terang / gelap |
| `←` `→` `Space` | Navigasi pola (tes monitor) |
| `F` | Layar penuh (tes monitor) |
| `Esc` | Keluar layar penuh · hentikan nada audio · batalkan tes kecepatan |

Saat modul Keyboard aktif, penekanan tombol ditangkap dan aksi bawaan browser ditahan —
kecuali `F5`, `F11`, `F12`, `Esc`, dan kombinasi `Ctrl`/`Cmd` supaya Anda tidak terjebak.

## 🔧 Troubleshooting

**Tes kecepatan gagal / "Server tidak merespons"**
Pastikan aplikasi diakses lewat `npm run dev`, `npm run preview`, `npm run serve`, atau hasil deploy —
bukan dengan membuka `index.html` langsung dari filesystem. Endpoint `/api/*` butuh server.

**Angka download/upload terlalu tinggi (ribuan Mbps)**
Berarti target uji sedang diarahkan ke **Server aplikasi** sementara aplikasi jalan di `localhost` —
yang terukur adalah loopback, bukan internet. Pindahkan pemilih **Server uji** ke **Cloudflare**
(ini sudah jadi default di localhost). Peringatan kuning akan muncul kalau kondisinya begini.

**Audio tidak berbunyi**
Sebagian browser mewajibkan interaksi pengguna sebelum memutar audio — klik tombol tes dulu.
Cek juga di modul Sistem apakah **Web Audio** berstatus `Ya`.

**Grafik realtime kosong**
Cek dukungan **Streams API** di modul Sistem. Bila tidak tersedia, download otomatis jatuh ke
pengukuran per-blok (`arrayBuffer`) sehingga sampelnya lebih jarang.

## 📄 Lisensi

Proyek ini dibuat untuk keperluan edukasi dan testing. Bebas digunakan dan dimodifikasi.
