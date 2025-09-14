// server.js (Supabase-ready)
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;
const SITES_DIR = path.join(__dirname, 'sites'); // hanya untuk lokal jika mau

// Supabase (pakai SERVICE ROLE key — server side)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[WARN] SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum di-set di .env / Vercel env');
}

const supabase = createClient(
  SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { persistSession: false } }
);

// Middleware
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Jika kamu mau pakai filesystem lokal untuk development, aktifkan USE_FS=1
const useFs = process.env.USE_FS === '1';
if (useFs) {
  // Pastikan folder sites ada saat lokal
  await fs.mkdir(SITES_DIR, { recursive: true });
  app.use('/u', express.static(SITES_DIR));
}

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

// Helper escape
function escapeHTML(str = '') {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

// --- Route: proxy ke Gemini tetap seperti semula ---
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, variant = 'landing-minimal' } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Prompt kosong' });

    const systemInstruction = `Anda adalah asisten pembuat website statis.
Keluarkan hanya JSON valid dengan bentuk:
{
  "title": string,
  "html": string,
  "css": string,
  "js": string
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

    const cleaned = text
      .replace(/^```(json)?/i, '')
      .replace(/```$/i, '')
      .trim();

    let parsed;
    try { parsed = JSON.parse(cleaned); }
    catch (e) {
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

// --- Route: Save & Publish (Supabase) ---
app.post('/api/sites', async (req, res) => {
  try {
    const { slug: rawSlug, title, html, css, js } = req.body || {};
    const slug = toSlug(rawSlug);

    if (!html && !css && !js) {
      return res.status(400).json({ error: 'Konten kosong' });
    }

    // Upsert ke Supabase (pakai service role key so bypass RLS)
    const payload = { slug, title, html, css, js };
    const { data, error } = await supabase
      .from('sites')
      .upsert([ payload ], { onConflict: 'slug' });

    if (error) {
      console.error('Supabase upsert error:', error);
      throw error;
    }

    // Optional: simpan juga ke filesystem lokal (hanya untuk dev)
    if (useFs) {
      const dir = path.join(SITES_DIR, slug);
      await fs.mkdir(dir, { recursive: true });
      const finalHTML = buildHTML({ title, html, css, js });
      await fs.writeFile(path.join(dir, 'index.html'), finalHTML, 'utf8');
    }

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

// --- Route: Serve site dari Supabase (no fs) ---
app.get('/u/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    // jika pakai fs lokal (dev) dan file ada, biarkan static middleware menangani /u/*
    if (useFs) {
      // fallback: let express static serve if exists
      // but we try DB first for consistency
    }

    const { data, error } = await supabase
      .from('sites')
      .select('title, html, css, js')
      .eq('slug', slug)
      .single();

    if (error || !data) {
      return res.status(404).send('Website tidak ditemukan');
    }

    const finalHTML = buildHTML(data);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(finalHTML);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// jika masih mau pastikan folder sites ada lokal
if (useFs) {
  await fs.mkdir(SITES_DIR, { recursive: true });
}

app.listen(PORT, () => {
  console.log(`AI Web Builder running on http://localhost:${PORT}`);
});