'use strict';
// QPay merchant API v2 client.
// Field names below follow QPay's v2 merchant documentation as we know it. Run it against the
// QPay sandbox first (QPAY_BASE_URL=https://merchant-sandbox.qpay.mn/v2) and compare each response
// with the documentation QPay gave you. If a field name differs, change it in this one file.
const config = require('../config');

const cfg = config.qpay;
let token = null;
let tokenExpiresAt = 0;

async function request(method, urlPath, { body, auth } = {}) {
  const headers = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  headers.Authorization = auth;
  const res = await fetch(cfg.baseUrl + urlPath, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000)
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { /* keep null */ }
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || text.slice(0, 200) || res.statusText;
    const err = new Error('QPay ' + method + ' ' + urlPath + ' failed (' + res.status + '): ' + msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

async function getToken() {
  if (token && Date.now() < tokenExpiresAt - 60 * 1000) return token;
  const basic = Buffer.from(cfg.username + ':' + cfg.password).toString('base64');
  const data = await request('POST', '/auth/token', { auth: 'Basic ' + basic });
  if (!data || !data.access_token) throw new Error('QPay token response has no access_token');
  token = data.access_token;
  // expires_in may be seconds from now or an epoch timestamp in seconds. Handle both.
  const exp = Number(data.expires_in);
  if (exp > 1e9) tokenExpiresAt = exp * 1000;
  else if (exp > 0) tokenExpiresAt = Date.now() + exp * 1000;
  else tokenExpiresAt = Date.now() + 10 * 60 * 1000;
  return token;
}

async function api(method, urlPath, body) {
  const t = await getToken();
  try {
    return await request(method, urlPath, { body, auth: 'Bearer ' + t });
  } catch (e) {
    if (e.status === 401) {
      token = null;
      const t2 = await getToken();
      return request(method, urlPath, { body, auth: 'Bearer ' + t2 });
    }
    throw e;
  }
}

function safeLink(link) {
  // Bank app deep links use custom schemes (khanbank://...). Block anything that can run script.
  return typeof link === 'string' && /^[a-z][a-z0-9+.-]*:\/\//i.test(link) && !/^(javascript|data|vbscript):/i.test(link);
}

module.exports = {
  name: 'qpay',

  async createInvoice({ orderId, amount, description }) {
    const data = await api('POST', '/invoice', {
      invoice_code: cfg.invoiceCode,
      sender_invoice_no: orderId,
      invoice_receiver_code: 'setgeliin-shuudan',
      invoice_description: description,
      amount,
      callback_url: config.baseUrl + '/api/payments/callback?order=' + orderId
    });
    if (!data || !data.invoice_id) throw new Error('QPay invoice response has no invoice_id');
    const links = Array.isArray(data.urls)
      ? data.urls.filter((u) => u && safeLink(u.link)).slice(0, 20).map((u) => ({
          name: String(u.description || u.name || '').slice(0, 60),
          link: u.link
        }))
      : [];
    return {
      invoiceId: data.invoice_id,
      qrSrc: data.qr_image ? 'data:image/png;base64,' + data.qr_image : '',
      links
    };
  },

  // Never trust the callback body. Ask QPay whether the invoice is paid.
  async checkPayment(order) {
    const data = await api('POST', '/payment/check', {
      object_type: 'INVOICE',
      object_id: order.invoiceId,
      offset: { page_number: 1, page_limit: 100 }
    });
    const rows = (data && Array.isArray(data.rows)) ? data.rows : [];
    const paidRows = rows.filter((r) => r && r.payment_status === 'PAID');
    const paidAmount = paidRows.reduce((s, r) => s + (Number(r.payment_amount) || 0), 0);
    return { paid: paidRows.length > 0, paidAmount };
  }
};
