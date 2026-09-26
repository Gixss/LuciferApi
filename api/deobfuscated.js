// language: JavaScript, file: api/deobfuscate.js, target: Vercel Serverless
// Self-contained Lua deobfuscator. Zero external deps. Never throws.

const SIGNATURES = {
  luraph: [/Luraph/i, /\bLPH_?[A-Z0-9]{3,}/, /luraph\.io/i],
  moonsec: [/MoonSec/i, /moonsec/i, /\bV\d{1,3}_[A-Z0-9]{2,}/i],
  wearedevs: [/wearedevs/i, /WeAreDevs/i, /wearedevs\.net/i],
  ironbrew: [/IronBrew/i, /\bIB2?\b/, /ironbrew/i],
  ares: [/Ares/i, /ares\.gg/i],
  prometheus: [/Prometheus/i, /prometheus\.io/i],
  generic: [],
};

function detect(code) {
  try {
    const hits = [];
    for (const [name, pats] of Object.entries(SIGNATURES)) {
      if (name === 'generic') continue;
      for (const re of pats) {
        try { if (re.test(code)) { hits.push(name); break; } } catch {}
      }
    }
    return hits.length ? hits : ['generic'];
  } catch { return ['generic']; }
}

function decodeHex(code) {
  return code.replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => {
    try { return String.fromCharCode(parseInt(h, 16)); } catch { return _; }
  });
}

function decodeDec(code) {
  return code.replace(/\\(\d{1,3})(?!\d)/g, (m, d) => {
    try {
      const n = parseInt(d, 10);
      return n >= 0 && n <= 255 ? String.fromCharCode(n) : m;
    } catch { return m; }
  });
}

function decodeUniBrace(code) {
  return code.replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, h) => {
    try {
      const n = parseInt(h, 16);
      return n >= 0 && n <= 0x10FFFF ? String.fromCodePoint(n) : _;
    } catch { return _; }
  });
}

function decodeUni(code) {
  return code.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => {
    try { return String.fromCharCode(parseInt(h, 16)); } catch { return _; }
  });
}

function decodeCommon(code) {
  return code
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '\r')
    .replace(/\\a/g, '\x07')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f')
    .replace(/\\v/g, '\v');
}

function decodeStringChar(code) {
  return code.replace(/string\.char\((\s*\d+(?:\s*,\s*\d+)*\s*)\)/g, (_, nums) => {
    try {
      const codes = nums.split(',').map(n => parseInt(n.trim(), 10));
      const s = codes.map(c => String.fromCharCode(c)).join('');
      return JSON.stringify(s);
    } catch { return `string.char(${nums})`; }
  });
}

function foldConcat(code) {
  const patterns = [
    [/"((?:[^"\\]|\\.)*)"\s*\.\.\s*"((?:[^"\\]|\\.)*)"/g, (_, a, b) => '"' + a + b + '"'],
    [/'((?:[^'\\]|\\.)*)'\s*\.\.\s*'((?:[^'\\]|\\.)*)'/g, (_, a, b) => "'" + a + b + "'"],
  ];
  let prev;
  let iter = 0;
  do {
    prev = code;
    for (const [re, fn] of patterns) code = code.replace(re, fn);
    iter++;
  } while (code !== prev && iter < 50);
  return code;
}

function normalizeNumbers(code) {
  return code
    .replace(/\b0x([0-9a-fA-F]+)\b/g, (_, h) => String(parseInt(h, 16)))
    .replace(/\b0b([01]+)\b/g, (_, b) => String(parseInt(b, 2)));
}

function stripNoOps(code) {
  return code
    .replace(/\blocal\s+_ENV\s*=\s*_ENV\s*;?/g, '')
    .replace(/\blocal\s+_ENV\s*=\s*_G\s*;?/g, '')
    .replace(/\breturn\s*\(\s*function/g, 'return function');
}

function extractStrings(code) {
  try {
    const set = new Set();
    const re = /"((?:[^"\\]|\\.){4,200})"|'((?:[^'\\]|\\.){4,200})'/g;
    let m;
    let count = 0;
    while ((m = re.exec(code)) && count < 500) {
      count++;
      const s = m[1] || m[2];
      if (/^[\x20-\x7e]{4,}$/.test(s) && !/^[A-Za-z0-9+/=]{60,}$/.test(s)) set.add(s);
    }
    return [...set].slice(0, 60);
  } catch { return []; }
}

// Safe tokenizer + pretty printer
function prettyPrint(code) {
  try {
    // Split on Lua keywords, brackets, comment
    const TOKEN = /(\b(?:local|function|end|then|else|elseif|do|while|for|repeat|until|return|break|if|in|and|or|not|nil|true|false)\b|[{}()\[\]]|,|;|--[^\n]*)/g;
    const parts = code.split(TOKEN);
    let out = '';
    let indent = 0;
    let lineStart = true;

    const pad = () => lineStart ? '  '.repeat(indent) : '';
    const newline = () => {
      out = out.replace(/[ \t]+$/, '') + '\n';
      lineStart = true;
    };
    const emit = (s, sp = true) => {
      if (!s) return;
      if (lineStart) {
        out += pad();
        lineStart = false;
      } else if (sp && out && !/[\s\n]$/.test(out)) {
        out += ' ';
      }
      out += s;
    };

    for (let i = 0; i < parts.length; i++) {
      const t = parts[i];
      if (!t) continue;
      const tt = t.trim();
      if (!tt) continue;

      if (tt.startsWith('--')) { emit(tt, false); newline(); continue; }

      if (tt === '{' || tt === '(' || tt === '[') {
        emit(tt, false);
        indent++;
        continue;
      }

      if (tt === '}' || tt === ')' || tt === ']') {
        indent = Math.max(0, indent - 1);
        emit(tt, false);
        continue;
      }

      if (tt === 'end' || tt === 'until') {
        indent = Math.max(0, indent - 1);
        emit(tt, true);
        continue;
      }

      if (tt === 'then' || tt === 'do' || tt === 'else' || tt === 'repeat') {
        emit(tt, true);
        indent++;
        continue;
      }

      if (tt === ';') { emit(';', false); newline(); continue; }
      if (tt === ',') { emit(',', false); continue; }

      emit(tt, true);
    }

    return out.replace(/\n{3,}/g, '\n\n').trim();
  } catch (e) {
    // Fallback: return original if pretty printer fails
    return code;
  }
}

export default function handler(req, res) {
  // Always set JSON content type
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    let code = req.body?.code ?? req.query?.code;

    if (!code) {
      return res.status(400).json({ error: 'code wajib diisi' });
    }
    if (typeof code !== 'string') {
      return res.status(400).json({ error: 'code harus string' });
    }
    if (code.length > 800000) {
      return res.status(413).json({ error: 'code terlalu besar (max 800KB)' });
    }

    const obfuscators = detect(code);
    const steps = [];
    let work = code;

    const run = (label, fn) => {
      try {
        const before = work;
        work = fn(work);
        steps.push({ pass: label, changed: work !== before, size: work.length });
      } catch (e) {
        steps.push({ pass: label, error: e.message });
      }
    };

    run('decode \\xNN hex', decodeHex);
    run('decode \\ddd decimal', decodeDec);
    run('decode \\u{XXXX}', decodeUniBrace);
    run('decode \\uXXXX', decodeUni);
    run('decode common escapes', decodeCommon);
    run('decode string.char()', decodeStringChar);
    run('fold string concat', foldConcat);
    run('normalize numbers', normalizeNumbers);
    run('strip no-op wrappers', stripNoOps);

    const strings = extractStrings(work);
    const pretty = prettyPrint(work);

    return res.status(200).json({
      ok: true,
      obfuscators,
      primary: obfuscators[0],
      steps_applied: steps,
      stats: {
        input_size: code.length,
        output_size: pretty.length,
        lines: pretty.split('\n').length,
        strings_extracted: strings.length,
      },
      strings_found: strings,
      code: pretty,
    });
  } catch (err) {
    // Last line of defense — always return valid JSON
    return res.status(500).json({
      ok: false,
      error: err?.message || 'unknown error',
      stack: String(err?.stack || '').slice(0, 2000),
    });
  }
}
