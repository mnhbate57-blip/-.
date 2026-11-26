(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var key = '', data = null;

  function store(k, v) { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) {} }
  function load(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function money(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '₮'; }
  function pad(n) { return String(n).padStart(2, '0'); }
  function fmt(ts) { if (!ts) return ''; var d = new Date(ts); return d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function setStatus(id, msg, kind) { var s = $(id); s.textContent = msg; s.className = 'status' + (kind ? ' ' + kind : ''); }

  function fetchOrders() {
    return fetch('/api/admin/orders', { headers: { 'x-admin-key': key }, cache: 'no-store' }).then(function (r) {
      if (r.status === 401) throw new Error('bad');
      if (r.status === 429) throw new Error('slow');
      if (!r.ok) throw new Error('fail');
      return r.json();
    });
  }

  function showLogin(msg) {
    key = ''; data = null; store('ss_admin', null);
    $('dash').hidden = true; $('login').hidden = false; $('logout').hidden = true;
    setStatus('login-status', msg || '', msg ? 'bad' : '');
    $('key').value = '';
  }

  function stat(k, v, hot) {
    var s = el('div', 'stat' + (hot ? ' hot' : ''));
    s.appendChild(el('span', 'k', k));
    s.appendChild(el('span', 'v', v));
    return s;
  }

  function render() {
    var rows = data.orders;
    var paid = rows.filter(function (r) { return r.status === 'paid'; });
    var premium = rows.filter(function (r) { return r.plan === 'premium'; });
    var pending = rows.filter(function (r) { return r.status !== 'paid'; });
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var todayN = rows.filter(function (r) { return r.createdAt >= today.getTime(); }).length;
    var st = $('stats'); st.textContent = '';
    st.appendChild(stat('Орлого', money(data.revenue), true));
    st.appendChild(stat('Нийт карт', String(rows.length)));
    st.appendChild(stat('Өнөөдөр', String(todayN)));
    st.appendChild(stat('Premium', String(premium.length)));
    st.appendChild(stat('Үнэгүй', String(rows.length - premium.length)));
    st.appendChild(stat('Хүлээгдэж буй', String(pending.length)));
    renderRows();
    renderBoxes();
  }

  function filtered() {
    var q = $('q').value.trim().toLowerCase(), fp = $('f-plan').value, fs = $('f-status').value;
    return data.orders.filter(function (r) {
      if (fp && r.plan !== fp) return false;
      if (fs === 'paid' && r.status !== 'paid') return false;
      if (fs === 'pending' && r.status === 'paid') return false;
      if (q && (String(r.to) + ' ' + String(r.from)).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }

  var TYPE_NAMES = { love: 'Хайр', bday: 'Төрсөн өдөр', letter: 'Захидал', cheers: 'Баяр хүргэе', thanks: 'Талархал', night: 'Шөнийн мэнд', sunny: 'Нартай мэнд', gift: 'Бэлэг', tsagaan: 'Цагаан сар', newyear: 'Шинэ жил', wedding: 'Хурим', graduation: 'Төгсөлт', mother: 'Ээж', friend: 'Найз', getwell: 'Эдгэрэлт', baby: 'Шинэ хүүхэд' };
  function renderBoxes() {
    var body = $('boxes'); body.textContent = '';
    (data.mailboxes || []).forEach(function (b) {
      var tr = el('tr');
      tr.appendChild(el('td', '', fmt(b.createdAt)));
      tr.appendChild(el('td', 'wrapcell', b.name));
      tr.appendChild(el('td', 'num', String(b.messages)));
      tr.appendChild(el('td', 'num', String(b.withPictures)));
      body.appendChild(tr);
    });
  }

  function renderRows() {
    var list = filtered(), body = $('rows'); body.textContent = '';
    list.forEach(function (r) {
      var tr = el('tr');
      tr.appendChild(el('td', '', fmt(r.createdAt)));
      tr.appendChild(el('td', 'wrapcell', r.to));
      tr.appendChild(el('td', 'wrapcell', r.from));
      tr.appendChild(el('td', '', (TYPE_NAMES[r.type] || '') + (r.mailbox ? ' (хайрцаг)' : '')));
      tr.appendChild(el('td', '', r.images ? String(r.images) : '-'));
      var tp = el('td'); tp.appendChild(el('span', 'tag ' + (r.plan === 'premium' ? 'premium' : ''), r.plan === 'premium' ? 'Premium' : 'Үнэгүй')); tr.appendChild(tp);
      var ts = el('td'); ts.appendChild(el('span', 'tag ' + (r.status === 'paid' ? 'paid' : 'pending'), r.status === 'paid' ? 'Бэлэн' : 'Хүлээгдэж буй')); tr.appendChild(ts);
      tr.appendChild(el('td', 'num', r.status === 'paid' ? money(r.paidAmount) : money(r.amount)));
      body.appendChild(tr);
    });
    $('count-note').textContent = list.length + ' мөр' + (data.orders.length >= 500 ? ' (сүүлийн 500 захиалга)' : '');
  }

  function open(first) {
    setStatus('dash-status', 'Ачаалж байна…', '');
    fetchOrders().then(function (d) {
      data = d; store('ss_admin', key);
      $('login').hidden = true; $('dash').hidden = false; $('logout').hidden = false;
      setStatus('dash-status', '', '');
      render();
    }).catch(function (e) {
      if (e.message === 'bad') showLogin(first ? 'Түлхүүр буруу байна.' : 'Нэвтрэх хугацаа дууссан. Дахин оруулна уу.');
      else if (e.message === 'slow') showLogin('Хэт олон буруу оролдлого. 10 минут хүлээнэ үү.');
      else { setStatus('login-status', 'Сервертэй холбогдож чадсангүй.', 'bad'); setStatus('dash-status', 'Шинэчилж чадсангүй.', 'bad'); }
    });
  }

  $('login-form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var v = $('key').value.trim();
    if (!v) { setStatus('login-status', 'Түлхүүрээ оруулна уу.', 'bad'); return; }
    key = v; setStatus('login-status', 'Шалгаж байна…', ''); open(true);
  });
  $('logout').addEventListener('click', function () { showLogin(''); });
  $('refresh').addEventListener('click', function () { open(false); });
  ['q', 'f-plan', 'f-status'].forEach(function (id) { $(id).addEventListener('input', function () { if (data) renderRows(); }); });

  // CSV for a spreadsheet. Cells that start with = + - @ are neutralised so a name cannot run as a formula.
  function cell(v) {
    var s = String(v == null ? '' : v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }
  $('csv').addEventListener('click', function () {
    if (!data) return;
    var lines = [['Огноо', 'Хэнд', 'Хэнээс', 'Загвар', 'Зураг', 'Төрөл', 'Төлөв', 'Дүн'].map(cell).join(',')];
    filtered().forEach(function (r) {
      lines.push([fmt(r.createdAt), r.to, r.from, r.type, r.images, r.plan, r.status, r.status === 'paid' ? r.paidAmount : r.amount].map(cell).join(','));
    });
    var a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent('﻿' + lines.join('\r\n'));
    a.download = 'zahialga.csv';
    document.body.appendChild(a); a.click(); a.remove();
  });

  var saved = load('ss_admin');
  if (saved) { key = saved; open(false); }
})();
