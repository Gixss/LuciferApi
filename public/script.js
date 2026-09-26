const TOOLS = {
  tiktok:{title:'TikTok Downloader',desc:'Unduh video TikTok tanpa watermark.'},
  youtube:{title:'YouTube Downloader',desc:'Download YouTube video + Shorts.'},
  instagram:{title:'Instagram Downloader',desc:'Reels, post, IGTV, carousel.'},
  snackvideo:{title:'SnackVideo Downloader',desc:'Scrape SnackVideo.'},
  ff:{title:'Free Fire Account Check',desc:'Cek akun FF OB55 via UID + region.'},
  base64:{title:'Base64 Encoder / Decoder',desc:'Encode atau decode teks Base64.'},
  hash:{title:'Hash Generator',desc:'MD5, SHA-1, SHA-256, SHA-512.'},
  password:{title:'Password Generator',desc:'Generate password kuat.'},
  qr:{title:'QR Code Generator',desc:'Bikin QR dari teks/URL.'},
  json:{title:'JSON Formatter',desc:'Format atau minify JSON.'},
  uuid:{title:'UUID Generator',desc:'UUID v4 random.'},
  color:{title:'Color Converter',desc:'HEX ↔ RGB ↔ HSL.'},
  docs:{title:'API Documentation',desc:'Semua endpoint + contoh.'},
  about:{title:'About',desc:'Tentang LuciferAPI.'}
};

// Particles
(function(){
  const c = document.getElementById('particles');
  for (let i=0;i<30;i++){
    const p = document.createElement('div');
    p.style.cssText = `position:absolute;width:${Math.random()*3+1}px;height:${Math.random()*3+1}px;background:rgba(230,57,70,${Math.random()*.5+.2});border-radius:50%;left:${Math.random()*100}%;top:${Math.random()*100}%;animation:float ${Math.random()*10+12}s linear infinite;animation-delay:-${Math.random()*10}s;box-shadow:0 0 6px rgba(230,57,70,.6)`;
    c.appendChild(p);
  }
  const s = document.createElement('style');
  s.textContent = '@keyframes float{0%{transform:translateY(0) scale(1);opacity:0}10%{opacity:1}90%{opacity:1}100%{transform:translateY(-100vh) scale(.5);opacity:0}}';
  document.head.appendChild(s);
})();

// Sidebar navigation
const navItems = document.querySelectorAll('.nav-item');
const panels = document.querySelectorAll('.tool-panel');
const pageTitle = document.getElementById('pageTitle');
const pageDesc = document.getElementById('pageDesc');
const sidebar = document.getElementById('sidebar');

navItems.forEach(item => {
  item.addEventListener('click', () => {
    const tool = item.dataset.tool;
    navItems.forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    panels.forEach(p => p.classList.remove('active'));
    const panel = document.getElementById('tool-' + tool);
    if (panel) panel.classList.add('active');
    const meta = TOOLS[tool];
    if (meta){ pageTitle.textContent = meta.title; pageDesc.textContent = meta.desc; }
    if (window.innerWidth <= 900) sidebar.classList.remove('open');
  });
});

document.getElementById('menuToggle').addEventListener('click', () => {
  sidebar.classList.toggle('open');
});

// Helpers
const fmtDur = s => !s ? '—' : `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
const fmtBytes = b => {
  if (!b) return '—';
  const u = ['B','KB','MB','GB']; let i=0; b=parseInt(b);
  while (b>=1024 && i<u.length-1){b/=1024;i++;}
  return `${b.toFixed(1)} ${u[i]}`;
};
const esc = s => String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const err = c => c.innerHTML = `<p class="error-msg">Error: gagal ambil data. Cek URL atau coba lagi.</p>`;

// Scraper forms
document.querySelectorAll('.input-form[data-platform]').forEach(form => {
  const btn = form.querySelector('button');
  const rc = form.parentElement.querySelector('.result-content');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const platform = form.dataset.platform;
    const input = form.querySelector('input, select');
    const btn2 = form.querySelector('button');
    btn2.classList.add('loading'); btn2.disabled = true;
    rc.classList.add('hidden');

    try {
      let url;
      if (platform === 'ff'){
        const uid = document.getElementById('ffUid').value.trim();
        const region = document.getElementById('ffRegion').value;
        const res = await fetch('/api/ffcheck', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({uid, region})
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        const a = data.account;
        rc.innerHTML = `
          <div class="ff-profile">
            ${a.head_pic?`<img src="${a.head_pic}" class="ff-avatar" onerror="this.style.display='none'">`:''}
            <div class="ff-info">
              <h4>${esc(a.nickname||'Unknown')}</h4>
              <p>UID: ${data.uid} · Region: ${data.region} · ${data.ob}</p>
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
        rc.classList.remove('hidden');
        return;
      }

      url = form.querySelector('input').value.trim();
      const res = await fetch(`/api/${platform}`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({url})
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);

      if (platform === 'tiktok'){
        rc.innerHTML = `
          <div class="result-header">
            <img src="${d.cover}" class="result-thumb" onerror="this.style.display='none'">
            <div class="result-meta">
              <h4>${esc(d.title||'Tanpa judul')}</h4>
              <p>@${esc(d.author?.unique_id)} · ${esc(d.author?.nickname||'')}</p>
              <p>❤️ ${(d.stats?.like||0).toLocaleString()} · 💬 ${(d.stats?.comment||0).toLocaleString()} · ▶️ ${(d.stats?.play||0).toLocaleString()}</p>
              <p>🎵 ${esc(d.music||'—')} · ⏱️ ${fmtDur(d.duration)}</p>
            </div>
          </div>
          <div class="download-grid">
            <a class="dl-btn" href="${d.downloads.no_watermark}" target="_blank"><span class="label">No Watermark</span><span class="value">Download MP4</span></a>
            <a class="dl-btn" href="${d.downloads.watermark}" target="_blank"><span class="label">Watermark</span><span class="value">Download MP4</span></a>
            ${d.downloads.hd?`<a class="dl-btn" href="${d.downloads.hd}" target="_blank"><span class="label">HD</span><span class="value">Download MP4</span></a>`:''}
            <a class="dl-btn" href="${d.downloads.audio}" target="_blank"><span class="label">Audio</span><span class="value">Download MP3</span></a>
          </div>`;
      } else if (platform === 'youtube'){
        const all = [
          ...(d.formats.muxed||[]).map(f=>({...f,t:'Video+Audio'})),
          ...(d.formats.videoOnly||[]).map(f=>({...f,t:'Video Only'})),
          ...(d.formats.audioOnly||[]).map(f=>({...f,t:'Audio Only'}))
        ];
        rc.innerHTML = `
          <div class="result-header">
            <img src="${d.thumbnail}" class="result-thumb" onerror="this.style.display='none'">
            <div class="result-meta">
              <h4>${esc(d.title)}</h4>
              <p>${esc(d.author||'—')} ${d.isShort?'· SHORTS':''}</p>
              <p>⏱️ ${fmtDur(d.duration)} · ▶️ ${(parseInt(d.viewCount)||0).toLocaleString()} views</p>
            </div>
          </div>
          <table class="formats-table"><thead><tr><th>Tipe</th><th>Kualitas</th><th>Container</th><th>Ukuran</th><th>Link</th></tr></thead><tbody>
            ${all.map(f=>`<tr><td>${f.t}</td><td>${esc(f.quality||'—')}</td><td>${esc(f.container||'—')}</td><td>${fmtBytes(f.contentLength)}</td><td><a href="${f.url}" target="_blank">Download</a></td></tr>`).join('')}
          </tbody></table>`;
      } else if (platform === 'instagram'){
        rc.innerHTML = `
          <div class="result-header">
            ${d.thumbnail?`<img src="${d.thumbnail}" class="result-thumb" onerror="this.style.display='none'">`:''}
            <div class="result-meta">
              <h4>@${esc(d.author?.username||'—')}</h4>
              <p>${esc(d.author?.full_name||'')}</p>
              <p>Tipe: ${d.type}</p>
              <p>❤️ ${(d.stats?.like||0).toLocaleString()} · 💬 ${(d.stats?.comment||0).toLocaleString()}</p>
              <p style="font-size:.8rem;color:#aaa;">${esc((d.caption||'').slice(0,150))}</p>
            </div>
          </div>
          <div class="download-grid">
            ${d.downloads.map((x,i)=>`<a class="dl-btn" href="${x.url}" target="_blank"><span class="label">${x.type}${d.downloads.length>1?' #'+(i+1):''}</span><span class="value">Download</span></a>`).join('')}
          </div>`;
      } else if (platform === 'snackvideo'){
        rc.innerHTML = `
          <div class="result-header">
            ${d.thumbnail?`<img src="${d.thumbnail}" class="result-thumb" onerror="this.style.display='none'">`:''}
            <div class="result-meta"><h4>${esc(d.title||'SnackVideo')}</h4><p>${esc(d.description||'')}</p></div>
          </div>
          <div class="download-grid">
            ${d.video?`<a class="dl-btn" href="${d.video}" target="_blank"><span class="label">Video</span><span class="value">Download MP4</span></a>`:'<p class="error-msg">Video tidak ditemukan</p>'}
          </div>`;
      }
      rc.classList.remove('hidden');
    } catch (e){
      err(rc);
      rc.classList.remove('hidden');
    } finally {
      btn2.classList.remove('loading'); btn2.disabled = false;
    }
  });
});

// Utility actions
document.querySelectorAll('.act-btn[data-action]').forEach(btn => {
  btn.addEventListener('click', async () => {
    const action = btn.dataset.action;
    const panel = btn.closest('.tool-panel');
    const rc = panel.querySelector('.result-content');

    try {
      if (action === 'encode-b64'){
        const v = document.getElementById('b64Input').value;
        rc.innerHTML = `<h3>Encoded</h3><pre><code>${btoa(unescape(encodeURIComponent(v)))}</code></pre>`;
        rc.classList.remove('hidden');
      } else if (action === 'decode-b64'){
        const v = document.getElementById('b64Input').value;
        rc.innerHTML = `<h3>Decoded</h3><pre><code>${esc(decodeURIComponent(escape(atob(v))))}</code></pre>`;
        rc.classList.remove('hidden');
      } else if (action === 'hash'){
        const v = document.getElementById('hashInput').value;
        const enc = new TextEncoder().encode(v);
        const algos = ['SHA-1','SHA-256','SHA-512'];
        let out = '';
        for (const a of algos){
          const buf = await crypto.subtle.digest(a, enc);
          const hex = [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
          out += `${a}\n${hex}\n\n`;
        }
        rc.innerHTML = `<h3>Hash</h3><pre><code>${out}</code></pre>`;
        rc.classList.remove('hidden');
      } else if (action === 'gen-pw'){
        const len = parseInt(document.getElementById('pwLength').value) || 20;
        const sym = document.getElementById('pwSymbols').checked;
        const num = document.getElementById('pwNumbers').checked;
        let chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (num) chars += '0123456789';
        if (sym) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
        const arr = new Uint32Array(len);
        crypto.getRandomValues(arr);
        const pw = [...arr].map(n=>chars[n%chars.length]).join('');
        rc.innerHTML = `<h3>Password</h3><pre><code>${pw}</code></pre>`;
        rc.classList.remove('hidden');
      } else if (action === 'gen-qr'){
        const v = document.getElementById('qrInput').value;
        if (!v) return;
        const url = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(v)}`;
        rc.innerHTML = `<h3>QR Code</h3><img src="${url}" class="qr" alt="QR">`;
        rc.classList.remove('hidden');
      } else if (action === 'format-json'){
        const v = document.getElementById('jsonInput').value;
        const o = JSON.parse(v);
        rc.innerHTML = `<h3>Formatted</h3><pre><code>${esc(JSON.stringify(o,null,2))}</code></pre>`;
        rc.classList.remove('hidden');
      } else if (action === 'minify-json'){
        const v = document.getElementById('jsonInput').value;
        const o = JSON.parse(v);
        rc.innerHTML = `<h3>Minified</h3><pre><code>${esc(JSON.stringify(o))}</code></pre>`;
        rc.classList.remove('hidden');
      } else if (action === 'clear'){
        panel.querySelectorAll('input, textarea').forEach(el => el.value = '');
        rc.classList.add('hidden');
        rc.innerHTML = '';
      } else if (action === 'gen-uuid'){
        const uuid = crypto.randomUUID();
        rc.innerHTML = `<h3>UUID v4</h3><pre><code>${uuid}</code></pre>`;
        rc.classList.remove('hidden');
      } else if (action === 'color-convert'){
        const v = document.getElementById('colorInput').value.trim();
        let hex = '', rgb = null;
        if (/^#?[0-9a-f]{6}$/i.test(v.replace('#',''))){
          hex = '#' + v.replace('#','').toLowerCase();
          const n = parseInt(hex.slice(1),16);
          rgb = [(n>>16)&255, (n>>8)&255, n&255];
        } else {
          const m = v.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
          if (m){
            rgb = [parseInt(m[1]),parseInt(m[2]),parseInt(m[3])];
            hex = '#' + rgb.map(x=>x.toString(16).padStart(2,'0')).join('');
          }
        }
        if (!rgb) throw new Error('format invalid');
        const [r,g,b] = rgb;
        const mx = Math.max(r,g,b)/255, mn = Math.min(r,g,b)/255;
        const l = (mx+mn)/2;
        const d = mx-mn;
        let h = 0, s = 0;
        if (d){
          s = l > .5 ? d/(2-mx-mn) : d/(mx+mn);
          if (mx===r/255) h = ((g-b)/255/d)%6;
          else if (mx===g/255) h = (b-r)/255/d+2;
          else h = (r-g)/255/d+4;
          h *= 60; if (h<0) h+=360;
        }
        rc.innerHTML = `<h3>Color</h3>
          <pre><code>HEX: ${hex}
RGB: rgb(${r}, ${g}, ${b})
HSL: hsl(${Math.round(h)}, ${Math.round(s*100)}%, ${Math.round(l*100)}%)</code></pre>
          <div style="width:100%;height:60px;border-radius:10px;margin-top:1rem;background:${hex};border:1px solid var(--bd)"></div>`;
        rc.classList.remove('hidden');
      }
    } catch (e){
      rc.innerHTML = `<p class="error-msg">Error: ${esc(e.message)}</p>`;
      rc.classList.remove('hidden');
    }
  });
});
