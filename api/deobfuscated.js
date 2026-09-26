// language: JavaScript, file: api/deobfuscate.js
// Lua Deobfuscator — Luraph, Moonsec, WeAreDevs, IronBrew, Ares, generic

const SIGNATURES = {
  luraph: [/Luraph/i, /\bLPH\b/i, /LPH_/i, /luraph\.io/i, /LPH_[A-Z0-9]{4,}/],
  moonsec: [/MoonSec/i, /\bV\d{1,3}_[A-Z0-9]/i, /moonsec\.com/i, /getscript\.net.*moon/i],
  wearedevs: [/wearedevs/i, /WeAreDevs/i, /wearedevs\.net/i, /\bWRD\b/],
  ironbrew: [/IronBrew/i, /\bIB2?\b/, /ironbrew/i],
  ares: [/Ares/i, /ares\.gg/i],
  prometheus: [/Prometheus/i],
  generic: [],
};

function detect(code) {
  const hits = [];
  for (const [name, pats] of Object.entries(SIGNATURES)) {
    if (name === 'generic') continue;
    if (pats.some(re => re.test(code))) hits.push(name);
  }
  return hits.length ? hits : ['generic'];
}

// pass 1: decode \xNN
function decodeHex(code) {
  return code.replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

// pass 2: decode \ddd
function decodeDec(code) {
  return code.replace(/\\(\d{1,3})(?!\d)/g, (m, d) => {
    const n = parseInt(d, 10);
    return n >= 0 && n <= 255 ? String.fromCharCode(n) : m;
  });
}

// pass 3: decode \u{XXXX}
function decodeUniBrace(code) {
  return code.replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, h) => String.fromCodePoint(parseInt(h, 16)));
}

// pass 4: decode \uXXXX
function decodeUni(code) {
  return code.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

// pass 5: common escapes
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

// pass 6: fold string concat
function foldConcat(code) {
  const patterns = [
    [/"((?:[^"\\]|\\.)*)"\s*\.\.\s*"((?:[^"\\]|\\.)*)"/g, (_, a, b) => '"' + a + b + '"'],
    [/'((?:[^'\\]|\\.)*)'\s*\.\.\s*'((?:[^'\\]|\\.)*)'/g, (_, a, b) => "'" + a + b + "'"],
  ];
  let prev;
  do {
    prev = code;
    for (const [re, fn] of patterns) code = code.replace(re, fn);
  } while (code !== prev);
  return code;
}

// pass 7: numbers
function normalizeNumbers(code) {
  return code
    .replace(/\b0x([0-9a-fA-F]+)\b/g, (_, h) => String(parseInt(h, 16)))
    .replace(/\b0b([01]+)\b/g, (_, b) => String(parseInt(b, 2)));
}

// pass 8: string.char(...) → "literal"
function decodeStringChar(code) {
  return code.replace(/string\.char\((\s*\d+(?:\s*,\s*\d+)*\s*)\)/g, (_, nums) => {
    try {
      const codes = nums.split(',').map(n => parseInt(n.trim(), 10));
      const s = codes.map(c => String.fromCharCode(c)).join('');
      return JSON.stringify(s);
    } catch { return `string.char(${nums})`; }
  });
}

// pass 9: strip wrapper no-ops
function stripNoOps(code) {
  return code
    .replace(/\blocal\s+_ENV\s*=\s*_ENV\s*;?/g, '')
    .replace(/\blocal\s+_ENV\s*=\s*_G\s*;?/g, '')
    .replace(/\breturn\s*\(\s*function/g, 'return function');
}

// extract printable strings
function extractStrings(code) {
  const set = new Set();
  const re = /"((?:[^"\\]|\\.){4,200})"|'((?:[^'\\]|\\.){4,200})'/g;
  let m;
  while ((m = re.exec(code))) {
    const s = m[1] || m[2];
    if (/^[\x20-\x7e]{4,}$/.test(s) && !/^[A-Za-z0-9+/=]{60,}$/.test(s)) set.add(s);
  }
  return [...set].slice(0, 60);
}

// token-based pretty printer
function prettyPrint(code) {
  const TOKEN = /(\b(?:local|function|end|then|else|elseif|do|while|for|repeat|until|return|break|if|in)\b|[{}()\[\]]|[;,]|--[^\n]*)/g;
  const parts = code.split(TOKEN).filter(p => p !== undefined && p !== '');
  let out = '';
  let indent = 0;
  let lineStart = true;
  const pad = () => lineStart ? '  '.repeat(indent) : '';
  const newline = () => { out = out.replace(/[ \t]+$/, '') + '\n'; lineStart = true; };
  const emit = (s, sp = true) => {
    if (lineStart) { out += pad(); lineStart = false; }
    else if (sp && out && !/[\s\n]$/.test(out)) out += ' ';
    out += s;
  };

  for (let i = 0; i < parts.length; i++) {
    const t = parts[i];
    const tt = t.trim();
    if (!tt) continue;

    if (tt.startsWith('--')) { emit(tt, false); newline(); continue; }

    if (/^(end|until|\}|\)|\])$/.test(tt)) {
      indent = Math.max(0, indent - 1);
      if (!lineStart) newline();
      emit(tt, false);
      if (i + 1 < parts.length && !/^[,;.)}\]]/.test(parts[i + 1]?.trim() || '')) newline();
      continue;
    }

    if (tt === ',') { emit(',', false); continue; }
    if (tt === ';') { emit(';', false); newline(); continue; }

    if (/^(then|do|else|repeat)$/.test(tt)) {
      emit(tt, true);
      indent++;
      newline();
      continue;
    }

    if (tt === 'function') {
      emit('function', true);
      continue;
    }

    if (/^(local|if|while|for|return|break|elseif|in)$/.test(tt)) {
      emit(tt, true);
      continue;
    }

    if (/^[{}()\[\]]$/.test(tt)) { emit(tt, false); continue; }

    emit(tt, true);
  }

  return out.replace(/\n{3,}/g, '\n\n').trim();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  let code = req.body?.code ?? req.query?.code;
  if (!code) return res.status(400).json({ error: 'code wajib' });
  if (typeof code !== 'string') return res.status(400).json({ error: 'code harus string' });
  if (code.length > 800000) return res.status(413).json({ error: 'code terlalu besar (max 800KB)' });

  try {
    const obfuscators = detect(code);
    const steps = [];
    let work = code;

    const run = (label, fn) => {
      const before = work;
      work = fn(work);
      steps.push({ pass: label, changed: work !== before, size: work.length });
    };

    run('decode \\xNN hex', decodeHex);
    run('decode \\ddd decimal', decodeDec);
    run('decode \\u{XXXX} unicode', decodeUniBrace);
    run('decode \\uXXXX unicode', decodeUni);
    run('decode common escapes', decodeCommon);
    run('decode string.char()', decodeStringChar);
    run('fold string concat', foldConcat);
    run('normalize numbers', normalizeNumbers);
    run('strip no-op wrappers', stripNoOps);

    const strings = extractStrings(work);
    const pretty = prettyPrint(work);

    res.json({
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
    res.status(500).json({ error: err.message, stack: err.stack });
  }
}
