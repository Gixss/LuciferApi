const TOOLS = {
  tiktok:{title:'TikTok Downloader',desc:'Unduh video TikTok tanpa watermark.'},
  youtube:{title:'YouTube Downloader',desc:'Video + Shorts, semua kualitas.'},
  instagram:{title:'Instagram Downloader',desc:'Reels, post, IGTV, carousel.'},
  snackvideo:{title:'SnackVideo Downloader',desc:'Parse OpenGraph langsung.'},
  ff:{title:'Free Fire OB55',desc:'Cek akun FF via UID + region.'},
  deob:{title:'Lua Deobfuscator',desc:'Deteksi & decode Luraph, Moonsec, WeAreDevs, IronBrew.'},
  base64:{title:'Base64',desc:'Encode / decode Base64.'},
  hash:{title:'Hash Generator',desc:'SHA-1, SHA-256, SHA-512.'},
  password:{title:'Password Generator',desc:'Generator password kuat.'},
  qr:{title:'QR Code Generator',desc:'Generate QR dari teks/URL.'},
  json:{title:'JSON Formatter',desc:'Format atau minify JSON.'},
  uuid:{title:'UUID Generator',desc:'UUID v4 random.'},
  color:{title:'Color Converter',desc:'HEX ke RGB ke HSL.'},
  docs:{title:'API Documentation',desc:'Semua endpoint + contoh.'},
  about:{title:'About',desc:'Tentang LuciferAPI.'}
};

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtDur = s => !s ? '—' : `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
const fmtBytes = b => { if (!b) return '—'; b = parseInt(b); const u=['B','KB','MB','GB']; let i=0; while (b>=1024 && i<u.length-1){b/=1024;i++;} return `${b.toFixed(1)} ${u[i]}`; };

function toast(msg, type = 'ok') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

// particles
(() => {
  const c = $('#particles');
  for (let i = 0; i < 28; i++) {
    const p = document.createElement('div');
    p.style.cssText = `position:absolute;width:${Math.random()*3+1}px;height:${Math.random()*3+1}px;background:rgba(239,68,68,${Math.random()*.5+.2});border-radius:50%;left:${Math.random()*100}%;top:${Math.random()*100}%;animation:float ${Math.random()*10+12}s linear infinite;animation-delay:-${Math.random()*10}s;box-shadow:0 0 6px rgba(239,68,68,.6)`;
    c.appendChild(p);
  }
  const s = document.createElement('style');
  s.textContent = '@keyframes float{0%{transform:translateY(0);opacity:0}10%{opacity:1}90%{opacity:1}100%{transform:translateY(-100vh);opacity:0}}';
  document.head.appendChild(s);
})();

// nav
const navItems = $$('.nav-item');
const panels = $$('.tool-panel');
navItems.forEach(item => {
  item.addEventListener('click', () => {
    const t = item.dataset.tool;
    navItems.forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    panels.forEach(p => p.classList.remove('active'));
    const panel = $(`#tool-${t}`);
    if (panel) panel.classList.add('active');
    const m = TOOLS[t];
    if (m) { $('#pageTitle').textContent = m.title; $('#pageDesc').textContent = m.desc; }
    if (window.innerWidth <= 960) $('#sidebar').classList.remove('open');
  });
});

$('#menuBtn').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
$('#sbOverlay').addEventListener('click', () => $('#sidebar').classList.remove('open'));

// search
const searchInput = $('#toolSearch');
if (searchInput) {
  searchInput.addEventListener('input', e => {
    const q = e.target.value.toLowerCase().trim();
    $$('.nav-group').forEach(g => {
      let visible = 0;
      g.querySelectorAll('.nav-item').forEach(it => {
        const txt = it.textContent.toLowerCase();
        const match = !q || txt.includes(q);
        it.classList.toggle('hidden', !match);
        if (match) visible++;
      });
      g.style.display = visible ? '' : 'none';
    });
  });
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); searchInput.focus(); }
  });
}

// scraper forms
$$('.input-form[data-platform]').forEach(form => {
  const btn = form.querySelector('button');
  const rc = form.parentElement.querySelector('.result');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const platform = form.dataset.platform;
    btn.classList.add('loading'); btn.disabled = true;
    rc.classList.add('hidden');

    try {
      let payload, endpoint;
      if (platform === 'ff') {
        payload = { uid: $('#ffUid').value.trim(), region: $('#ffRegion').value };
        endpoint = '/api/ffcheck';
      } else {
        payload = { url: form.querySelector('input').value.trim() };
        endpoint = `/api/${platform}`;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'gagal');

      if (platform === 'tiktok') rc.innerHTML = renderTikTok(d);
      else if (platform === 'youtube') rc.innerHTML = renderYouTube(d);
      else if (platform === 'instagram') rc.innerHTML = renderInstagram(d);
      else if (platform === 'snackvideo') rc.innerHTML = renderSnack(d);
      else if (platform === 'ff') rc.innerHTML = renderFF(d);

      rc.classList.remove('hidden');
    } catch (err) {
      rc.innerHTML = `<p class="error-msg">Error: ${esc(err.message)}</p>`;
      rc.classList.remove('hidden');
    } finally {
      btn.classList.remove('loading'); btn.disabled = false;
    }
  });
});

function renderTikTok(d) {
  return `
    <div class="result-header">
      ${d.cover ? `<img src="${d.cover}" class="result-thumb" onerror="this.style.display='none'">` : ''}
      <div class="result-meta">
        <h4>${esc(d.title || 'Tanpa judul')}</h4>
        <p>@${esc(d.author?.unique_id || '—')} · ${esc(d.author?.nickname || '')}</p>
        <p>Like ${(d.stats?.like||0).toLocaleString()} · Comment ${(d.stats?.comment||0).toLocaleString()} · Play ${(d.stats?.play||0).toLocaleString()}</p>
        <p>${esc(d.music || '—')} · ${fmtDur(d.duration)}</p>
      </div>
    </div>
    <div class="download-grid">
      ${d.downloads.no_watermark ? `<a class="dl-btn" href="${d.downloads.no_watermark}" target="_blank"><span class="label">No Watermark</span><span class="value">Download MP4</span></a>` : ''}
      ${d.downloads.watermark ? `<a class="dl-btn" href="${d.downloads.watermark}" target="_blank"><span class="label">Watermark</span><span class="value">Download MP4</span></a>` : ''}
      ${d.downloads.hd ? `<a class="dl-btn" href="${d.downloads.hd}" target="_blank"><span class="label">HD</span><span class="value">Download MP4</span></a>` : ''}
      ${d.downloads.audio ? `<a class="dl-btn" href="${d.downloads.audio}" target="_blank"><span class="label">Audio</span><span class="value">Download MP3</span></a>` : ''}
    </div>`;
}

function renderYouTube(d) {
  const all = [
    ...(d.formats.muxed||[]).map(f => ({...f, t:'Video+Audio'})),
    ...(d.formats.videoOnly||[]).map(f => ({...f, t:'Video Only'})),
    ...(d.formats.audioOnly||[]).map(f => ({...f, t:'Audio Only'})),
  ];
  return `
    <div class="result-header">
      ${d.thumbnail ? `<img src="${d.thumbnail}" class="result-thumb" onerror="this.style.display='none'">` : ''}
      <div class="result-meta">
        <h4>${esc(d.title)}</h4>
        <p>${esc(d.author||'—')} ${d.isShort ? '· SHORTS' : ''}</p>
        <p>${fmtDur(d.duration)} · ${(parseInt(d.viewCount)||0).toLocaleString()} views</p>
      </div>
    </div>
    <table class="formats-table">
      <thead><tr><th>Tipe</th><th>Kualitas</th><th>Container</th><th>Ukuran</th><th>Link</th></tr></thead>
      <tbody>${all.map(f => `<tr><td>${f.t}</td><td>${esc(f.quality||'—')}</td><td>${esc(f.container||'—')}</td><td>${fmtBytes(f.size)}</td><td><a href="${f.url}" target="_blank">Download</a></td></tr>`).join('')}</tbody>
    </table>`;
}

function renderInstagram(d) {
  return `
    <div class="result-header">
      ${d.thumbnail ? `<img src="${d.thumbnail}" class="result-thumb" onerror="this.style.display='none'">` : ''}
      <div class="result-meta">
        <h4>@${esc(d.author?.username || '—')}</h4>
        <p>${esc(d.author?.full_name || '')}</p>
        <p>Tipe: ${esc(d.type)}</p>
        <p>Like ${(d.stats?.like||0).toLocaleString()} · Comment ${(d.stats?.comment||0).toLocaleString()}</p>
        <p style="font-size:.78rem;color:#9a9aac">${esc((d.caption||'').slice(0,150))}</p>
      </div>
    </div>
    <div class="download-grid">
      ${(d.downloads||[]).map((x,i) => `<a class="dl-btn" href="${x.url}" target="_blank"><span class="label">${x.type}${d.downloads.length>1?' #'+(i+1):''}</span><span class="value">Download</span></a>`).join('')}
    </div>`;
}

function renderSnack(d) {
  return `
    <div class="result-header">
      ${d.thumbnail ? `<img src="${d.thumbnail}" class="result-thumb" onerror="this.style.display='none'">` : ''}
      <div class="result-meta"><h4>${esc(d.title||'SnackVideo')}</h4><p>${esc(d.description||'')}</p></div>
    </div>
    <div class="download-grid">
      ${d.video ? `<a class="dl-btn" href="${d.video}" target="_blank"><span class="label">Video</span><span class="value">Download MP4</span></a>` : '<p class="error-msg">Video tidak ditemukan</p>'}
    </div>`;
}

function renderFF(d) {
  const a = d.account;
  return `
    <div class="ff-profile">
      ${a.head_pic ? `<img src="${a.head_pic}" class="ff-avatar" onerror="this.style.display='none'">` : ''}
      <div class="ff-info">
        <h4>${esc(a.nickname||'Unknown')}</h4>
        <p>UID: ${d.uid} · Region: ${d.region} · ${d.ob}</p>
      </div>
    </div>
    <div class="ff-stats">
      <div class="stat-card"><div class="stat-label">Level</div><div class="stat-value">${a.level||'—'}</div></div>
      <div class="stat-card"><div class="stat-label">EXP</div><div class="stat-value">${a.exp||'—'}</div></div>
      <div class="stat-card"><div class="stat-label">Rank</div><div class="stat-value">${a.rank||'—'}</div></div>
      <div class="stat-card"><div class="stat-label">Rank Points</div><div class="stat-value">${a.rank_points||'—'}</div></div>
      <div class="stat-card"><div class="stat-label">Badges</div><div class="stat-value">${a.badges||'—'}</div></div>
      <div class="stat-card"><div class="stat-label">Clan</div><div class="stat-value">${esc(a.clan_name||'—')}</div></div>
      <div class="stat-card"><div class="stat-label">Signature</div><div class="stat-value">${esc(a.signature||'—')}</div></div>
    </div>`;
}

// utility actions
let lastDeobCode = '';
$$('.act-btn[data-action]').forEach(btn => {
  btn.addEventListener('click', async () => {
    const action = btn.dataset.action;
    const panel = btn.closest('.tool-panel');
    const rc = panel.querySelector('.result');
    try {
      if (action === 'deob') {
        const code = $('#deobInput').value.trim();
        if (!code) return toast('Paste kode Lua dulu', 'err');
        btn.classList.add('loading'); btn.disabled = true;
        const res = await fetch('/api/deobfuscate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || 'gagal');
        lastDeobCode = d.code;
        rc.innerHTML = `
          <h3>Hasil Deobfuscate</h3>
          <p>Obfuscator terdeteksi: <b>${d.obfuscators.join(', ')}</b></p>
          <p>Langkah: ${d.steps_applied.join(' → ')}</p>
          <p>Input ${d.stats.input_size.toLocaleString()} B → Output ${d.stats.output_size.toLocaleString()} B${d.stats.parseable ? ' · parseable via AST' : ''}</p>
          ${d.strings_found.length ? `<p>String menarik (${d.strings_found.length}):</p><pre><code>${esc(d.strings_found.slice(0,20).join('\n'))}</code></pre>` : ''}
          <h3 style="margin-top:1rem">Kode</h3>
          <pre><code>${esc(d.code)}</code></pre>`;
        rc.classList.remove('hidden');
        toast('Deobfuscate selesai', 'ok');
      } else if (action === 'deob-copy') {
        if (!lastDeobCode) return toast('Belum ada hasil', 'err');
        await navigator.clipboard.writeText(lastDeobCode);
        toast('Tersalin ke clipboard', 'ok');
      } else if (action === 'encode-b64') {
        const v = $('#b64Input').value;
        rc.innerHTML = `<h3>Encoded</h3><pre><code>${esc(btoa(unescape(encodeURIComponent(v))))}</code></pre>`;
        rc.classList.remove('hidden');
      } else if (action === 'decode-b64') {
        const v = $('#b64Input').value;
        try {
          rc.innerHTML = `<h3>Decoded</h3><pre><code>${esc(decodeURIComponent(escape(atob(v))))}</code></pre>`;
        } catch { throw new Error('Base64 tidak valid'); }
        rc.classList.remove('hidden');
      } else if (action === 'hash') {
        const v = $('#hashInput').value;
        const enc = new TextEncoder().encode(v);
        let out = '';
        for (const alg of ['SHA-1', 'SHA-256', 'SHA-512']) {
          const buf = await crypto.subtle.digest(alg, enc);
          const hex = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
          out += `${alg}\n${hex}\n\n`;
        }
        rc.innerHTML = `<h3>Hash</h3><pre><code>${out}</code></pre>`;
        rc.classList.remove('hidden');
      } else if (action === 'gen-pw') {
        const len = parseInt($('#pwLength').value) || 20;
        let chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if ($('#pwNumbers').checked) chars += '0123456789';
        if ($('#pwSymbols').checked) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
        const arr = new Uint32Array(len);
        crypto.getRandomValues(arr);
        const pw = [...arr].map(n => chars[n % chars.length]).join('');
        rc.innerHTML = `<h3>Password</h3><pre><code>${esc(pw)}</code></pre>`;
        rc.classList.remove('hidden');
      } else if (action === 'gen-qr') {
        const v = $('#qrInput').value;
        if (!v) return;
        rc.innerHTML = `<h3>QR Code</h3><img src="https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(v)}" class="qr" alt="QR">`;
        rc.classList.remove('hidden');
      } else if (action === 'format-json') {
        const v = $('#jsonInput').value;
        rc.innerHTML = `<h3>Formatted</h3><pre><code>${esc(JSON.stringify(JSON.parse(v), null, 2))}</code></pre>`;
        rc.classList.remove('hidden');
      } else if (action === 'minify-json') {
        const v = $('#jsonInput').value;
        rc.innerHTML = `<h3>Minified</h3><pre><code>${esc(JSON.stringify(JSON.parse(v)))}</code></pre>`;
        rc.classList.remove('hidden');
      } else if (action === 'clear') {
        panel.querySelectorAll('input, textarea').forEach(el => el.value = '');
        rc.classList.add('hidden'); rc.innerHTML = '';
      } else if (action === 'gen-uuid') {
        rc.innerHTML = `<h3>UUID v4</h3><pre><code>${crypto.randomUUID()}</code></pre>`;
        rc.classList.remove('hidden');
      } else if (action === 'color-convert') {
        const v = $('#colorInput').value.trim();
        let hex = '', rgb = null;
        if (/^#?[0-9a-f]{6}$/i.test(v.replace('#',''))) {
          hex = '#' + v.replace('#','').toLowerCase();
          const n = parseInt(hex.slice(1), 16);
          rgb = [(n>>16)&255, (n>>8)&255, n&255];
        } else {
          const m = v.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
          if (m) { rgb = [+m[1], +m[2], +m[3]]; hex = '#' + rgb.map(x => x.toString(16).padStart(2,'0')).join(''); }
        }
        if (!rgb) throw new Error('format invalid');
        const [r, g, b] = rgb;
        const mx = Math.max(r,g,b)/255, mn = Math.min(r,g,b)/255;
        const l = (mx+mn)/2, d2 = mx-mn;
        let h = 0, s = 0;
        if (d2) {
          s = l > .5 ? d2/(2-mx-mn) : d2/(mx+mn);
          if (mx === r/255) h = ((g-b)/255/d2) % 6;
          else if (mx === g/255) h = (b-r)/255/d2 + 2;
          else h = (r-g)/255/d2 + 4;
          h *= 60; if (h < 0) h += 360;
        }
        rc.innerHTML = `<h3>Color</h3>
          <pre><code>HEX: ${hex}
RGB: rgb(${r}, ${g}, ${b})
HSL: hsl(${Math.round(h)}, ${Math.round(s*100)}%, ${Math.round(l*100)}%)</code></pre>
          <div style="width:100%;height:60px;border-radius:10px;margin-top:1rem;background:${hex};border:1px solid var(--bd)"></div>`;
        rc.classList.remove('hidden');
      }
    } catch (err) {
      rc.innerHTML = `<p class="error-msg">Error: ${esc(err.message)}</p>`;
      rc.classList.remove('hidden');
    } finally {
      btn.classList.remove('loading'); btn.disabled = false;
    }
  });
});

$('#historyBtn')?.addEventListener('click', () => {
  const h = JSON.parse(localStorage.getItem('lf_history') || '[]');
  toast(h.length ? `${h.length} entri tersimpan (cleared)` : 'History kosong');
  localStorage.removeItem('lf_history');
});
$('#clearBtn')?.addEventListener('click', () => {
  $$('.result').forEach(r => { r.innerHTML = ''; r.classList.add('hidden'); });
  toast('Dibersihkan');
});
