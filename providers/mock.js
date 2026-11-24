'use strict';
// Test provider. No real money moves. Payment is simulated by POST /api/mock/pay/:orderId (not in production).
const paid = new Set();

const qr = 'data:image/svg+xml;base64,' + Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220">' +
  '<rect width="220" height="220" fill="#fff"/><rect x="10" y="10" width="200" height="200" fill="none" stroke="#000" stroke-width="4" stroke-dasharray="10 6"/>' +
  '<text x="110" y="105" font-family="sans-serif" font-size="22" text-anchor="middle" fill="#000">TEST QR</text>' +
  '<text x="110" y="132" font-family="sans-serif" font-size="14" text-anchor="middle" fill="#555">mock provider</text></svg>'
).toString('base64');

module.exports = {
  name: 'mock',
  async createInvoice({ orderId }) {
    return { invoiceId: 'mock-' + orderId, qrSrc: qr, links: [] };
  },
  async checkPayment(order) {
    return paid.has(order.id) ? { paid: true, paidAmount: order.amount } : { paid: false, paidAmount: 0 };
  },
  simulatePay(orderId) { paid.add(orderId); }
};
