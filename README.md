<div align="center">

<img src="https://files.catbox.moe/5xhf7i.jpg" alt="LuciferAPI" width="120" />

# 🔥 LuciferAPI

**Multi-platform scraper + 13 utility tools.**
Cepat · Gratis · Tanpa login · Serverless

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/USERNAME/luciferapi)
[![License: MIT](https://img.shields.io/badge/License-MIT-e63946.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D18-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-e63946.svg?style=for-the-badge)](https://github.com/USERNAME/luciferapi/pulls)
[![Stars](https://img.shields.io/github/stars/USERNAME/luciferapi?style=for-the-badge&color=e63946)](https://github.com/USERNAME/luciferapi)

</div>

---

## 📖 Daftar Isi

- [Fitur](#-fitur)
- [Struktur Folder](#-struktur-folder)
- [Quick Deploy](#-quick-deploy)
- [API Reference](#-api-reference)
- [Contoh Pakai](#-contoh-pakai)
- [Development Lokal](#-development-lokal)
- [Environment Variables](#-environment-variables)
- [Batasan](#️-batasan)
- [Roadmap](#️-roadmap)
- [Lisensi](#-lisensi)

---

## ✨ Fitur

### 📥 Downloader

| Platform | Status | Keterangan |
|---|---|---|
| 🎵 TikTok | ✅ | No watermark · HD · Audio MP3 |
| ▶️ YouTube | ✅ | Video + Shorts · semua kualitas |
| 📷 Instagram | ✅ | Reels · Post · IGTV · Carousel |
| 📸 SnackVideo | ✅ | Parse OpenGraph |

### 🎮 Game Tools

| Tool | Status | Keterangan |
|---|---|---|
| 🔥 Free Fire OB55 | ✅ | Check akun via UID + region |

### 🛠 Utility (Client-Side)

| Tool | Status | Keterangan |
|---|---|---|
| 🔐 Base64 | ✅ | Encode / decode |
| #️⃣ Hash | ✅ | SHA-1 · SHA-256 · SHA-512 |
| 🔑 Password | ✅ | Generator kuat |
| 📱 QR Code | ✅ | Generate QR dari teks/URL |
| 📋 JSON Formatter | ✅ | Format / minify |
| 🆔 UUID | ✅ | UUID v4 random |
| 🎨 Color | ✅ | HEX ↔ RGB ↔ HSL |

**Highlights:**

- ⚡ **Serverless** — semua API jalan sebagai Vercel Functions
- 🎨 **UI Premium** — dark theme, sidebar, glassmorphism, animated border
- 🌐 **Zero Auth** — nggak butuh API key
- 📱 **Responsive** — mobile-first, sidebar collapsible
- 🧩 **Client-Side Utility** — 7 tool jalan tanpa server, hemat quota

---

## 📁 Struktur Folder

```

luciferapi/
├── api/
│   ├── tiktok.js
│   ├── youtube.js
│   ├── instagram.js
│   ├── snackvideo.js
│   └── ffcheck.js
├── public/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── package.json
├── vercel.json
├── .gitignore
└── README.md

```

---

## 🚀 Quick Deploy

### One-Click Deploy

Klik tombol di bawah untuk deploy langsung ke Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/USERNAME/luciferapi)

### Manual via CLI

```bash
git clone https://github.com/USERNAME/luciferapi.git
cd luciferapi
npm i -g vercel
vercel --prod
```

Manual dari Termux

```bash
pkg install git nodejs -y
git clone https://github.com/USERNAME/luciferapi.git
cd luciferapi
npm i -g vercel
vercel login
vercel --prod
```

---

📡 API Reference

Base URL: https://luciferapi.vercel.app

Semua endpoint support GET (query) dan POST (JSON body).

Method Endpoint Body
POST /api/tiktok { "url": "..." }
POST /api/youtube { "url": "..." }
POST /api/instagram { "url": "..." }
POST /api/snackvideo { "url": "..." }
POST /api/ffcheck { "uid": "...", "region": "ID" }

🎵 TikTok

```http
POST /api/tiktok
Content-Type: application/json

{ "url": "https://www.tiktok.com/@user/video/7300000000000000000" }
```

Response:

```json
{
  "platform": "tiktok",
  "id": "7300000000000000000",
  "title": "Judul video",
  "cover": "https://...",
  "duration": 15,
  "author": { "unique_id": "user", "nickname": "Nama", "avatar": "https://..." },
  "stats": { "play": 1200000, "like": 85000, "comment": 1200, "share": 340 },
  "music": "Judul lagu",
  "downloads": {
    "no_watermark": "https://...",
    "watermark": "https://...",
    "hd": "https://...",
    "audio": "https://..."
  }
}
```

▶️ YouTube

```http
POST /api/youtube
Content-Type: application/json

{ "url": "https://youtu.be/dQw4w9WgXcQ" }
```

Response (disederhanakan):

```json
{
  "platform": "youtube",
  "id": "dQw4w9WgXcQ",
  "title": "Judul video",
  "duration": 213,
  "thumbnail": "https://...",
  "author": "Channel Name",
  "viewCount": "1500000000",
  "isShort": false,
  "formats": {
    "muxed":     [ { "quality": "720p", "url": "..." } ],
    "videoOnly": [ { "quality": "1080p", "url": "..." } ],
    "audioOnly": [ { "quality": "128kbps", "url": "..." } ]
  }
}
```

📷 Instagram

```http
POST /api/instagram
Content-Type: application/json

{ "url": "https://www.instagram.com/reel/ABC123xyz/" }
```

Response:

```json
{
  "platform": "instagram",
  "shortcode": "ABC123xyz",
  "type": "video",
  "author": { "username": "user", "full_name": "Nama" },
  "stats": { "like": 12000, "comment": 340, "view": 250000 },
  "downloads": [ { "type": "video", "url": "https://..." } ]
}
```

📸 SnackVideo

```http
POST /api/snackvideo
Content-Type: application/json

{ "url": "https://s.snackvideo.com/xyz" }
```

🎮 Free Fire OB55 Check

```http
POST /api/ffcheck
Content-Type: application/json

{ "uid": "1234567890", "region": "ID" }
```

Region: ID · SG · IND · BR · ME · VN · TH · PK · CIS · US · TW · BD

Response:

```json
{
  "platform": "freefire",
  "ob": "OB55",
  "uid": "1234567890",
  "region": "ID",
  "account": {
    "nickname": "PlayerName",
    "level": 65,
    "exp": 1234567,
    "rank": 314,
    "rank_points": 4200,
    "badges": 25,
    "clan_name": "TeamName",
    "head_pic": "https://..."
  }
}
```

---

🧪 Contoh Pakai

cURL

```bash
curl -X POST https://luciferapi.vercel.app/api/tiktok \
  -H "Content-Type: application/json" \
  -d '{"url":"https://vt.tiktok.com/ZSxxxx/"}'
```

JavaScript (fetch)

```js
const res = await fetch('https://luciferapi.vercel.app/api/tiktok', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://vt.tiktok.com/ZSxxxx/' })
});
const data = await res.json();
console.log(data.downloads.no_watermark);
```

Python

```python
import requests

r = requests.post(
    "https://luciferapi.vercel.app/api/ffcheck",
    json={"uid": "1234567890", "region": "ID"}
)
print(r.json()["account"]["nickname"])
```

---

🛠 Development Lokal

Prasyarat: Node.js ≥ 18 · Vercel CLI

```bash
git clone https://github.com/USERNAME/luciferapi.git
cd luciferapi
npm install
vercel dev
```

Buka http://localhost:3000.

---

🌐 Environment Variables

Set di Vercel → Settings → Environment Variables:

Key Deskripsi Wajib?
IG_COOKIE Cookie IG kalau endpoint 401 ❌
NODE_ENV Set production untuk hide stack ❌

---

⚠️ Batasan

· Vercel free tier — timeout 10s per request. Video YouTube panjang kadang timeout → pindah ke Railway / Fly.io.
· Instagram — endpoint publik sering berubah. Kalau 401, set IG_COOKIE.
· Free Fire — guest token expire cepat. Region mismatch → 401.
· Rate limit — hormati platform sumber. Jangan spam.

---

🗺️ Roadmap

☑ TikTok scraper
☑ YouTube + Shorts
☑ Instagram Reels
☑ SnackVideo
☑ Free Fire OB55 check
☑ Base64 · Hash · Password · QR · JSON · UUID · Color
☑ Sidebar UI + 13 tools
☐ Twitter / X scraper
☐ Facebook video
☐ Spotify downloader
☐ Bulk download queue

---

🤝 Kontribusi

Pull request selalu welcome.

```bash
git checkout -b feat/nama-fitur
git commit -m "feat: tambah fitur X"
git push origin feat/nama-fitur
```

Buka PR, jelasin singkat apa yang diubah.

---

📜 Lisensi

MIT — bebas pakai, modif, jual.

---

👤 Author

LuciferAPI — dibuat dengan 🔥

· GitHub: @USERNAME
· Website: luciferapi.vercel.app

---

<div align="center">

⭐ Kalau proyek ini berguna, kasih bintang ya!

</div>
```

---

Yang perlu lu ganti: cuma USERNAME → username GitHub lu. Ada di 6 tempat:

1. Badge Deploy Vercel — clone URL
2. Badge PRs Welcome
3. Badge Stars
4. Perintah git clone (2x — CLI + Termux)
5. Perintah git clone di Development Lokal
6. Bagian Author

Cara pakai di Termux:

```bash
nano README.md
# paste semua di atas
# ganti USERNAME, Ctrl+O, Enter, Ctrl+X
git add README.md
git commit -m "docs: tambah README"
git push
```
