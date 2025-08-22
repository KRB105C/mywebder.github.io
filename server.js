import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Folder untuk menyimpan hasil website
const SITES_DIR = path.join(__dirname, 'sites');

// Middleware
app.use(express.json());
app.use('/u', express.static(SITES_DIR)); // supaya hasil bisa diakses lewat /u/slug/

// Pastikan folder sites ada
await fs.mkdir(SITES_DIR, { recursive: true });

// Helper untuk escape HTML agar aman
function escapeHTML(str = '') {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

// Fungsi untuk build file HTML
function buildHTML({ title = '', html = '', css = '', js = '' }) {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHTML(title)}</title>
  <style>${css}</style>
</head>
<body>
  ${html}
  <script>${js}</script>
</body>
</html>`;
}

// API untuk simpan website
app.post('/api/save', async (req, res) => {
  try {
    const { title, html, css, js } = req.body;
    if (!html && !css && !js) {
      return res.status(400).json({ error: 'Data kosong' });
    }

    const slug = randomUUID(); // generate slug unik
    const dir = path.join(SITES_DIR, slug);

    await fs.mkdir(dir, { recursive: true });

    const finalHTML = buildHTML({ title, html, css, js });
    await fs.writeFile(path.join(dir, 'index.html'), finalHTML, 'utf8');

    return res.json({
      ok: true,
      slug,
      url: `/u/${slug}/`
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Gagal menyimpan' });
  }
});

// Jalankan server (untuk local). Di Vercel, gunakan export handler.
if (process.env.VERCEL) {
  export default app;
} else {
  app.listen(PORT, () => {
    console.log(`AI Web Builder running on http://localhost:${PORT}`);
  });
                             }
