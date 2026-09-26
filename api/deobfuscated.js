// language: JavaScript, file: api/deobfuscate.js
// Deobfuscator Lua — Luraph, Moonsec, WeAreDevs, IronBrew, generic
import luaparse from 'luaparse';

const SIGS = {
  luraph: [/Luraph/i, /LPH_/i, /\bLPH\b/i, /luraph\.io/i, /^--\[\[ Luraph/i],
  moonsec: [/moonsec/i, /MoonSec/i, /\bV\d+_/i, /moonloader/i],
  wearedevs: [/wearedevs/i, /WeAreDevs/i, /wearedevs\.net/i],
  ironbrew: [/IronBrew/i, /ironbrew/i, /\bIB2\b/i],
  prometheus: [/Prometheus/i, /prometheus/i],
  generic: [],
};

function detect(code) {
  const hits = [];
  for (const [name, patterns] of Object.entries(SIGS)) {
    if (name === 'generic') continue;
    if (patterns.some(re => re.test(code))) hits.push(name);
  }
  return hits.length ? hits : ['generic'];
}

// Pass 1: decode \xNN hex escapes in string literals
function decodeHexEscapes(code) {
  return code.replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

// Pass 2: decode \ddd decimal escapes
function decodeDecEscapes(code) {
  return code.replace(/\\(\d{1,3})/g, (_, d) => {
    const n = parseInt(d, 10);
    return n >= 0 && n <= 255 ? String.fromCharCode(n) : _;
  });
}

// Pass 3: collapse string concatenation of literals: "a" .. "b" → "ab"
function foldStringConcat(code) {
  let prev;
  do {
    prev = code;
    code = code.replace(/"((?:[^"\\]|\\.)*)"\s*\.\.\s*"((?:[^"\\]|\\.)*)"/g, '"$1$2"');
    code = code.replace(/'((?:[^'\\]|\\.)*)'\s*\.\.\s*'((?:[^'\\]|\\.)*)'/g, "'$1$2'");
  } while (code !== prev);
  return code;
}

// Pass 4: hex → decimal, binary → decimal
function normalizeNumbers(code) {
  return code
    .replace(/\b0x([0-9a-fA-F]+)\b/g, (_, h) => String(parseInt(h, 16)))
    .replace(/\b0b([01]+)\b/g, (_, b) => String(parseInt(b, 2)));
}

// Pass 5: remove common no-op patterns
function stripWrappers(code) {
  // local _ENV = _ENV;  → remove
  code = code.replace(/local\s+_ENV\s*=\s*_ENV\s*;?/g, '');
  // return(function(...) ... end)(...)  → unwrap the outer call structure
  code = code.replace(/return\s*\(\s*function\s*\(([^)]*)\)/g, 'return function($1)');
  return code;
}

// Pass 6: extract printable strings for report
function extractStrings(code) {
  const out = new Set();
  const re = /"((?:[^"\\]|\\.){4,200})"|'((?:[^'\\]|\\.){4,200})'/g;
  let m;
  while ((m = re.exec(code))) {
    const s = m[1] || m[2];
    if (/^[\x20-\x7e]{4,}$/.test(s)) out.add(s);
  }
  return [...out].slice(0, 100);
}

// Pass 7: try to parse with luaparse → beautify
function tryBeautify(code) {
  try {
    const ast = luaparse.parse(code, { luaVersion: '5.1', comments: false, scope: false, locations: false });
    // luaparse doesn't output pretty text; use structured hints
    return { parsed: true, stats: countNodes(ast) };
  } catch (e) {
    return { parsed: false, error: e.message };
  }
}

function countNodes(node, counter = { total: 0, calls: 0, strings: 0, funcs: 0 }) {
  if (!node || typeof node !== 'object') return counter;
  if (Array.isArray(node)) {
    for (const n of node) countNodes(n, counter);
    return counter;
  }
  counter.total++;
  if (node.type === 'CallExpression') counter.calls++;
  if (node.type === 'StringLiteral') counter.strings++;
  if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') counter.funcs++;
  for (const key in node) {
    if (key === 'type') continue;
    const v = node[key];
    if (v && typeof v === 'object') countNodes(v, counter);
  }
  return counter;
}

// Basic pretty-printer — indents by {, (, then, do, else; dedents by }, ), end, until
function prettyPrint(code) {
  const tokens = code.split(/(\b(?:function|then|do|else|elseif|end|until|repeat|return|local|if|for|while)\b|[{}()\[\]]|;)/);
  let out = '';
  let indent = 0;
  const pad = () => '  '.repeat(Math.max(0, indent));
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!t) continue;
    if (/^(end|until|\}|\)|\])$/.test(t)) {
      indent = Math.max(0, indent - 1);
      out = out.replace(/\s+$/, '') + '\n' + pad() + t;
      continue;
    }
    if (/^(function|then|do|else|repeat|\{|\(|\[)$/.test(t)) {
      out += (out.endsWith(' ') || out.endsWith('\n') || out === '' ? '' : ' ') + t;
      indent++;
      continue;
    }
    out += t;
  }
  return out;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const code = req.body?.code || req.query?.code;
  if (!code) return res.status(400).json({ error: 'code wajib' });
  if (code.length > 500000) return res.status(413).json({ error: 'code terlalu besar (max 500KB)' });

  const detected = detect(code);
  const steps = [];
  let work = code;

  work = decodeHexEscapes(work);
  steps.push('decode \\xNN hex escapes');
  work = decodeDecEscapes(work);
  steps.push('decode \\ddd decimal escapes');
  work = foldStringConcat(work);
  steps.push('fold string concat ("a" .. "b" -> "ab")');
  work = normalizeNumbers(work);
  steps.push('normalize hex/binary numbers');
  work = stripWrappers(work);
  steps.push('strip wrapper no-ops');

  const strings = extractStrings(work);
  const parse = tryBeautify(work);
  const pretty = prettyPrint(work);

  res.json({
    obfuscators: detected,
    primary: detected[0],
    steps_applied: steps,
    stats: {
      input_size: code.length,
      output_size: pretty.length,
      parseable: parse.parsed,
      parse_error: parse.error || null,
      ast: parse.stats || null,
    },
    strings_found: strings,
    code: pretty,
    original_hex_dump: work === code ? null : 'modifications applied',
  });
}
