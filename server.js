                            }
// server.js

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
.replaceAll('&', '&')
.replaceAll('<', '<')
.replaceAll('>', '>');
}

// Pastikan folder sites ada
await fs.mkdir(SITES_DIR, { recursive: true });

app.listen(PORT, () => {
console.log(AI Web Builder running on http://localhost:${PORT});
});
