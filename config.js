'use strict';
const path = require('path');
const env = process.env;

const num = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : d;
};

module.exports = {
  port: num(env.PORT, 3000),
  baseUrl: (env.BASE_URL || 'http://localhost:3000').replace(/\/$/, ''),
  provider: env.PAYMENT_PROVIDER === 'qpay' ? 'qpay' : 'mock',
  price: Math.round(num(env.CARD_PRICE_MNT, 3000)),
  // Free promotion: FREE_UNTIL=2026-12-31 means cards are free through the end of that day (Ulaanbaatar time).
  freeUntilText: /^\d{4}-\d{2}-\d{2}$/.test(env.FREE_UNTIL || '') ? env.FREE_UNTIL : '',
  freeUntil: /^\d{4}-\d{2}-\d{2}$/.test(env.FREE_UNTIL || '') ? Date.parse(env.FREE_UNTIL + 2026.12.31 'T23:59:59+08:00') || 0 : 0,
  adminKey: env.ADMIN_KEY || '',
  trustProxy: env.TRUST_PROXY === '1',
  dataFile: env.DATA_FILE || path.join(__dirname, 'data', 'orders.json'),
  isProd: env.NODE_ENV === 'production',
  qpay: {
    baseUrl: (env.QPAY_BASE_URL || 'https://merchant.qpay.mn/v2').replace(/\/$/, ''),
    username: env.QPAY_USERNAME || '',
    password: env.QPAY_PASSWORD || '',
    invoiceCode: env.QPAY_INVOICE_CODE || ''
  }
};
