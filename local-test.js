import fs from 'fs';
import path from 'path';

// Otomatis muat file .env jika ada
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

import handler from './api/attendance.js';

// Penggunaan: node local-test.js pagi ATAU node local-test.js sore
const mode = process.argv[2] || 'pagi';

const mockReq = {
  method: 'GET',
  query: { mode },
  headers: {},
};

const mockRes = {
  statusCode: 200,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(data) {
    console.log(`\n--- [HASIL RESPONSE HTTP ${this.statusCode}] ---`);
    console.log(JSON.stringify(data, null, 2));
    return this;
  },
};

console.log(`[TEST] Menjalankan simulasi handler Vercel untuk mode: ${mode}...`);
await handler(mockReq, mockRes);
