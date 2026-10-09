# 🏆 SpinBracket

**SpinBracket** adalah aplikasi manajemen turnamen sistem gugur (knockdown / knockout) interaktif yang dirancang khusus untuk tayang di **Layar TV / Panggung LED**, dilengkapi roda putar undian (**Spinwheel**) dan animasi selebrasi real-time.

Cocok digunakan untuk berbagai macam kompetisi: turnamen olahraga, e-sports, brewing throwdown, lomba kantor/sekolah, hingga game show komunitas.

---

## ✨ Fitur Unggulan

1. **📺 Tampilan Layar TV Fixed (16:9 Non-Scrollable)**
   - Layar terkunci presisi di resolusi widescreen tanpa scrolling halaman keseluruhan.
   - **Independen Kolom Scroll**: Jika suatu babak memiliki jumlah match yang banyak, hanya kolom tersebut yang dapat di-scroll vertikal (`column-scrollbar`).
   - **Auto-Zoom & Focus Mode**: Saat seluruh pertandingan dalam suatu babak telah selesai, kolom babak tersebut otomatis menghilang dan bagan yang tersisa membesar (scaling tipografi & card ikut membesar).
   - **Tombol Full View**: Memungkinkan panitia berganti antara mode fokus dan mode bagan lengkap kapan saja.

2. **🎡 Undian Spinwheel Interaktif**
   - Mengundi pasangan tanding peserta babak penyisihan dengan roda putar visual yang mulus.
   - Otomatis mengisi slot bagan turnamen secara adil dan transparan di hadapan penonton.

3. **⚡ Sistem Knockdown Dinamis & Slot Bypass**
   - Mendukung jumlah peserta dinamis (8, 16, 28, 36, 64, dsb.).
   - Jika jumlah match dalam satu babak bernilai **ganjil**, sistem otomatis menyediakan **Slot Bypass** yang diletakkan di slot terbawah (terakhir) untuk meloloskan peserta langsung ke babak berikutnya.

4. **🎉 Selebrasi Pemenang & Audio Fanfare**
   - Modal selebrasi pemenang match dengan foto peserta membesar dan taburan confetti warna-warni.
   - **Grand Champion Ceremony**: Efek selebrasi juara 1 yang spektakuler dengan animasi pulsing glow, banner emas, dan synthesised audio fanfare via Web Audio API.

5. **🔐 Akun & Database Persistence**
   - Sistem autentikasi panitia (Login & Register).
   - Penyimpanan data turnamen, peserta, dan progres bagan secara persisten (JSON database), sehingga pertandingan dapat dilanjutkan kapan saja.

---

## 🚀 Panduan Memulai

### 1. Prasyarat
- Node.js (versi 18.x atau lebih baru)
- npm / yarn / pnpm

### 2. Instalasi Dependensi
```bash
npm install
```

### 3. Menjalankan Server Development
```bash
npm run dev
```
Buka peramban di [http://localhost:3000](http://localhost:3000).

### 4. Build untuk Production
```bash
npm run build
npm run start -p 3005
```

---

## 🔑 Akun Default Demo

- **Username**: `admin`
- **Password**: `admin123`
*(Anda juga dapat membuat akun baru melalui halaman Registrasi)*

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, React 18, TypeScript)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Visual Effects**: [Canvas Confetti](https://www.npmjs.com/package/canvas-confetti)
- **Audio**: Web Audio API (Synthesizer Chimes & Fanfare)

---

## 📄 Lisensi
MIT License © 2026 SpinBracket
