const BASE_LAT = parseFloat(process.env.QUADRANG_LAT || '-6.216947');
const BASE_LON = parseFloat(process.env.QUADRANG_LON || '106.814036');
const BASE_URL = 'https://quadrang.steradian.co.id';
const LOGIN_URL = `${BASE_URL}/login/?next=/`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper delay acak dalam menit
function getRandomDelayMinutes(minMinutes, maxMinutes) {
  const minMs = minMinutes * 60 * 1000;
  const maxMs = maxMinutes * 60 * 1000;
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

/**
 * Mengacak koordinat lat/lon dalam radius tertentu (meter)
 */
function getRandomCoordinates(lat, lon, maxRadiusMeters = 300) {
  const metersPerLatDegree = 111000;
  const metersPerLonDegree = 111000 * Math.cos((lat * Math.PI) / 180);

  const randomRadius = Math.random() * maxRadiusMeters;
  const randomAngle = Math.random() * 2 * Math.PI;

  const dx = randomRadius * Math.cos(randomAngle);
  const dy = randomRadius * Math.sin(randomAngle);

  return {
    lat: (lat + dy / metersPerLatDegree).toFixed(14),
    lon: (lon + dx / metersPerLonDegree).toFixed(14),
    distance: Math.round(randomRadius),
  };
}

/**
 * Helper untuk mengambil Set-Cookie dari Fetch response
 */
function extractCookieHeaders(response) {
  if (typeof response.headers.getSetCookie === 'function') {
    return response.headers.getSetCookie();
  }
  const raw = response.headers.get('set-cookie');
  return raw ? [raw] : [];
}

/**
 * Menggabungkan cookie headers ke dalam Map lalu dikembalikan sebagai string Cookie header
 */
function updateCookieJar(cookieMap, headersList) {
  for (const header of headersList) {
    if (!header) continue;
    const cookiePart = header.split(';')[0].trim();
    const eqIdx = cookiePart.indexOf('=');
    if (eqIdx !== -1) {
      const key = cookiePart.slice(0, eqIdx).trim();
      const val = cookiePart.slice(eqIdx + 1).trim();
      cookieMap.set(key, val);
    }
  }
}

function stringifyCookies(cookieMap) {
  return Array.from(cookieMap.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

export default async function handler(req, res) {
  // Hanya tangani GET (Vercel Cron menggunakan GET)
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Proteksi opsional CRON_SECRET jika dikonfigurasi di Vercel
  if (process.env.CRON_SECRET) {
    const authHeader = req.headers['authorization'];
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized: Invalid CRON_SECRET' });
    }
  }

  const { mode = 'pagi' } = req.query;
  const USERNAME = process.env.QUADRANG_USERNAME;
  const PASSWORD = process.env.QUADRANG_PASSWORD;

  if (!USERNAME || !PASSWORD) {
    return res.status(500).json({
      error: 'Konfigurasi kredensial (QUADRANG_USERNAME atau QUADRANG_PASSWORD) belum diatur di Environment Variables Vercel.'
    });
  }

  // 1. Tentukan Delay Acak Waktu
  let delayMs = 0;
  if (mode === 'pagi') {
    // Range 07:15 - 07:30 -> Delay 0 s/d 15 menit
    delayMs = getRandomDelayMinutes(0, 15);
  } else {
    // Range 16:30 - 17:00 -> Delay 0 s/d 30 menit
    delayMs = getRandomDelayMinutes(0, 30);
  }

  const delayInSeconds = (delayMs / 1000).toFixed(2);
  console.log(`[CRON] Mode: ${mode}. Menunggu delay acak selama ${delayInSeconds} detik...`);

  await sleep(delayMs);

  const location = getRandomCoordinates(BASE_LAT, BASE_LON, 80);
  const cookieJar = new Map();

  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

  try {
    // 1. GET Login Page untuk mengambil CSRF token awal
    const getLoginRes = await fetch(LOGIN_URL, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      },
    });

    const loginHtml = await getLoginRes.text();
    updateCookieJar(cookieJar, extractCookieHeaders(getLoginRes));

    const csrfFromCookie = cookieJar.get('csrftoken') || '';
    const inputCsrfMatch = loginHtml.match(/name=['"]csrfmiddlewaretoken['"]\s+value=['"]([^'"]+)['"]/);
    const csrfToken = inputCsrfMatch ? inputCsrfMatch[1] : csrfFromCookie;

    // 2. POST Login Form
    const formData = new URLSearchParams();
    formData.append('csrfmiddlewaretoken', csrfToken);
    formData.append('username', USERNAME);
    formData.append('password', PASSWORD);

    const postLoginRes = await fetch(LOGIN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': stringifyCookies(cookieJar),
        'Referer': LOGIN_URL,
        'User-Agent': userAgent,
      },
      body: formData.toString(),
      redirect: 'manual', // Agar Set-Cookie dari respons redirect (302) tertangkap
    });

    // Simpan cookie baru dari respons POST login (termasuk sessionid)
    updateCookieJar(cookieJar, extractCookieHeaders(postLoginRes));

    // 3. Hit Endpoint Absensi (clock-in / clock-out)
    const endpoint = mode === 'pagi' ? 'clock-in' : 'clock-out';
    const attendanceUrl = `${BASE_URL}/attendance/${endpoint}?lat=${location.lat}&lon=${location.lon}`;

    const attendanceRes = await fetch(attendanceUrl, {
      method: 'GET',
      headers: {
        'Cookie': stringifyCookies(cookieJar),
        'Referer': `${BASE_URL}/`,
        'User-Agent': userAgent,
      },
    });

    const responseText = await attendanceRes.text();

    return res.status(200).json({
      success: attendanceRes.ok,
      httpStatus: attendanceRes.status,
      mode,
      targetEndpoint: endpoint,
      coordinates: {
        lat: location.lat,
        lon: location.lon,
        distanceFromBase: `${location.distance}m`,
      },
      responsePreview: responseText.slice(0, 300),
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}
