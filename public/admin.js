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
    renderWeek();
    renderTemplates();
    renderMedia();
  }

  var TABS = ['overview', 'orders', 'templates', 'media', 'boxes-tab'];
  function showTab(name) {
    if (TABS.indexOf(name) < 0) name = 'overview';
    TABS.forEach(function (t) { $('pane-' + t).hidden = t !== name; });
    document.querySelectorAll('.adm-tab').forEach(function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-tab') === name)); });
    store('ss_tab', name);
  }
  document.querySelectorAll('.adm-tab').forEach(function (b) { b.addEventListener('click', function () { showTab(b.getAttribute('data-tab')); }); });

  function bar(label, n, max, note) {
    var row = el('div', 'bar-row');
    row.appendChild(el('span', 'bar-label', label));
    var track = el('span', 'bar-track'), fill = el('span', 'bar-fill');
    fill.style.width = (max ? Math.max(n ? 3 : 0, Math.round(n / max * 100)) : 0) + '%';
    track.appendChild(fill); row.appendChild(track);
    row.appendChild(el('span', 'bar-n', String(n) + (note || '')));
    return row;
  }
  function renderWeek() {
    var box = $('week'); box.textContent = '';
    var days = [], names = ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя'];
    for (var i = 6; i >= 0; i--) { var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i); days.push(d); }
    var counts = days.map(function (d) { var e = d.getTime() + 864e5; return data.orders.filter(function (r) { return r.createdAt >= d.getTime() && r.createdAt < e; }).length; });
    var max = Math.max.apply(null, counts.concat([1]));
    days.forEach(function (d, i) { box.appendChild(bar(names[d.getDay()] + ' ' + pad(d.getMonth() + 1) + '.' + pad(d.getDate()), counts[i], max)); });
  }
  function renderTemplates() {
    var box = $('tpl-bars'); box.textContent = '';
    var c = {};
    data.orders.forEach(function (r) { var k = r.type || 'love'; c[k] = (c[k] || 0) + 1; });
    var keys = Object.keys(TYPE_NAMES).sort(function (a, b) { return (c[b] || 0) - (c[a] || 0); });
    var max = Math.max.apply(null, keys.map(function (k) { return c[k] || 0; }).concat([1]));
    keys.forEach(function (k) { box.appendChild(bar(TYPE_NAMES[k], c[k] || 0, max)); });
  }
  function renderMedia() {
    var withImg = data.orders.filter(function (r) { return r.images > 0; });
    var withVid = data.orders.filter(function (r) { return r.video; });
    var imgTotal = data.orders.reduce(function (s, r) { return s + (r.images || 0); }, 0);
    var st = $('media-stats'); st.textContent = '';
    st.appendChild(stat('Зурагтай карт', String(withImg.length)));
    st.appendChild(stat('Нийт зураг', String(imgTotal)));
    st.appendChild(stat('Видеотой карт', String(withVid.length)));
    var body = $('media-rows'); body.textContent = '';
    data.orders.filter(function (r) { return r.images > 0 || r.video; }).slice(0, 100).forEach(function (r) {
      var tr = el('tr');
      tr.appendChild(el('td', '', fmt(r.createdAt)));
      tr.appendChild(el('td', 'wrapcell', r.to));
      tr.appendChild(el('td', '', TYPE_NAMES[r.type] || ''));
      tr.appendChild(el('td', 'num', String(r.images || 0)));
      tr.appendChild(el('td', '', r.video ? 'Тийм' : '-'));
      body.appendChild(tr);
    });
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

  var TYPE_NAMES = {love: 'Хайрын үг', bday: 'Төрсөн өдрийн мэнд', letter: 'Сэтгэлийн захидал', cheers: 'Баяр хүргэе', thanks: 'Талархлын үг', night: 'Сайхан амраарай', sunny: 'Сайхан өдрийн мэнд', gift: 'Бэлгийн карт', tsagaan: 'Цагаан сарын мэнд', newyear: 'Шинэ жилийн мэнд', wedding: 'Аз жаргал хүсье', graduation: 'Төгсөлтийн мэнд', mother: 'Хайрт ээждээ', friend: 'Найздаа', getwell: 'Эдгэрэхийг хүсье', baby: 'Хүүхэдтэй болсонд баяр хүргэе'};
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
      tr.appendChild(el('td', '', (r.images ? r.images + ' зураг' : '') + (r.images && r.video ? ', ' : '') + (r.video ? 'видео' : '') || '-'));
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
      showTab(load('ss_tab') || 'overview');
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
