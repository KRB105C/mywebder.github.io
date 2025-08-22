document.getElementById("builderForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const prompt = document.getElementById("prompt").value;
  const slug = document.getElementById("slug").value;
  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = "Sedang membuat situs...";

  const res = await fetch("/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, slug })
  });

  const data = await res.json();
  if (data.url) {
    resultDiv.innerHTML = `Situs berhasil dibuat! <a href="${data.url}" target="_blank">Lihat di sini</a>`;
  } else {
    resultDiv.innerHTML = `Error: ${data.error}`;
  }
});
