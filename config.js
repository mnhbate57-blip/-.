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
