// app.js (ESM)

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

