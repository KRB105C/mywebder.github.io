// server.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;
const SITES_DIR = path.join(__dirname, 'sites');

if (!process.env.GEMINI_API_KEY) {
  console.warn('[WARN] GEMINI_API_KEY belum di-set di .env');
}

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/u', express.static(SITES_DIR)); // Serve situs user: /u/<slug>/index.html

// Util: sanitasi slug
function toSlug(s) {
  return (s || '')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9-_.]+/g, '-')
    .replace(/(^[-_.]+|[-_.]+$)/g, '')
    .slice(0, 60) || crypto.randomUUID().slice(0, 8);
}

// Util: bungkus HTML final dari bagian HTML/CSS/JS
function buildHTML({ title = 'My Site', html = '', css = '', js = '' }) {
  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>${css}</style>
</head>
<body>
${html}
<script>${js}</script>
</body>
</html>`;
}

// 1) Route AI Generate (proxy ke Gemini)
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, variant = 'landing-minimal' } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Prompt kosong' });

    // Prompt sistem untuk minta output HTML/CSS/JS yang bersih
    const systemInstruction = `Anda adalah asisten pembuat website statis.
Keluarkan hanya JSON valid dengan bentuk:
{
  "title": string,
  "html": string,   // body content tanpa <html>, <head>, <body>
  "css": string,    // CSS murni
  "js": string      // JS murni tanpa module import eksternal
}
Gaya: ${variant}. Hindari external CDN. Bahasa konten: Indonesia.`;

    const body = {
      contents: [
        { role: 'user', parts: [{ text: systemInstruction + '\n\nPermintaan: ' + prompt }] }
      ]
    };

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    );

    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Upaya parsing JSON dari model (hapus backticks/markdown jika ada)
    const cleaned = text
      .replace(/^```(json)?/i, '')
      .replace(/```$/i, '')
      .trim();

    let parsed;
    try { parsed = JSON.parse(cleaned); }
    catch (e) {
      // fallback minimal jika gagal parse
      parsed = {
        title: 'Hasil AI',
        html: `<main style="max-width:720px;margin:40px auto;font-family:system-ui">\n<h1>Hasil AI</h1>\n<pre>${escapeHTML(text).slice(0, 5000)}</pre>\n</main>`,
        css: '',
        js: ''
      };
    }

    return res.json(parsed);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Gagal generate' });
  }
});

// 2) Route Save & Publish
app.post('/api/sites', async (req, res) => {
  try {
    const { slug: rawSlug, title, html, css, js } = req.body || {};
    const slug = toSlug(rawSlug);

    if (!html && !css && !js) return res.status(400).json({ error: 'Konten kosong' });

    const dir = path.join(SITES_DIR, slug);
    await fs.mkdir(dir, { recursive: true });
    const finalHTML = buildHTML({ title, html, css, js });
    await fs.writeFile(path.join(dir, 'index.html'), finalHTML, 'utf8');

    return res.json({
      ok: true,
      slug,
      url: `/u/${slug}/` // link aktif
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Gagal menyimpan' });
  }
});

// Helper untuk escape (fallback block)
function escapeHTML(str = '') {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

// Pastikan folder sites ada
await fs.mkdir(SITES_DIR, { recursive: true });

app.listen(PORT, () => {
  console.log(`AI Web Builder running on http://localhost:${PORT}`);
});
