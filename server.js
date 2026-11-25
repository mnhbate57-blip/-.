'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const config = require('./config');
const createStore = require('./store');
const provider = config.provider === 'qpay' ? require('./providers/qpay') : require('./providers/mock');

if (config.provider === 'qpay' && !(config.qpay.username && config.qpay.password && config.qpay.invoiceCode)) {
  console.error('PAYMENT_PROVIDER=qpay needs QPAY_USERNAME, QPAY_PASSWORD and QPAY_INVOICE_CODE.');
  process.exit(1);
}
if (config.isProd && config.provider === 'qpay' && !/^https:\/\//.test(config.baseUrl)) {
  console.error('BASE_URL must be an https address in production, QPay calls it back.');
  process.exit(1);
}

const store = createStore(config.dataFile);

/* ---------- card validation: the browser is never trusted ---------- */
const TYPES = ['love', 'bday', 'letter', 'cheers', 'thanks', 'night', 'sunny', 'gift'];
const PATTERNS = ['none', 'confetti', 'dots', 'stripes', 'waves', 'hearts', 'stars', 'lines'];
const FONTS = ['hand', 'serif', 'sans', 'round', 'bold'];
const MOTIFS = ['none', 'heart', 'cake', 'envelope', 'star', 'flower', 'balloon', 'sun', 'moon', 'gift'];

// What the free plan gets: the template's own look. The server applies it, so the browser cannot ask for more.
const FREE_STYLE = {
  love:   { c: ['#8e1b4a', '#d6456f', '#fff3f7'], pattern: 'hearts',   font: 'hand',  motif: 'heart',    align: 'left' },
  bday:   { c: ['#f2b134', '#f07a3c', '#3a1d05'], pattern: 'confetti', font: 'hand',  motif: 'cake',     align: 'left' },
  letter: { c: ['#eaf0f9', '#d8e2f2', '#1d2b4a'], pattern: 'lines',    font: 'hand',  motif: 'envelope', align: 'left' },
  cheers: { c: ['#1e6b52', '#3aa07d', '#effaf4'], pattern: 'stars',    font: 'round', motif: 'star',     align: 'center' },
  thanks: { c: ['#5a3d8a', '#8f6fc7', '#f6f0ff'], pattern: 'dots',     font: 'serif', motif: 'flower',   align: 'center' },
  night:  { c: ['#141a3a', '#3b3f8f', '#eef0ff'], pattern: 'stars',    font: 'serif', motif: 'moon',     align: 'center' },
  sunny:  { c: ['#7a5a12', '#d9a93a', '#fff8e6'], pattern: 'waves',    font: 'bold',  motif: 'sun',      align: 'left' },
  gift:   { c: ['#e2574c', '#f2955c', '#fff5f0'], pattern: 'stripes',  font: 'sans',  motif: 'gift',     align: 'center' }
};
const FREE_MESSAGE_MAX = 300;

function validateCard(b, plan) {
  if (!b || typeof b !== 'object') return null;
  const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const to = str(b.to, 60);
  const from = str(b.from, 60) || 'Нэргүй';
  const message = str(b.message, plan === 'premium' ? 600 : FREE_MESSAGE_MAX);
  if (!to || !message) return null;
  const pick = (v, list, d) => (list.includes(v) ? v : d);
  const hex = (v, d) => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : d);
  const type = pick(b.type, TYPES, 'love');
  if (plan !== 'premium') {
    const f = FREE_STYLE[type];
    return { plan: 'free', type, c1: f.c[0], c2: f.c[1], ink: f.c[2], pattern: f.pattern, font: f.font, motif: f.motif, align: f.align, to, from, message };
  }
  return {
    plan: 'premium',
    type,
    c1: hex(b.c1, '#8e1b4a'),
    c2: hex(b.c2, '#d6456f'),
    ink: hex(b.ink, '#fff3f7'),
    pattern: pick(b.pattern, PATTERNS, 'none'),
    font: pick(b.font, FONTS, 'hand'),
    motif: pick(b.motif, MOTIFS, 'heart'),
    align: b.align === 'center' ? 'center' : 'left',
    to, from, message
  };
}

/* Up to 3 JPEG pictures per card. The browser shrinks them first; the server still checks every byte count. */
const MEDIA_DIR = path.join(path.dirname(config.dataFile), 'media');
const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 450 * 1024;

function validateImages(list) {
  if (list == null) return [];
  if (!Array.isArray(list) || list.length > MAX_IMAGES) return null;
  const out = [];
  for (const s of list) {
    const m = typeof s === 'string' && /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(s);
    if (!m) return null;
    const buf = Buffer.from(m[1], 'base64');
    if (buf.length < 200 || buf.length > MAX_IMAGE_BYTES) return null;
    if (!(buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)) return null;
    out.push(buf);
  }
  return out;
}

function isFree() { return config.freeUntil > 0 && Date.now() <= config.freeUntil; }

/* ---------- small helpers ---------- */
function send(res, status, body, headers) {
  const isJson = typeof body === 'object' && !Buffer.isBuffer(body);
  const payload = isJson ? JSON.stringify(body) : body;
  res.writeHead(status, Object.assign({
    'Content-Type': isJson ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store'
  }, headers || {}));
  res.end(payload);
}

function readJson(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(Object.assign(new Error('too large'), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || 'null')); }
      catch (e) { reject(Object.assign(new Error('bad json'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

function clientIp(req) {
  if (config.trustProxy) {
    const xff = req.headers['x-forwarded-for'];
    if (typeof xff === 'string' && xff) return xff.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

const hits = new Map();
function rateLimited(ip, max, windowMs) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) { hits.set(ip, arr); return true; }
  arr.push(now);
  hits.set(ip, arr);
  return false;
}
setInterval(() => { const now = Date.now(); hits.forEach((arr, ip) => { if (!arr.some((t) => now - t < 3600e3)) hits.delete(ip); }); }, 600e3).unref();

// Wrong admin keys are counted per IP so the key cannot be guessed by trying again and again.
const adminFails = new Map();
function adminBlocked(ip) {
  const now = Date.now();
  const arr = (adminFails.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  adminFails.set(ip, arr);
  return arr.length >= 8;
}
function adminFailed(ip) { const arr = adminFails.get(ip) || []; arr.push(Date.now()); adminFails.set(ip, arr); }

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/* ---------- payment state ---------- */
const inflight = new Set();

async function markPaid(order, result) {
  if (order.status === 'paid') return;
  order.status = 'paid';
  order.paidAt = Date.now();
  order.paidAmount = result.paidAmount;
  await store.put(order);
  console.log('order paid', order.id, result.paidAmount);
}

// Ask the provider if the order is paid. Throttled so polling cannot flood the provider.
async function refresh(order, force) {
  if (order.status === 'paid') return order;
  const now = Date.now();
  if (!force && now - (order.lastCheck || 0) < 2500) return order;
  if (inflight.has(order.id)) return order;
  inflight.add(order.id);
  order.lastCheck = now;
  try {
    const r = await provider.checkPayment(order);
    if (r && r.paid && r.paidAmount >= order.amount) await markPaid(order, r);
  } catch (e) {
    console.error('payment check failed', order.id, e.message);
  } finally {
    inflight.delete(order.id);
  }
  return order;
}

function publicOrder(order) {
  const out = { id: order.id, status: order.status, amount: order.amount };
  if (order.status === 'paid') out.cardId = order.cardId;
  else if (Date.now() - order.createdAt > 30 * 60 * 1000) out.status = 'expired';
  return out;
}

/* ---------- static files ---------- */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon'
};
const PUBLIC = path.join(__dirname, 'public');
const SECURITY = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer'
};

// Public address used in share-preview tags. BASE_URL wins; otherwise the request's own host (validated).
function originOf(req) {
  if (process.env.BASE_URL) return config.baseUrl;
  const host = String((req && req.headers.host) || '');
  if (!/^[a-z0-9.-]+(:\d{1,5})?$/i.test(host)) return config.baseUrl;
  const proto = config.trustProxy && req.headers['x-forwarded-proto'] === 'https' ? 'https' : (req.socket && req.socket.encrypted ? 'https' : 'http');
  return proto + '://' + host;
}

function serveStatic(res, rel, req) {
  const file = path.normalize(path.join(PUBLIC, rel));
  if (file !== PUBLIC && !file.startsWith(PUBLIC + path.sep)) return send(res, 404, 'Not found');
  fs.readFile(file, (err, buf) => {
    if (err) return send(res, 404, 'Not found');
    const type = MIME[path.extname(file)] || 'application/octet-stream';
    if (type.startsWith('text/html')) buf = Buffer.from(buf.toString('utf8').replace(/__ORIGIN__/g, originOf(req)), 'utf8');
    res.writeHead(200, Object.assign({ 'Content-Type': type, 'Cache-Control': /^(text\/html|text\/css|text\/javascript)/.test(type) ? 'no-cache' : 'public, max-age=300' }, SECURITY));
    res.end(buf);
  });
}

/* ---------- routes ---------- */
async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  const m = req.method;

  if (m === 'GET' && p === '/api/config') {
    return send(res, 200, { price: config.price, free: isFree(), freeUntil: isFree() ? config.freeUntilText : '', mock: provider.name === 'mock' && !config.isProd });
  }

  if (m === 'POST' && p === '/api/orders') {
    if (rateLimited(clientIp(req), 10, 10 * 60 * 1000)) return send(res, 429, { error: 'Хэт олон хүсэлт илгээлээ. Түр хүлээгээд дахин оролдоно уу.' });
    let body;
    try { body = await readJson(req, 2 * 1024 * 1024); } catch (e) { return send(res, e.status || 400, { error: 'Хүсэлт буруу эсвэл хэт том байна.' }); }
    const plan = body && body.plan === 'premium' ? 'premium' : 'free';
    const card = validateCard(body && body.card, plan);
    if (!card) return send(res, 400, { error: 'Хэнд, зурвас хоёрыг заавал бичнэ үү.' });
    const images = plan === 'premium' ? validateImages(body.images) : [];
    if (!images) return send(res, 400, { error: 'Зураг буруу байна. 3 хүртэл JPG зураг оруулна уу.' });
    const orderId = crypto.randomBytes(12).toString('hex');
    const cardId = crypto.randomBytes(16).toString('hex');
    if (images.length) {
      try {
        await fs.promises.mkdir(MEDIA_DIR, { recursive: true });
        await Promise.all(images.map((buf, i) => fs.promises.writeFile(path.join(MEDIA_DIR, cardId + '-' + i + '.jpg'), buf)));
      } catch (e) {
        console.error('image save failed', e.message);
        return send(res, 500, { error: 'Зураг хадгалж чадсангүй.' });
      }
    }
    if (plan === 'free' || isFree()) {
      // Free plan, or a free promotion on premium: no invoice, the card is ready at once. The price is still decided only here on the server.
      const freeOrder = {
        id: orderId, cardId, status: 'paid', amount: 0, card, images: images.length,
        invoiceId: 'free', createdAt: Date.now(), paidAt: Date.now(), paidAmount: 0, lastCheck: 0
      };
      await store.put(freeOrder);
      return send(res, 201, { id: orderId, status: 'paid', cardId, amount: 0 });
    }
    let invoice;
    try {
      invoice = await provider.createInvoice({ orderId, amount: config.price, description: 'Setgeliin shuudan mendchilgee' });
    } catch (e) {
      console.error('invoice failed', e.message);
      return send(res, 502, { error: 'Төлбөрийн нэхэмжлэх үүсгэж чадсангүй. Түр хүлээгээд дахин оролдоно уу.' });
    }
    const order = {
      id: orderId, cardId, status: 'pending', amount: config.price, card, images: images.length,
      invoiceId: invoice.invoiceId, createdAt: Date.now(), lastCheck: 0
    };
    await store.put(order);
    return send(res, 201, { id: orderId, amount: order.amount, qrSrc: invoice.qrSrc, links: invoice.links, status: 'pending' });
  }

  let mm;
  if (m === 'GET' && (mm = /^\/api\/orders\/([a-f0-9]{24})$/.exec(p))) {
    const order = store.get(mm[1]);
    if (!order) return send(res, 404, { error: 'Захиалга олдсонгүй.' });
    await refresh(order, false);
    return send(res, 200, publicOrder(order));
  }

  // QPay calls this when someone pays. The body is ignored. We ask QPay directly.
  if ((m === 'GET' || m === 'POST') && p === '/api/payments/callback') {
    const id = url.searchParams.get('order') || '';
    const order = /^[a-f0-9]{24}$/.test(id) ? store.get(id) : null;
    if (!order) return send(res, 404, 'order not found');
    await refresh(order, true);
    return send(res, 200, 'SUCCESS');
  }

  if (m === 'POST' && (mm = /^\/api\/mock\/pay\/([a-f0-9]{24})$/.exec(p))) {
    if (provider.name !== 'mock' || config.isProd) return send(res, 404, { error: 'Not found' });
    const order = store.get(mm[1]);
    if (!order) return send(res, 404, { error: 'Захиалга олдсонгүй.' });
    provider.simulatePay(order.id);
    await refresh(order, true);
    return send(res, 200, publicOrder(order));
  }

  // A card is shown only after its order is paid. The 32-hex card id is unguessable.
  if (m === 'GET' && (mm = /^\/api\/cards\/([a-f0-9]{32})$/.exec(p))) {
    const order = store.getByCard(mm[1]);
    if (!order || order.status !== 'paid') return send(res, 404, { error: 'Мэндчилгээ олдсонгүй.' });
    return send(res, 200, Object.assign({}, order.card, { createdAt: order.paidAt, images: order.images || 0 }));
  }

  if (m === 'GET' && (mm = /^\/api\/cards\/([a-f0-9]{32})\/img\/([0-2])$/.exec(p))) {
    const order = store.getByCard(mm[1]);
    if (!order || order.status !== 'paid' || Number(mm[2]) >= (order.images || 0)) return send(res, 404, { error: 'Not found' });
    return fs.readFile(path.join(MEDIA_DIR, mm[1] + '-' + mm[2] + '.jpg'), (err, buf) => {
      if (err) return send(res, 404, { error: 'Not found' });
      res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff' });
      res.end(buf);
    });
  }

  if (m === 'GET' && p === '/api/admin/orders') {
    const ip = clientIp(req);
    if (adminBlocked(ip)) return send(res, 429, { error: 'Too many attempts' });
    const key = req.headers['x-admin-key'];
    if (!config.adminKey || typeof key !== 'string' || !safeEqual(key, config.adminKey)) { adminFailed(ip); return send(res, 401, { error: 'Unauthorized' }); }
    const rows = store.all().sort((a, b) => b.createdAt - a.createdAt).slice(0, 500).map((o) => ({
      id: o.id, status: o.status, amount: o.amount, paidAmount: o.paidAmount || 0,
      createdAt: o.createdAt, paidAt: o.paidAt || null, plan: o.card.plan || 'premium', to: o.card.to, from: o.card.from
    }));
    const revenue = rows.filter((r) => r.status === 'paid').reduce((s, r) => s + r.paidAmount, 0);
    return send(res, 200, { revenue, orders: rows });
  }

  if (m === 'GET' || m === 'HEAD') {
    if (p === '/') return serveStatic(res, 'index.html', req);
    if (p === '/admin') return serveStatic(res, 'admin.html', req);
    if (/^\/c\/[a-f0-9]{32}$/.test(p)) return serveStatic(res, 'card.html', req);
    if (p.startsWith('/api/')) return send(res, 404, { error: 'Not found' });
    let rel;
    try { rel = decodeURIComponent(p).replace(/^\/+/, ''); } catch (e) { return send(res, 400, 'Bad request'); }
    return serveStatic(res, rel, req);
  }

  return send(res, 405, { error: 'Method not allowed' });
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((e) => {
    console.error('unhandled', e);
    if (!res.headersSent) send(res, 500, { error: 'Серверийн алдаа.' });
    else res.end();
  });
});

if (require.main === module) {
  server.listen(config.port, () => {
    console.log('Setgeliin shuudan on :' + config.port + ' provider=' + provider.name + ' price=' + config.price);
    if (!config.adminKey) console.log('ADMIN_KEY is empty: the admin orders list is disabled.');
  });
}

module.exports = server;
