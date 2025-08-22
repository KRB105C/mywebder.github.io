// app.js (ESM)
const $ = (q) => document.querySelector(q);
const htmlEl = $('#code-html');
const cssEl  = $('#code-css');
const jsEl   = $('#code-js');
const iframe = $('#preview');

// Tabs logic
for (const btn of document.querySelectorAll('.tab')) {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.code').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    const id = btn.getAttribute('data-tab');
    document.querySelector('#code-' + id).classList.add('active');
  });
}

// Live Preview builder
function buildHTMLDoc(title, html, css, js) {
  return `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title || 'Preview'}</title><style>${css || ''}</style></head><body>${html || ''}<script>${js || ''}<\/script></body></html>`;
}

$('#btnPreview').addEventListener('click', () => {
  const doc = buildHTMLDoc($('#title').value, htmlEl.value, cssEl.value, jsEl.value);
  const blob = new Blob([doc], { type: 'text/html' });
  iframe.src = URL.createObjectURL(blob);
});

// Generate via Gemini (backend proxy)
$('#btnGenerate').addEventListener('click', async () => {
  const status = $('#genStatus');
  status.hidden = false;
  status.textContent = 'Meminta AI...';

  try {
    const resp = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: $('#prompt').value,
        variant: $('#variant').value
      })
    });
    const data = await resp.json();
    if (data.error) throw new Error(data.error);

    $('#title').value = data.title || 'Situs Baru';
    htmlEl.value = data.html || '';
    cssEl.value  = data.css  || '';
    jsEl.value   = data.js   || '';

    status.textContent = 'Selesai. Silakan edit & preview.';
    setTimeout(() => (status.hidden = true), 1500);
  } catch (e) {
    status.textContent = 'Gagal: ' + e.message;
  }
});

// Publish (save to /u/<slug>/)
$('#btnPublish').addEventListener('click', async () => {
  const status = $('#saveStatus');
  status.hidden = false; status.textContent = 'Menyimpan...';

  try {
    const payload = {
      slug: $('#slug').value,
      title: $('#title').value,
      html: htmlEl.value,
      css: cssEl.value,
      js: jsEl.value
    };
    const resp = await fetch('/api/sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await resp.json();
    if (!data.ok) throw new Error(data.error || 'Unknown error');

    const liveURL = data.url;
    const copyLink = $('#copyLink');
    const openLink = $('#openLink');
    copyLink.hidden = false; openLink.hidden = false;
    copyLink.href = '#';
    openLink.href = liveURL;

    copyLink.onclick = (e) => {
      e.preventDefault();
      navigator.clipboard.writeText(location.origin + liveURL);
      copyLink.textContent = 'Link Disalin!';
      setTimeout(() => (copyLink.textContent = 'Salin Link'), 1200);
    };

    status.textContent = 'Tersimpan! Live: ' + liveURL;
    setTimeout(() => (status.hidden = true), 1800);
  } catch (e) {
    status.textContent = 'Gagal: ' + e.message;
  }
});

// Seed editor dengan template kosong
htmlEl.value = `<main style="max-width:820px;margin:40px auto;font-family:system-ui">
  <h1>Halo 👋</h1>
  <p>Edit konten di tab HTML/CSS/JS, atau gunakan AI untuk generate awal.</p>
</main>`;
cssEl.value = `body{background:#0f1115;color:#e7e9ee} a{color:#7aa2f7}`;
jsEl.value = `console.log('Selamat datang!')`;
