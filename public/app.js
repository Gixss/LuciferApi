// LuciferAPI v6.2 frontend
const TOOLS = {
  'chat-global':{title:'Chat Global',desc:'Ruang obrolan publik semua pengguna.'},
  'chat-dm':{title:'Chat Pribadi',desc:'Pesan langsung antar pengguna.'},
  'users':{title:'Pengguna',desc:'Daftar pengguna terdaftar.'},
  'tiktok':{title:'TikTok Downloader',desc:'Unduh video TikTok tanpa watermark.'},
  'youtube':{title:'YouTube Downloader',desc:'Video + Shorts, semua kualitas.'},
  'instagram':{title:'Instagram Downloader',desc:'Reels, post, IGTV, carousel.'},
  'snackvideo':{title:'SnackVideo Downloader',desc:'Parse OpenGraph langsung.'},
  'ff':{title:'Free Fire OB55',desc:'Cek akun FF via UID + region.'},
  'deob':{title:'Lua Deobfuscator',desc:'Deteksi & decode Luraph, Moonsec, WeAreDevs.'},
  'base64':{title:'Base64',desc:'Encode / decode Base64.'},
  'hash':{title:'Hash Generator',desc:'SHA-1, SHA-256, SHA-512.'},
  'qr':{title:'QR Code Generator',desc:'Generate QR dari teks/URL.'},
  'json':{title:'JSON Formatter',desc:'Format atau minify JSON.'},
  'about':{title:'About',desc:'Tentang LuciferAPI.'}
};

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtDur = s => !s ? '—' : `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
const fmtBytes = b => { if (!b) return ''; b = parseInt(b); const u=['B','KB','MB','GB']; let i=0; while (b>=1024 && i<u.length-1){b/=1024;i++;} return `${b.toFixed(1)} ${u[i]}`; };
const fmtTime = ts => { const d = new Date(ts); return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0'); };

// STATE
const state = { token: localStorage.getItem('lf_token'), user: null, dmWith: null, lastG: 0, lastDM: 0 };

// TOAST
function toast(msg, type='ok'){
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 3000);
}

// FETCH WRAPPER
async function apiFetch(url, options={}){
  const headers = options.headers || {};
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  let res, text;
  try { res = await fetch(url, { ...options, headers }); }
  catch (e) { return { ok:false, status:0, error:'Network: '+e.message }; }
  try { text = await res.text(); } catch { return { ok:false, status:res.status, error:'Read error' }; }
  if (text.trim().startsWith('<')) {
    return { ok:false, status:res.status, error:`Server HTML (${res.status})` };
  }
  let data;
  try { data = JSON.parse(text); } catch { return { ok:false, status:res.status, error:'Bukan JSON: '+text.slice(0,100) }; }
  return { ok: res.ok, status: res.status, data, error: res.ok ? null : (data.error || `HTTP ${res.status}`) };
}

// AUTH TABS
$$('.atab').forEach(b => b.addEventListener('click', () => {
  $$('.atab').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  const t = b.dataset.atab;
  $('#loginForm').classList.toggle('hidden', t !== 'login');
  $('#registerForm').classList.toggle('hidden', t !== 'register');
  $('#authSub').textContent = t === 'login' ? 'Masuk ke akun kamu' : 'Bikin akun baru';
}));

$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.disabled = true; $('#loginErr').textContent = '';
  const r = await apiFetch('/api/auth/login', {
    method:'POST',
    body: JSON.stringify({ username: $('#loginUser').value, password: $('#loginPass').value })
  });
  btn.disabled = false;
  if (!r.ok) { $('#loginErr').textContent = r.error; return; }
  saveSession(r.data.token, r.data.user);
});

$('#registerForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.disabled = true; $('#regErr').textContent = '';
  const r = await apiFetch('/api/auth/register', {
    method:'POST',
    body: JSON.stringify({ username: $('#regUser').value, displayName: $('#regName').value, password: $('#regPass').value })
  });
  btn.disabled = false;
  if (!r.ok) { $('#regErr').textContent = r.error; return; }
  saveSession(r.data.token, r.data.user);
});

function saveSession(token, user){
  state.token = token; state.user = user;
  localStorage.setItem('lf_token', token);
  enterApp();
}

$('#logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('lf_token');
  state.token = null; state.user = null;
  location.reload();
});

async function boot(){
  if (!state.token) { showAuth(); return; }
  const r = await apiFetch('/api/auth/me');
  if (!r.ok) { localStorage.removeItem('lf_token'); state.token = null; showAuth(); return; }
  state.user = r.data.user;
  enterApp();
}

function showAuth(){ $('#authScreen').classList.remove('hidden'); $('#appShell').classList.add('hidden'); }
function enterApp(){
  $('#authScreen').classList.add('hidden');
  $('#appShell').classList.remove('hidden');
  $('#sbAvatar').textContent = (state.user.displayName || state.user.username).slice(0,1).toUpperCase();
  $('#sbDisplay').textContent = state.user.displayName || state.user.username;
  $('#sbHandle').textContent = '@' + state.user.username;
  startPolling();
}

// NAV
const navItems = $$('.nav-item');
const panels = $$('.tool-panel');
navItems.forEach(item => item.addEventListener('click', () => {
  const t = item.dataset.tool;
  navItems.forEach(n => n.classList.remove('active'));
  item.classList.add('active');
  panels.forEach(p => p.classList.remove('active'));
  $(`#tool-${t}`)?.classList.add('active');
  const m = TOOLS[t];
  if (m) { $('#pageTitle').textContent = m.title; $('#pageDesc').textContent = m.desc; }
  if (window.innerWidth <= 900) $('#sidebar').classList.remove('open');
  if (t === 'users') loadUsers();
  if (t === 'chat-dm') loadContacts();
}));

$('#menuBtn').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
$('#sbOverlay').addEventListener('click', () => $('#sidebar').classList.remove('open'));

// SEARCH
$('#toolSearch').addEventListener('input', e => {
  const q = e.target.value.toLowerCase().trim();
  $$('.nav-group').forEach(g => {
    let v = 0;
    g.querySelectorAll('.nav-item').forEach(it => {
      const m = !q || it.textContent.toLowerCase().includes(q);
      it.classList.toggle('hidden', !m);
      if (m) v++;
    });
    g.style.display = v ? '' : 'none';
  });
});
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); $('#toolSearch').focus(); }
});

// UPLOAD
async function uploadFile(file){
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const r = await apiFetch('/api/upload', {
        method:'POST',
        body: JSON.stringify({ data: reader.result, mime: file.type, fileName: file.name })
      });
      if (!r.ok) { toast(r.error, 'err'); resolve(null); return; }
      resolve(r.data.url);
    };
    reader.readAsDataURL(file);
  });
}

// MESSAGE RENDER
function renderMsg(m, opts={}){
  const isSelf = opts.selfUid && m.uid === opts.selfUid;
  const name = m.displayName || m.username || m.fromDisplay || m.fromUsername || 'Anon';
  const ts = fmtTime(m.ts);
  let content = '';
  if (m.type === 'text') content = `<div class="msg-content">${esc(m.content)}</div>`;
  else if (m.type === 'image') content = `<div class="msg-content"><img src="${esc(m.content)}" alt="" onclick="window.open(this.src,'_blank')"></div>`;
  else if (m.type === 'voice') content = `<div class="msg-content"><audio controls src="${esc(m.content)}"></audio></div>`;
  else if (m.type === 'file') content = `<div class="msg-content"><a class="msg-file" href="${esc(m.content)}" target="_blank" download="${esc(m.fileName||'file')}">${esc(m.fileName||'file')}</a></div>`;
  else content = `<div class="msg-content">${esc(m.content)}</div>`;

  return `<div class="msg${isSelf?' self':''}">
    <div class="msg-av">${esc(name.slice(0,1).toUpperCase())}</div>
    <div class="msg-body">
      <div class="msg-name">${esc(name)} <span class="msg-time">${ts}</span></div>
      ${content}
    </div>
  </div>`;
}

// GLOBAL CHAT
async function loadGlobal(silent){
  const r = await apiFetch(`/api/chat/global?since=${state.lastG}`);
  if (!r.ok) { if (!silent) toast(r.error, 'err'); return; }
  const box = $('#gMessages');
  for (const m of r.data.messages) {
    box.insertAdjacentHTML('beforeend', renderMsg(m, { selfUid: state.user.uid }));
    if (m.ts > state.lastG) state.lastG = m.ts;
  }
  $('#gCount').textContent = box.children.length + ' pesan';
  box.scrollTop = box.scrollHeight;
}

async function sendGlobal(type, content, extra={}){
  if (!content) return;
  const r = await apiFetch('/api/chat/global', {
    method:'POST',
    body: JSON.stringify({ type, content, ...extra })
  });
  if (!r.ok) { toast(r.error, 'err'); return; }
  await loadGlobal(true);
}

$('#gSend').addEventListener('click', () => {
  const v = $('#gInput').value.trim();
  if (!v) return;
  $('#gInput').value = '';
  sendGlobal('text', v);
});
$('#gInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('#gSend').click(); });

$('#gImage').addEventListener('click', () => pickAndSend('g', 'image'));
$('#gFile').addEventListener('click', () => pickAndSend('g', 'file'));
$('#gVoice').addEventListener('click', () => recordAndSend('g'));

// DM
async function loadContacts(){
  const r = await apiFetch('/api/chat/users');
  if (!r.ok) { toast(r.error, 'err'); return; }
  const list = r.data.users;
  const last = r.data.last || {};
  $('#dmContacts').innerHTML = list.length
    ? list.map(u => {
        const l = last[u.uid] || {};
        return `<div class="dm-contact${state.dmWith===u.uid?' active':''}" data-uid="${u.uid}">
          <div class="dm-contact-av">${esc((u.displayName||u.username).slice(0,1).toUpperCase())}</div>
          <div class="dm-contact-info">
            <div class="dm-contact-name">${esc(u.displayName||u.username)}</div>
            <div class="dm-contact-prev">${esc(l.preview || '@'+u.username)}</div>
          </div>
        </div>`;
      }).join('')
    : '<div style="padding:1rem;color:var(--tx-m);font-size:.82rem">Belum ada user lain.</div>';

  $$('.dm-contact').forEach(el => el.addEventListener('click', () => openDM(el.dataset.uid, el.querySelector('.dm-contact-name').textContent)));
}

function openDM(uid, name){
  state.dmWith = uid;
  state.lastDM = 0;
  $('#dmMessages').innerHTML = '';
  $('#dmRoomHead').innerHTML = `<div class="dm-contact-av">${esc(name.slice(0,1).toUpperCase())}</div><span>${esc(name)}</span>`;
  $('#dmCompose').style.display = 'flex';
  $$('.dm-contact').forEach(c => c.classList.toggle('active', c.dataset.uid === uid));
  loadDM();
}

async function loadDM(silent){
  if (!state.dmWith) return;
  const r = await apiFetch(`/api/chat/dm?with=${state.dmWith}&since=${state.lastDM}`);
  if (!r.ok) { if (!silent) toast(r.error, 'err'); return; }
  const box = $('#dmMessages');
  for (const m of r.data.messages) {
    box.insertAdjacentHTML('beforeend', renderMsg(m, { selfUid: state.user.uid }));
    if (m.ts > state.lastDM) state.lastDM = m.ts;
  }
  box.scrollTop = box.scrollHeight;
}

async function sendDM(type, content, extra={}){
  if (!state.dmWith) return;
  const r = await apiFetch('/api/chat/dm', {
    method:'POST',
    body: JSON.stringify({ to: state.dmWith, type, content, ...extra })
  });
  if (!r.ok) { toast(r.error, 'err'); return; }
  await loadDM(true);
}

$('#dSend').addEventListener('click', () => {
  const v = $('#dInput').value.trim();
  if (!v) return;
  $('#dInput').value = '';
  sendDM('text', v);
});
$('#dInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('#dSend').click(); });
$('#dImage').addEventListener('click', () => pickAndSend('d', 'image'));
$('#dFile').addEventListener('click', () => pickAndSend('d', 'file'));
$('#dVoice').addEventListener('click', () => recordAndSend('d'));

// PICK + SEND
function pickAndSend(scope, type){
  const input = document.createElement('input');
  input.type = 'file';
  if (type === 'image') input.accept = 'image/*';
  input.onchange = async () => {
    const f = input.files[0];
    if (!f) return;
    if (f.size > 400 * 1024) { toast('File >400KB, kompres dulu', 'err'); return; }
    toast('Upload...');
    const url = await uploadFile(f);
    if (!url) return;
    if (scope === 'g') sendGlobal(type, url, { fileName: f.name, mime: f.type });
    else sendDM(type, url, { fileName: f.name, mime: f.type });
  };
  input.click();
}

function recordAndSend(scope){
  if (!navigator.mediaDevices?.getUserMedia) { toast('Browser tidak support rekaman', 'err'); return; }
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    const chunks = [];
    const rec = new MediaRecorder(stream);
    rec.ondataavailable = e => chunks.push(e.data);
    rec.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(chunks, { type: 'audio/webm' });
      if (blob.size > 400 * 1024) { toast('Rekaman >400KB, coba lebih pendek', 'err'); return; }
      toast('Upload...');
      const file = new File([blob], 'voice.webm', { type: 'audio/webm' });
      const url = await uploadFile(file);
      if (!url) return;
      if (scope === 'g') sendGlobal('voice', url, { mime: 'audio/webm' });
      else sendDM('voice', url, { mime: 'audio/webm' });
    };
    rec.start();
    toast('Rekam... klik lagi untuk stop');
    const btn = scope === 'g' ? $('#gVoice') : $('#dVoice');
    btn.classList.add('rec');
    const stop = () => {
      btn.classList.remove('rec');
      btn.removeEventListener('click', stop);
      rec.stop();
    };
    btn.addEventListener('click', stop);
    setTimeout(() => { if (rec.state === 'recording') stop(); }, 30000);
  }).catch(e => toast('Mic error: ' + e.message, 'err'));
}

// POLLING
function startPolling(){
  setInterval(() => {
    if (!$('#tool-chat-global').classList.contains('active') && !$('#tool-chat-dm').classList.contains('active')) return;
    if ($('#tool-chat-global').classList.contains('active')) loadGlobal(true);
    if ($('#tool-chat-dm').classList.contains('active') && state.dmWith) loadDM(true);
  }, 2500);
  loadGlobal(true);
}

// USERS
async function loadUsers(){
  const r = await apiFetch('/api/chat/users');
  if (!r.ok) { $('#usersList').innerHTML = `<p style="color:var(--red)">${esc(r.error)}</p>`; return; }
  $('#usersList').innerHTML = `<h3>Pengguna Terdaftar</h3>` +
    (r.data.users.length
      ? r.data.users.map(u => `<div style="padding:.55rem 0;border-bottom:1px solid var(--bd);display:flex;align-items:center;gap:.6rem">
          <div class="dm-contact-av" style="width:32px;height:32px;font-size:.72rem">${esc((u.displayName||u.username).slice(0,1).toUpperCase())}</div>
          <div><div style="font-weight:600;font-size:.88rem">${esc(u.displayName||u.username)}</div><div style="font-size:.72rem;color:var(--tx-m)">@${esc(u.username)}</div></div>
        </div>`).join('')
      : '<p style="color:var(--tx-m)">Belum ada user lain.</p>');
}

// SCRAPERS
$$('.input-form[data-platform]').forEach(form => {
  const btn = form.querySelector('button');
  const rc = form.parentElement.querySelector('.result');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const platform = form.dataset.platform;
    btn.classList.add('loading'); btn.disabled = true;
    rc.classList.add('hidden'); rc.innerHTML = '';

    try {
      let payload, endpoint;
      if (platform === 'ff') {
        payload = { uid: $('#ffUid').value.trim(), region: $('#ffRegion').value };
        endpoint = '/api/ffcheck';
      } else {
        payload = { url: form.querySelector('input').value.trim() };
        endpoint = `/api/${platform}`;
      }
      const r = await apiFetch(endpoint, { method:'POST', body: JSON.stringify(payload) });
      if (!r.ok) throw new Error(r.data?.hint ? `${r.error}\n${r.data.hint}` : r.error);
      const d = r.data;
      if (platform === 'tiktok') rc.innerHTML = renderTikTok(d);
      else if (platform === 'youtube') rc.innerHTML = renderYouTube(d);
      else if (platform === 'instagram') rc.innerHTML = renderInstagram(d);
      else if (platform === 'snackvideo') rc.innerHTML = renderSnack(d);
      else if (platform === 'ff') rc.innerHTML = renderFF(d);
      rc.classList.remove('hidden');
      bindDownload(rc);
    } catch (err) {
      rc.innerHTML = `<p class="error-msg" style="color:var(--red);padding:.7rem;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:10px;white-space:pre-wrap">${esc(err.message)}</p>`;
      rc.classList.remove('hidden');
    } finally {
      btn.classList.remove('loading'); btn.disabled = false;
    }
  });
});

function renderTikTok(d){
  const stats = [
    d.stats?.play ? `<span><b>${d.stats.play.toLocaleString()}</b> play</span>` : '',
    d.stats?.like ? `<span><b>${d.stats.like.toLocaleString()}</b> like</span>` : '',
    d.stats?.comment ? `<span><b>${d.stats.comment.toLocaleString()}</b> komentar</span>` : '',
  ].filter(Boolean).join('');
  const dl = [
    d.downloads.no_watermark?.url && `<button class="dl-btn" data-dl-url="${esc(d.downloads.no_watermark.url)}" data-dl-name="${esc(d.downloads.no_watermark.filename)}"><span class="label">MP4 · No Watermark</span><span class="value">Download</span></button>`,
    d.downloads.hd?.url && `<button class="dl-btn" data-dl-url="${esc(d.downloads.hd.url)}" data-dl-name="${esc(d.downloads.hd.filename)}"><span class="label">MP4 · HD</span><span class="value">Download</span></button>`,
    d.downloads.watermark?.url && `<button class="dl-btn" data-dl-url="${esc(d.downloads.watermark.url)}" data-dl-name="${esc(d.downloads.watermark.filename)}"><span class="label">MP4 · Watermark</span><span class="value">Download</span></button>`,
    d.downloads.audio?.url && `<button class="dl-btn" data-dl-url="${esc(d.downloads.audio.url)}" data-dl-name="${esc(d.downloads.audio.filename)}"><span class="label">MP3 · Audio</span><span class="value">Download</span></button>`,
  ].filter(Boolean).join('');
  return `<div class="media-card">
    <div class="media-thumb">${d.cover?`<img src="${esc(d.cover)}">`:''}<span class="media-badge">TikTok</span></div>
    <div class="media-info">
      <h4>${esc(d.title || 'Tanpa judul')}</h4>
      <div class="row"><span><b>@${esc(d.author?.unique_id || '—')}</b></span>${d.author?.nickname?`<span>${esc(d.author.nickname)}</span>`:''}</div>
      <div class="kv">Durasi: <b>${fmtDur(d.duration)}</b></div>
      ${d.music?`<div class="kv">Audio: <b>${esc(d.music)}</b></div>`:''}
      ${stats?`<div class="meta-line">${stats}</div>`:''}
    </div>
  </div><div class="dl-grid">${dl}</div>`;
}

function renderYouTube(d){
  const all = [
    ...(d.formats.muxed||[]).map(f=>({...f,t:'Video+Audio'})),
    ...(d.formats.videoOnly||[]).map(f=>({...f,t:'Video Only'})),
    ...(d.formats.audioOnly||[]).map(f=>({...f,t:'Audio Only'})),
  ];
  return `<div class="media-card">
    <div class="media-thumb">${d.thumbnail?`<img src="${esc(d.thumbnail)}">`:''}<span class="media-badge">${d.isShort?'Short':'YouTube'}</span></div>
    <div class="media-info">
      <h4>${esc(d.title)}</h4>
      <div class="row"><span><b>${esc(d.author||'—')}</b></span></div>
      <div class="kv">Durasi: <b>${fmtDur(d.duration)}</b>${d.viewCount?` · ${(parseInt(d.viewCount)).toLocaleString()} views`:''}</div>
    </div>
  </div>
  <table class="formats-table"><thead><tr><th>Tipe</th><th>Kualitas</th><th>Container</th><th>Ukuran</th><th>Aksi</th></tr></thead>
  <tbody>${all.map(f=>`<tr><td>${f.t}</td><td>${esc(f.quality||'—')}</td><td>${esc(f.container||'—')}</td><td>${fmtBytes(f.size)||'—'}</td><td><button class="dl-link" data-dl-url="${esc(f.url)}" data-dl-name="${esc(f.filename)}">Download</button></td></tr>`).join('')}</tbody></table>`;
}

function renderInstagram(d){
  const dl = (d.downloads||[]).map((x,i)=>`<button class="dl-btn" data-dl-url="${esc(x.url)}" data-dl-name="${esc(x.filename||`instagram_${i+1}.${x.type==='video'?'mp4':'jpg'}`)}"><span class="label">${esc(x.type)}${d.downloads.length>1?' #'+(i+1):''}</span><span class="value">Download</span></button>`).join('');
  return `<div class="media-card">
    <div class="media-thumb">${d.thumbnail?`<img src="${esc(d.thumbnail)}">`:''}<span class="media-badge">${esc(d.type)}</span></div>
    <div class="media-info">
      <h4>@${esc(d.author?.username || '—')}</h4>
      <div class="row">${d.author?.full_name?`<span>${esc(d.author.full_name)}</span>`:''}</div>
      <div class="meta-line">${d.stats?.like?`<span><b>${d.stats.like.toLocaleString()}</b> like</span>`:''}${d.stats?.comment?`<span><b>${d.stats.comment.toLocaleString()}</b> komentar</span>`:''}</div>
      ${d.caption?`<div class="kv" style="margin-top:.5rem;font-size:.78rem;color:var(--tx-m)">${esc(d.caption.slice(0,200))}</div>`:''}
    </div>
  </div><div class="dl-grid">${dl}</div>`;
}

function renderSnack(d){
  const dl = (d.downloads||[]).map(x=>`<button class="dl-btn" data-dl-url="${esc(x.url)}" data-dl-name="${esc(x.filename)}"><span class="label">${esc(x.label||'MP4')}</span><span class="value">Download</span></button>`).join('');
  return `<div class="media-card">
    <div class="media-thumb">${d.thumbnail?`<img src="${esc(d.thumbnail)}">`:''}<span class="media-badge">SnackVideo</span></div>
    <div class="media-info"><h4>${esc(d.title||'SnackVideo')}</h4>${d.description?`<div class="kv">${esc(d.description.slice(0,220))}</div>`:''}</div>
  </div><div class="dl-grid">${dl}</div>`;
}

function renderFF(d){
  const a = d.account;
  return `<div class="ff-profile">
    ${a.head_pic?`<img src="${esc(a.head_pic)}" class="ff-avatar" onerror="this.style.display='none'">`:''}
    <div class="ff-info"><h4>${esc(a.nickname||'Unknown')}</h4><p style="color:var(--tx-d);font-size:.86rem">UID ${d.uid} · Region ${d.region} · ${d.ob}</p></div>
  </div>
  <div class="ff-stats">
    <div class="stat-card"><div class="stat-label">Level</div><div class="stat-value">${a.level ?? '—'}</div></div>
    <div class="stat-card"><div class="stat-label">EXP</div><div class="stat-value">${a.exp ?? '—'}</div></div>
    <div class="stat-card"><div class="stat-label">Rank</div><div class="stat-value">${a.rank ?? '—'}</div></div>
    <div class="stat-card"><div class="stat-label">Rank Points</div><div class="stat-value">${a.rank_points ?? '—'}</div></div>
    <div class="stat-card"><div class="stat-label">Badges</div><div class="stat-value">${a.badges ?? '—'}</div></div>
    <div class="stat-card"><div class="stat-label">Clan</div><div class="stat-value">${esc(a.clan_name||'—')}</div></div>
    <div class="stat-card"><div class="stat-label">Signature</div><div class="stat-value">${esc(a.signature||'—')}</div></div>
  </div>`;
}

// DOWNLOAD
function bindDownload(root){
  root.querySelectorAll('[data-dl-url]').forEach(el => {
    el.addEventListener('click', () => triggerDownload(el.dataset.dlUrl, el.dataset.dlName));
  });
}

async function triggerDownload(rawUrl, filename){
  toast(`Download ${filename}...`);
  try {
    const res = await fetch(`/api/download?url=${encodeURIComponent(rawUrl)}&filename=${encodeURIComponent(filename)}`);
    if (res.redirected || res.status === 302) {
      const loc = res.url;
      const a = document.createElement('a');
      a.href = loc; a.download = filename; a.target = '_blank';
      document.body.appendChild(a); a.click(); a.remove();
      return;
    }
    if (res.ok) {
      const blob = await res.blob();
      if (blob.size < 500) throw new Error('empty');
      const u = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = u; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(u), 30000);
      return;
    }
    throw new Error('HTTP ' + res.status);
  } catch (e) {
    const a = document.createElement('a');
    a.href = rawUrl; a.download = filename; a.target = '_blank'; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    toast('Fallback ke link langsung', 'ok');
  }
}

// UTILS
let lastDeob = '';
$$('.act-btn[data-action]').forEach(btn => btn.addEventListener('click', async () => {
  const action = btn.dataset.action;
  const panel = btn.closest('.tool-panel');
  const rc = panel.querySelector('.result');
  try {
    if (action === 'deob') {
      const code = $('#deobInput').value.trim();
      if (!code) return toast('Paste kode dulu', 'err');
      const r = await apiFetch('/api/deobfuscate', { method:'POST', body: JSON.stringify({ code }) });
      if (!r.ok) throw new Error(r.error);
      const d = r.data;
      lastDeob = d.code;
      rc.innerHTML = `<h3>Hasil Deobfuscate</h3>
        <p>Obfuscator: <b>${esc(d.obfuscators.join(', '))}</b></p>
        <p>Input ${d.stats.input_size.toLocaleString()} B → Output ${d.stats.output_size.toLocaleString()} B · ${d.stats.lines} baris</p>
        ${d.strings_found.length?`<h3 style="margin-top:.85rem">String Menarik</h3><pre><code>${esc(d.strings_found.slice(0,20).join('\n'))}</code></pre>`:''}
        <h3 style="margin-top:.85rem">Kode</h3><pre><code>${esc(d.code)}</code></pre>`;
      rc.classList.remove('hidden');
    } else if (action === 'deob-copy') {
      if (!lastDeob) return toast('Belum ada hasil', 'err');
      await navigator.clipboard.writeText(lastDeob);
      toast('Tersalin');
    } else if (action === 'encode-b64') {
      rc.innerHTML = `<h3>Encoded</h3><pre><code>${esc(btoa(unescape(encodeURIComponent($('#b64Input').value))))}</code></pre>`;
      rc.classList.remove('hidden');
    } else if (action === 'decode-b64') {
      rc.innerHTML = `<h3>Decoded</h3><pre><code>${esc(decodeURIComponent(escape(atob($('#b64Input').value))))}</code></pre>`;
      rc.classList.remove('hidden');
    } else if (action === 'hash') {
      const enc = new TextEncoder().encode($('#hashInput').value);
      let out = '';
      for (const alg of ['SHA-1','SHA-256','SHA-512']) {
        const buf = await crypto.subtle.digest(alg, enc);
        out += `${alg}\n${[...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('')}\n\n`;
      }
      rc.innerHTML = `<h3>Hash</h3><pre><code>${out}</code></pre>`;
      rc.classList.remove('hidden');
    } else if (action === 'gen-qr') {
      const v = $('#qrInput').value;
      if (!v) return;
      rc.innerHTML = `<h3>QR Code</h3><img src="https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(v)}" class="qr">`;
      rc.classList.remove('hidden');
    } else if (action === 'format-json') {
      rc.innerHTML = `<h3>Formatted</h3><pre><code>${esc(JSON.stringify(JSON.parse($('#jsonInput').value), null, 2))}</code></pre>`;
      rc.classList.remove('hidden');
    } else if (action === 'minify-json') {
      rc.innerHTML = `<h3>Minified</h3><pre><code>${esc(JSON.stringify(JSON.parse($('#jsonInput').value)))}</code></pre>`;
      rc.classList.remove('hidden');
    } else if (action === 'clear') {
      panel.querySelectorAll('input, textarea').forEach(el => el.value = '');
      rc.classList.add('hidden'); rc.innerHTML = '';
    }
  } catch (err) {
    rc.innerHTML = `<p style="color:var(--red)">Error: ${esc(err.message)}</p>`;
    rc.classList.remove('hidden');
  }
}));

// BOOT
boot();
