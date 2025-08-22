// app.js (ESM)

const form = document.getElementById('builderForm');
const htmlEl = document.getElementById('html');
const cssEl = document.getElementById('css');
const jsEl = document.getElementById('js');
const status = document.getElementById('status');
const copyLink = document.getElementById('copyLink');
const openLink = document.getElementById('openLink');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  status.hidden = false;
  status.textContent = 'Menyimpan...';
  try {
    // ambil data
    const payload = {
      slug: document.getElementById('slug').value,
      title: document.getElementById('title').value,
      html: htmlEl.value,
      css: cssEl.value,
      js: jsEl.value,
    };

    const resp = await fetch('/api/sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error('HTTP ' + resp.status + ': ' + errText);
    }

    const data = await resp.json();
    if (!data.ok || !data.url) throw new Error(data.error || 'Unknown error');

    const liveURL = data.url;
    copyLink.hidden = false; 
    openLink.hidden = false;
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
