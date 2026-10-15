export default async function handler(req, res) {
  // Hanya izinkan pemicu dari Vercel Cron (menggunakan GET)
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Ambil mode dari query parameter (?mode=pagi atau ?mode=sore)
  const { mode = 'pagi' } = req.query;

  const GITHUB_TOKEN = process.env.GH_PAT_TOKEN;
  const REPO_OWNER = process.env.GH_REPO_OWNER || 'LuthfiSad';
  const REPO_NAME = process.env.GH_REPO_NAME || 'attendance';

  if (!GITHUB_TOKEN) {
    return res.status(500).json({
      error: 'GH_PAT_TOKEN belum diatur di Environment Variables Vercel.'
    });
  }

  try {
    // Tembak GitHub API repository_dispatch
    const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/dispatches`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'Vercel-Cron-Trigger',
      },
      body: JSON.stringify({
        event_type: 'trigger-attendance',
        client_payload: { mode: mode }
      }),
    });

    if (response.ok) {
      return res.status(200).json({
        success: true,
        message: `Berhasil mentrigger GitHub Actions untuk mode: ${mode}`,
        repo: `${REPO_OWNER}/${REPO_NAME}`
      });
    } else {
      const errText = await response.text();
      return res.status(response.status).json({
        success: false,
        error: errText
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
