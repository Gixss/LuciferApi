const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const state = {
  token: localStorage.getItem('lf_token'),
  user: null,
  dmWith: null,
  lastG: 0,
  lastDM: 0,
};

const TOOLS = {
  'chat-global':'Chat Global',
  'chat-dm':'Chat Pribadi',
  'tiktok':'TikTok Downloader',
  'youtube':'YouTube Downloader',
  'instagram':'Instagram Downloader',
  'snackvideo':'SnackVideo Downloader',
  'ff':'Free Fire OB55',
  'deob':'Lua Deobfuscator',
  'about':'About',
};

async function apiFetch(url, options = {}) {
  const headers = options.headers || {};
  if (state.token) headers['Authorization'] = 'Bearer ' + state.token;
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

  let res, text;
  try { res = await fetch(url, { ...options, headers }); }
  catch (e) { return { ok: false, status: 0, error: 'Network: ' + e.message }; }

  try { text = await res.text(); }
  catch { return { ok: false, status: res.status, error: 'read error' }; }

  if (text.trim().startsWith('<')) {
    return { ok: false, status: res.status, error: 'Server HTML ' + res.status };
  }

  let data;
  try { data = JSON.parse(text); }
  catch { return { ok: false, status: res.status, error: 'Bukan JSON: ' + text.slice(0, 100) }; }

  return { ok: res.ok, status: res.status, data, error: res.ok ? null : (data.error || 'HTTP ' + res.status) };
}

function toast(msg) {
  console.log('[toast]', msg);
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;background:rgba(10,10,18,.95);color:#ececf1;padding:.75rem 1.15rem;border-radius:10px;font-size:.85rem;border:1px solid rgba(255,255,255,.1);z-index:999;max-width:80vw';
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// AUTH
$$('.atab').forEach(b => b.addEventListener('click', () => {
  $$('.atab').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  const t = b.dataset.atab;
  $('#loginForm').classList.toggle('hidden', t !== 'login');
  $('#registerForm').classList.toggle('hidden', t !== 'register');
}));

$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.disabled = true;
  $('#loginErr').textContent = '';
  const r = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: $('#loginUser').value, password: $('#loginPass').value }),
  });
  btn.disabled = false;
  if (!r.ok) { $('#loginErr').textContent = r.error; return; }
  saveSession(r.data.token, r.data.user);
});

$('#registerForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.disabled = true;
  $('#regErr').textContent = '';
  const r = await apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      username: $('#regUser').value,
      displayName: $('#regName').value,
      password: $('#regPass').value,
    }),
  });
  btn.disabled = false;
  if (!r.ok) { $('#regErr').textContent = r.error; return; }
  saveSession(r.data.token, r.data.user);
});

function saveSession(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem('lf_token', token);
  enterApp();
}

$('#logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('lf_token');
  location.reload();
});

async function boot() {
  if (!state.token) { $('#authScreen').classList.remove('hidden'); return; }
  const r = await apiFetch('/api/auth/me');
  if (!r.ok) { localStorage.removeItem('lf_token'); state.token = null; $('#authScreen').classList.remove('hidden'); return; }
  state.user = r.data.user;
  enterApp();
}

function enterApp() {
  $('#authScreen').classList.add('hidden');
  $('#appShell').classList.remove('hidden');
  $('#sbDisplay').textContent = state.user.displayName || state.user.username;
  $('#sbHandle').textContent = '@' + state.user.username;
  startPolling();
}

// NAV
$$('.nav-item').forEach(item => item.addEventListener('click', () => {
  const t = item.dataset.tool;
  $$('.nav-item').forEach(n => n.classList.remove('active'));
  item.classList.add('active');
  $$('.tool-panel').forEach(p => p.classList.remove('active'));
  const panel = $('#tool-' + t);
  if (panel) panel.classList.add('active');
  $('#pageTitle').textContent = TOOLS[t] || t;
  if (t === 'chat-dm') loadContacts();
}));

// GLOBAL CHAT
async function loadGlobal(silent) {
  const r = await apiFetch('/api/chat/global?since=' + state.lastG);
  if (!r.ok) { if (!silent) toast(r.error); return; }
  const box = $('#gMessages');
  for (const m of r.data.messages) {
    box.insertAdjacentHTML('beforeend', renderMsg(m, true));
    if (m.ts > state.lastG) state.lastG = m.ts;
  }
  box.scrollTop = box.scrollHeight;
}

async function sendGlobal(content) {
  if (!content) return;
  const r = await apiFetch('/api/chat/global', {
    method: 'POST',
    body: JSON.stringify({ type: 'text', content }),
  });
  if (!r.ok) { toast(r.error); return; }
  await loadGlobal(true);
}

$('#gSend').addEventListener('click', () => {
  const v = $('#gInput').value.trim();
  if (!v) return;
  $('#gInput').value = '';
  sendGlobal(v);
});
$('#gInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('#gSend').click(); });

// DM
async function loadContacts() {
  const r = await apiFetch('/api/chat/users');
  if (!r.ok) { toast(r.error); return; }
  const list = r.data.users || [];
  const last = r.data.last || {};
  const box = $('#dmList');
  box.innerHTML = list.length
    ? list.map(u => {
        const l = last[u.uid] || {};
        return '<div class="dm-contact' + (state.dmWith === u.uid ? ' active' : '') + '" data-uid="' + u.uid + '" data-name="' + esc(u.displayName || u.username) + '">' +
          '<div class="dm-contact-name">' + esc(u.displayName || u.username) + '</div>' +
          '<div class="dm-contact-prev">' + esc(l.preview || '@' + u.username) + '</div>' +
        '</div>';
      }).join('')
    : '<div style="padding:1rem;color:#6a6a7a;font-size:.8rem">Belum ada user</div>';

  box.querySelectorAll('.dm-contact').forEach(el => el.addEventListener('click', () => {
    openDM(el.dataset.uid, el.dataset.name);
  }));
}

function openDM(uid, name) {
  state.dmWith = uid;
  state.lastDM = 0;
  $('#dmMessages').innerHTML = '';
  $('#dmHead').textContent = name;
  $$('.dm-contact').forEach(c => c.classList.toggle('active', c.dataset.uid === uid));
  loadDM();
}

async function loadDM(silent) {
  if (!state.dmWith) return;
  const r = await apiFetch('/api/chat/dm?with=' + state.dmWith + '&since=' + state.lastDM);
  if (!r.ok) { if (!silent) toast(r.error); return; }
  const box = $('#dmMessages');
  for (const m of r.data.messages) {
    box.insertAdjacentHTML('beforeend', renderMsg(m, false));
    if (m.ts > state.lastDM) state.lastDM = m.ts;
  }
  box.scrollTop = box.scrollHeight;
}

async function sendDM(content) {
  if (!state.dmWith || !content) return;
  const r = await apiFetch('/api/chat/dm', {
    method: 'POST',
    body: JSON.stringify({ to: state.dmWith, type: 'text', content }),
  });
  if (!r.ok) { toast(r.error); return; }
  await loadDM(true);
}

$('#dSend').addEventListener('click', () => {
  const v = $('#dInput').value.trim();
  if (!v) return;
  $('#dInput').value = '';
  sendDM(v);
});
$('#dInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('#dSend').click(); });

function renderMsg(m, isGlobal) {
  const isSelf = isGlobal ? (m.uid === state.user.uid) : (m.from === state.user.uid);
  const name = m.displayName || m.username || m.fromDisplay || m.fromUsername || 'Anon';
  const t = new Date(m.ts);
  const time = t.getHours().toString().padStart(2,'0') + ':' + t.getMinutes().toString().padStart(2,'0');
  return '<div class="msg' + (isSelf ? ' self' : '') + '">' +
    '<div class="msg-av">' + esc(name.slice(0,1).toUpperCase()) + '</div>' +
    '<div class="msg-body">' +
      '<div class="msg-name">' + esc(name) + ' ' + time + '</div>' +
      '<div class="msg-content">' + esc(m.content) + '</div>' +
    '</div>' +
  '</div>';
}

function startPolling() {
  loadGlobal(true);
  setInterval(() => {
    if ($('#tool-chat-global').classList.contains('active')) loadGlobal(true);
    if ($('#tool-chat-dm').classList.contains('active') && state.dmWith) loadDM(true);
  }, 3000);
}

// SCRAPERS
$$('.input-form[data-platform]').forEach(form => {
  const btn = form.querySelector('button');
  const rc = form.parentElement.querySelector('.result');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const platform = form.dataset.platform;
    btn.disabled = true;
    rc.classList.add('hidden');
    rc.innerHTML = '';

    try {
      let payload, endpoint;
      if (platform === 'ff') {
        payload = { uid: $('#ffUid').value.trim(), region: $('#ffRegion').value };
        endpoint = '/api/ffcheck';
      } else {
        payload = { url: form.querySelector('input').value.trim() };
        endpoint = '/api/' + platform;
      }
      const r = await apiFetch(endpoint, { method: 'POST', body: JSON.stringify(payload) });
      if (!r.ok) throw new Error(r.error);
      rc.innerHTML = renderResult(platform, r.data);
      rc.classList.remove('hidden');
      bindDownload(rc);
    } catch (err) {
      rc.innerHTML = '<p style="color:#ef4444">Error: ' + esc(err.message) + '</p>';
      rc.classList.remove('hidden');
    } finally {
      btn.disabled = false;
    }
  });
});

function renderResult(platform, d) {
  if (platform === 'tiktok') {
    const cover = d.cover ? '<img src="' + esc(d.cover) + '" class="cover">' : '';
    const dl = ['no_watermark', 'hd', 'watermark', 'audio'].map(k => {
      const x = d.downloads[k];
      if (!x || !x.url) return '';
      return '<button class="dl-btn" data-url="' + esc(x.url) + '" data-name="' + esc(x.filename) + '" style="margin:.25rem .25rem 0 0;padding:.6rem 1rem;background:#ef4444;border:none;color:#fff;border-radius:8px">' + k + '</button>';
    }).join('');
    return '<div class="result">' + cover +
      '<h3>' + esc(d.title || 'TikTok') + '</h3>' +
      '<p>@' + esc(d.author && d.author.unique_id || '-') + '</p>' +
      '<p>Durasi: ' + (d.duration || 0) + 's</p>' +
      '<div>' + dl + '</div>' +
    '</div>';
  }
  if (platform === 'youtube') {
    const all = [...(d.formats.muxed||[]), ...(d.formats.videoOnly||[]), ...(d.formats.audioOnly||[])];
    const rows = all.slice(0,15).map(f =>
      '<tr><td>' + esc(f.quality || '-') + '</td><td>' + esc(f.container || '-') + '</td>' +
      '<td><button class="dl-btn" data-url="' + esc(f.url) + '" data-name="' + esc(f.filename || 'video.mp4') + '" style="padding:.3rem .7rem;background:#ef4444;border:none;color:#fff;border-radius:6px">DL</button></td></tr>'
    ).join('');
    return '<div class="result">' +
      (d.thumbnail ? '<img src="' + esc(d.thumbnail) + '" class="cover">' : '') +
      '<h3>' + esc(d.title) + '</h3>' +
      '<p>' + esc(d.author || '-') + '</p>' +
      '<table style="width:100%;border-collapse:collapse;font-size:.8rem;margin-top:.6rem">' +
      '<thead><tr><th style="text-align:left;padding:.4rem;color:#f4a261">Kualitas</th><th style="text-align:left;padding:.4rem;color:#f4a261">Container</th><th style="text-align:left;padding:.4rem;color:#f4a261">Aksi</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table>' +
    '</div>';
  }
  if (platform === 'instagram') {
    const dl = (d.downloads || []).map((x,i) =>
      '<button class="dl-btn" data-url="' + esc(x.url) + '" data-name="' + esc(x.filename || 'file.jpg') + '" style="margin:.25rem .25rem 0 0;padding:.6rem 1rem;background:#ef4444;border:none;color:#fff;border-radius:8px">' + esc(x.type) + ' #' + (i+1) + '</button>'
    ).join('');
    return '<div class="result">' +
      (d.thumbnail ? '<img src="' + esc(d.thumbnail) + '" class="cover">' : '') +
      '<h3>@' + esc(d.author && d.author.username || '-') + '</h3>' +
      '<p>Tipe: ' + esc(d.type) + '</p>' +
      '<div>' + dl + '</div>' +
    '</div>';
  }
  if (platform === 'snackvideo') {
    const dl = (d.downloads || []).map(x =>
      '<button class="dl-btn" data-url="' + esc(x.url) + '" data-name="' + esc(x.filename) + '" style="margin:.25rem .25rem 0 0;padding:.6rem 1rem;background:#ef4444;border:none;color:#fff;border-radius:8px">Download</button>'
    ).join('');
    return '<div class="result">' +
      (d.thumbnail ? '<img src="' + esc(d.thumbnail) + '" class="cover">' : '') +
      '<h3>' + esc(d.title || 'SnackVideo') + '</h3>' +
      '<div>' + dl + '</div>' +
    '</div>';
  }
  if (platform === 'ff') {
    const a = d.account;
    return '<div class="result">' +
      '<h3>' + esc(a.nickname || 'Unknown') + '</h3>' +
      '<p>UID: ' + esc(d.uid) + ' - Region: ' + esc(d.region) + '</p>' +
      '<p>Level: ' + (a.level || 0) + '</p>' +
      '<p>EXP: ' + (a.exp || 0) + '</p>' +
      '<p>Rank: ' + (a.rank || 0) + '</p>' +
      '<p>RP: ' + (a.rank_points || 0) + '</p>' +
      '<p>Clan: ' + esc(a.clan_name || '-') + '</p>' +
      '<p>Signature: ' + esc(a.signature || '-') + '</p>' +
    '</div>';
  }
  return '<div class="result"><pre>' + esc(JSON.stringify(d, null, 2)) + '</pre></div>';
}

function bindDownload(root) {
  root.querySelectorAll('.dl-btn[data-url]').forEach(el => {
    el.addEventListener('click', async () => {
      const url = el.dataset.url;
      const name = el.dataset.name || 'file';
      toast('Download ' + name);
      try {
        const res = await fetch('/api/download?url=' + encodeURIComponent(url) + '&filename=' + encodeURIComponent(name));
        if (res.redirected || res.status === 302) {
          const a = document.createElement('a');
          a.href = res.url; a.download = name; a.target = '_blank';
          document.body.appendChild(a); a.click(); a.remove();
          return;
        }
        if (res.ok) {
          const blob = await res.blob();
          if (blob.size < 500) throw new Error('empty');
          const u = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = u; a.download = name;
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(u), 30000);
          return;
        }
        throw new Error('HTTP ' + res.status);
      } catch (e) {
        const a = document.createElement('a');
        a.href = url; a.download = name; a.target = '_blank';
        document.body.appendChild(a); a.click(); a.remove();
      }
    });
  });
}

// UTILS
$$('.act-btn[data-action]').forEach(btn => btn.addEventListener('click', async () => {
  const action = btn.dataset.action;
  const panel = btn.closest('.tool-panel');
  const rc = panel.querySelector('.result');
  try {
    if (action === 'deob') {
      const code = $('#deobInput').value.trim();
      if (!code) return toast('Paste kode dulu');
      const r = await apiFetch('/api/deobfuscate', { method: 'POST', body: JSON.stringify({ code }) });
      if (!r.ok) throw new Error(r.error);
      const d = r.data;
      rc.innerHTML = '<h3>Obfuscator: ' + esc(d.obfuscators.join(', ')) + '</h3>' +
        '<p>Input ' + d.stats.input_size + ' B to Output ' + d.stats.output_size + ' B</p>' +
        '<pre>' + esc(d.code) + '</pre>';
      rc.classList.remove('hidden');
    }
  } catch (err) {
    rc.innerHTML = '<p style="color:#ef4444">Error: ' + esc(err.message) + '</p>';
    rc.classList.remove('hidden');
  }
}));

boot();
