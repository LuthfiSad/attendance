# Quadrang Attendance Cron (Vercel Serverless)

Automasi absensi Quadrang berbasis **Vercel Serverless Functions** dan **Vercel Cron Jobs**.

## Struktur Proyek

```text
.
├── api/
│   └── attendance.js    # Vercel Serverless Function (Clock-in / Clock-out)
├── vercel.json          # Konfigurasi Cron Schedule
├── package.json         # Node.js ESM configuration
├── local-test.js        # Script pengujian lokal
├── .env.example         # Template environment variables
└── .gitignore
```

## Konfigurasi Environment Variables

Tambahkan variabel berikut di **Project Settings -> Environment Variables** pada dashboard Vercel Anda:

| Variabel | Keterangan | Wajib? |
|---|---|---|
| `QUADRANG_USERNAME` | Username akun Quadrang | Ya |
| `QUADRANG_PASSWORD` | Password akun Quadrang | Ya |
| `QUADRANG_LAT` | Latitude titik pusat (Default: `-6.216947`) | Opsional |
| `QUADRANG_LON` | Longitude titik pusat (Default: `106.814036`) | Opsional |
| `CRON_SECRET` | Token proteksi jika ingin mengamankan endpoint cron | Opsional |

## Jadwal Cron (`vercel.json`)

Vercel Cron menggunakan zona waktu **UTC**:

- **Pagi (`clock-in`)**: `3 0 * * 1-5`
  - Jam **00:03 UTC** = **07:03 WIB** (Disesuaikan mundur 12 menit agar tereksekusi di kisaran **07:15 WIB**)
- **Sore (`clock-out`)**: `41 8 * * 1-5`
  - Jam **08:41 UTC** = **15:41 WIB** (Disesuaikan mundur 49 menit agar tereksekusi di kisaran **16:30 WIB**)

## Uji Coba Lokal

1. Salin `.env.example` menjadi `.env` atau jalankan langsung dengan environment variables:
   ```bash
   QUADRANG_USERNAME="user_kamu" QUADRANG_PASSWORD="password_kamu" node local-test.js pagi
   ```
2. Untuk mode sore:
   ```bash
   QUADRANG_USERNAME="user_kamu" QUADRANG_PASSWORD="password_kamu" node local-test.js sore
   ```

## Deploy ke Vercel

1. Install Vercel CLI jika belum:
   ```bash
   npm i -g vercel
   ```
2. Jalankan perintah deploy:
   ```bash
   vercel
   ```
3. Set environment variable di dashboard Vercel, lalu deploy ke production:
   ```bash
   vercel --prod
   ```
