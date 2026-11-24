(function () {
  'use strict';
  var SC = window.SC, el = SC.el;
  var $ = function (id) { return document.getElementById(id); };
  var D = { type: 'love', c1: '', c2: '', ink: '', pattern: '', font: '', motif: '', align: '' };
  var customOpen = false, price = 0, order = null, pollTimer = null, deadline = 0, busy = false;

  function applyTemplate(key) {
    var t = SC.TEMPLATES[key], p = SC.PALETTES[t.pal].c;
    D = { type: key, c1: p[0], c2: p[1], ink: p[2], pattern: t.pattern, font: t.font, motif: t.motif, align: t.align };
  }
  applyTemplate('love');

  function money(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '₮'; }
  function setStatus(id, msg, kind) { var s = $(id); s.textContent = msg; s.className = 'status' + (kind ? ' ' + kind : ''); }
  function show(view) {
    ['view-compose', 'view-pay', 'view-done'].forEach(function (v) { $(v).hidden = v !== view; });
    window.scrollTo(0, 0);
  }
  function store(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  function draft() {
    return {
      type: D.type, c1: D.c1, c2: D.c2, ink: D.ink, pattern: D.pattern, font: D.font, motif: D.motif, align: D.align,
      to: $('to').value.trim(), from: $('from').value.trim(), message: $('message').value.trim()
    };
  }

  /* ---------- pictures: shrink to JPEG in the browser, the server checks again ---------- */
  var pics = []; // { dataUrl, name }
  function picNote(msg, bad) { var n = $('media-note'); n.textContent = msg; n.style.color = bad ? 'var(--danger)' : ''; }

  function shrink(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader(), im = new Image();
      reader.onerror = function () { reject(); };
      reader.onload = function () { im.src = reader.result; };
      reader.readAsDataURL(file);
      im.onload = function () {
        var side = 1200, tries = 0, q = 0.82;
        var s = Math.min(1, side / Math.max(im.width, im.height));
        var cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(im.width * s)); cv.height = Math.max(1, Math.round(im.height * s));
        var cx = cv.getContext('2d');
        cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height);
        cx.drawImage(im, 0, 0, cv.width, cv.height);
        var out = cv.toDataURL('image/jpeg', q);
        // data URL length is about 4/3 of the bytes; keep the file under 400KB
        while (out.length * 0.75 > 400 * 1024 && tries < 8) { q -= 0.1; if (q < 0.3) { cv.width = Math.round(cv.width * 0.8); cv.height = Math.round(cv.height * 0.8); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(im, 0, 0, cv.width, cv.height); q = 0.7; } out = cv.toDataURL('image/jpeg', q); tries++; }
        out.length * 0.75 > 440 * 1024 ? reject() : resolve(out);
      };
      im.onerror = function () { reject(); };
    });
  }

  function renderPics() {
    var box = $('picked');
    box.textContent = '';
    pics.forEach(function (p, i) {
      var row = el('div', 'pick-row');
      var th = document.createElement('img');
      th.src = p.dataUrl; th.alt = '';
      row.appendChild(th);
      row.appendChild(el('span', 'pick-name', p.name));
      var rm = el('button', 'btn ghost', 'Хасах');
      rm.type = 'button';
      rm.addEventListener('click', function () { pics.splice(i, 1); renderPics(); renderPreview(); });
      row.appendChild(rm);
      box.appendChild(row);
    });
  }

  $('add-img').addEventListener('click', function () { $('img-input').click(); });
  $('img-input').addEventListener('change', function () {
    var files = Array.prototype.slice.call($('img-input').files).filter(function (f) { return /^image\//.test(f.type); });
    $('img-input').value = '';
    var room = 3 - pics.length;
    if (!files.length) { picNote('Зураг сонгоно уу.', true); return; }
    if (room <= 0) { picNote('Зураг 3-аас олон оруулах боломжгүй.', true); return; }
    picNote('Зураг бэлтгэж байна…', false);
    Promise.all(files.slice(0, room).map(function (f) { return shrink(f).then(function (d) { return { dataUrl: d, name: f.name }; }, function () { return null; }); })).then(function (list) {
      var failed = list.some(function (x) { return !x; });
      list.forEach(function (x) { if (x) pics.push(x); });
      picNote(failed ? 'Зарим зургийг нэмж чадсангүй.' : 'Зургийг автоматаар жижигрүүлнэ.', failed);
      renderPics();
      renderPreview();
    });
  });

  var SAMPLE = { to: 'Хайртай найздаа', from: 'Таны нэр', message: 'Чамд баяр баясгалан, эрүүл энх, үргэлж инээмсэглэл хүсье.' };
  function renderPreview() {
    var d = draft(), ghost = !d.message;
    var c = Object.assign({}, d, { to: d.to || SAMPLE.to, from: d.from || SAMPLE.from, message: d.message || SAMPLE.message, createdAt: Date.now(), imageSrcs: pics.map(function (p) { return p.dataUrl; }) });
    var box = $('preview');
    box.textContent = '';
    box.appendChild(SC.buildCard(c, ghost));
  }

  function optButton(label, pressed, onClick, iconSvg, dotBg) {
    var b = el('button', 'opt');
    b.type = 'button';
    b.setAttribute('aria-pressed', String(pressed));
    if (dotBg) { var dot = el('span', 'dot'); dot.style.background = dotBg; b.appendChild(dot); }
    if (iconSvg) { var s = el('span'); s.innerHTML = iconSvg; s.style.display = 'inline-flex'; b.appendChild(s); }
    b.appendChild(el('span', '', label));
    b.addEventListener('click', onClick);
    return b;
  }

  function renderControls() {
    var box = $('types');
    box.textContent = '';
    SC.TEMPLATE_ORDER.forEach(function (k) {
      var p = SC.PALETTES[SC.TEMPLATES[k].pal].c;
      box.appendChild(optButton(SC.TEMPLATES[k].label, D.type === k, function () { applyTemplate(k); syncColors(); renderControls(); renderPreview(); }, null, 'linear-gradient(150deg,' + p[0] + ',' + p[1] + ')'));
    });
    var pb = $('palettes');
    pb.textContent = '';
    var matched = false;
    SC.PALETTES.forEach(function (pal) {
      var on = pal.c[0].toLowerCase() === D.c1.toLowerCase() && pal.c[1].toLowerCase() === D.c2.toLowerCase() && pal.c[2].toLowerCase() === D.ink.toLowerCase();
      if (on) matched = true;
      var b = el('button', 'swatch');
      b.type = 'button'; b.title = pal.n; b.setAttribute('aria-label', pal.n); b.setAttribute('aria-pressed', String(on));
      var inner = el('span');
      inner.style.background = 'linear-gradient(150deg,' + pal.c[0] + ',' + pal.c[1] + ')';
      b.appendChild(inner);
      b.addEventListener('click', function () { D.c1 = pal.c[0]; D.c2 = pal.c[1]; D.ink = pal.c[2]; syncColors(); renderControls(); renderPreview(); });
      pb.appendChild(b);
    });
    var cb = el('button', 'swatch custom', 'Өөрийн өнгө');
    cb.type = 'button';
    cb.setAttribute('aria-pressed', String(customOpen || !matched));
    cb.addEventListener('click', function () { customOpen = !customOpen; renderControls(); });
    pb.appendChild(cb);
    $('custom').hidden = !(customOpen || !matched);

    var pt = $('patterns');
    pt.textContent = '';
    SC.PATTERN_ORDER.forEach(function (k) { pt.appendChild(optButton(SC.PATTERNS[k], D.pattern === k, function () { D.pattern = k; renderControls(); renderPreview(); })); });

    var fb = $('fonts');
    fb.textContent = '';
    var fam = { hand: 'var(--font-hand)', serif: 'var(--font-display)', sans: 'var(--font-body)', round: 'var(--font-round)', bold: 'var(--font-body)' };
    SC.FONT_ORDER.forEach(function (k) {
      var b = optButton(SC.FONTS[k], D.font === k, function () { D.font = k; renderControls(); renderPreview(); });
      var sp = b.lastChild;
      sp.style.fontFamily = fam[k];
      if (k === 'serif') sp.style.fontStyle = 'italic';
      if (k === 'bold') sp.style.fontWeight = '800';
      fb.appendChild(b);
    });

    var mb = $('motifs');
    mb.textContent = '';
    SC.MOTIF_ORDER.forEach(function (k) { mb.appendChild(optButton(SC.MOTIFS[k].n, D.motif === k, function () { D.motif = k; renderControls(); renderPreview(); }, SC.MOTIFS[k].svg)); });

    var ab = $('aligns');
    ab.textContent = '';
    [['left', 'Зүүн'], ['center', 'Төвд']].forEach(function (a) { ab.appendChild(optButton(a[1], D.align === a[0], function () { D.align = a[0]; renderControls(); renderPreview(); })); });
  }

  function syncColors() { $('c1').value = D.c1; $('c2').value = D.c2; $('ink').value = D.ink; }
  ['c1', 'c2', 'ink'].forEach(function (id) { $(id).addEventListener('input', function () { D[id] = $(id).value; renderPreview(); }); });
  ['to', 'from', 'message'].forEach(function (id) {
    $(id).addEventListener('input', function () {
      if (id === 'message') $('count').textContent = $('message').value.length + '/600';
      renderPreview();
    });
  });

  /* ---------- payment ---------- */
  function stopPolling() { if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; } }

  function poll() {
    stopPolling();
    if (!order) return;
    if (Date.now() > deadline) {
      $('wait-text').textContent = 'Төлбөрийн хугацаа дууслаа. Дахин эхлүүлнэ үү.';
      document.querySelector('.pulse').hidden = true;
      return;
    }
    fetch('/api/orders/' + order.id, { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : Promise.reject(); }).then(function (o) {
      if (o.status === 'paid') { finish(o); return; }
      if (o.status === 'expired') { deadline = 0; }
      pollTimer = setTimeout(poll, 3000);
    }).catch(function () { pollTimer = setTimeout(poll, 5000); });
  }

  function startPayment() {
    var d = draft();
    if (!d.to) { setStatus('status', 'Хэнд илгээхээ бичнэ үү.', 'bad'); $('to').focus(); return; }
    if (!d.message) { setStatus('status', 'Зурвасаа бичнэ үү.', 'bad'); $('message').focus(); return; }
    if (busy) return;
    busy = true;
    $('pay-btn').disabled = true;
    setStatus('status', 'Нэхэмжлэх үүсгэж байна…', '');
    fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ card: d, images: pics.map(function (p) { return p.dataUrl; }) }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
      .then(function (r) {
        if (!r.ok) { setStatus('status', (r.body && r.body.error) || 'Алдаа гарлаа. Дахин оролдоно уу.', 'bad'); return; }
        if (r.body.status === 'paid') { finish(r.body); return; }
        order = r.body;
        deadline = Date.now() + 30 * 60 * 1000;
        store('ss_order', order.id);
        $('pay-amount').textContent = money(order.amount);
        var qr = $('qr');
        if (order.qrSrc) { qr.src = order.qrSrc; qr.hidden = false; $('qr-note').hidden = false; } else { qr.hidden = true; $('qr-note').hidden = true; }
        var banks = $('banks');
        banks.textContent = '';
        (order.links || []).forEach(function (l) {
          var a = el('a', 'btn ghost', l.name || 'Банкны апп');
          a.href = l.link; a.target = '_blank'; a.rel = 'noopener noreferrer';
          banks.appendChild(a);
        });
        $('pay-preview').textContent = '';
        $('pay-preview').appendChild(SC.buildCard(Object.assign({}, d, { createdAt: Date.now(), imageSrcs: pics.map(function (p) { return p.dataUrl; }) })));
        $('wait-text').textContent = 'Төлбөр хүлээж байна…';
        document.querySelector('.pulse').hidden = false;
        show('view-pay');
        poll();
      })
      .catch(function () { setStatus('status', 'Сервертэй холбогдож чадсангүй. Дахин оролдоно уу.', 'bad'); })
      .then(function () { busy = false; $('pay-btn').disabled = false; });
  }

  $('form').addEventListener('submit', function (ev) { ev.preventDefault(); startPayment(); });
  $('back').addEventListener('click', function () { stopPolling(); order = null; setStatus('status', '', ''); show('view-compose'); });
  $('mock-pay').addEventListener('click', function () {
    if (!order) return;
    fetch('/api/mock/pay/' + order.id, { method: 'POST' }).then(function (r) { return r.json(); }).then(function (o) { if (o.status === 'paid') finish(o); });
  });

  /* ---------- done ---------- */
  function finish(o) {
    stopPolling();
    store('ss_order', o.id);
    fetch('/api/cards/' + o.cardId, { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : Promise.reject(); }).then(function (card) {
      var url = location.origin + '/c/' + o.cardId;
      var box = $('done-card');
      box.textContent = '';
      card.imageSrcs = SC.imageUrls(o.cardId, card.images);
      box.appendChild(SC.buildCard(card));
      $('share-link').value = url;
      var text = 'Танд сэтгэлийн шуудан ирлээ: ' + url;
      var share = $('share');
      share.textContent = '';
      if (navigator.share) {
        var nb = el('button', 'btn', 'Илгээх');
        nb.type = 'button';
        nb.addEventListener('click', function () { navigator.share({ title: 'Сэтгэлийн шуудан', text: 'Танд сэтгэлийн шуудан ирлээ', url: url }).catch(function () {}); });
        share.appendChild(nb);
      }
      [
        ['Viber', 'viber://forward?text=' + encodeURIComponent(text)],
        ['Telegram', 'https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent('Танд сэтгэлийн шуудан ирлээ')],
        ['Facebook', 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url)],
        ['SMS', 'sms:?&body=' + encodeURIComponent(text)]
      ].forEach(function (s) {
        var a = el('a', 'btn ghost', s[0]);
        a.href = s[1]; a.target = '_blank'; a.rel = 'noopener noreferrer';
        share.appendChild(a);
      });
      setStatus('done-status', 'Карт бэлэн боллоо. Холбоосыг хүлээн авагчдаа илгээнэ үү.', 'good');
      show('view-done');
    }).catch(function () {
      setStatus('status', 'Төлбөр баталгаажсан ч картыг ачаалж чадсангүй. Хуудсыг дахин нээнэ үү.', 'bad');
    });
  }

  $('copy').addEventListener('click', function () {
    var input = $('share-link'), b = $('copy');
    var done = function (m) { b.textContent = m; setTimeout(function () { b.textContent = 'Хуулах'; }, 2000); };
    input.select();
    try { navigator.clipboard.writeText(input.value).then(function () { done('Хуулсан'); }, function () { done('Сонгосон'); }); }
    catch (e) { done('Сонгосон'); }
  });
  $('again').addEventListener('click', function () {
    order = null; store('ss_order', null);
    $('to').value = ''; $('message').value = ''; $('count').textContent = '0/600';
    pics = []; renderPics();
    setStatus('status', '', '');
    renderPreview();
    show('view-compose');
  });

  /* ---------- start ---------- */
  renderControls();
  syncColors();
  renderPreview();

  fetch('/api/config').then(function (r) { return r.json(); }).then(function (c) {
    price = c.price;
    if (c.free) {
      var pr = $('price');
      pr.textContent = '';
      var old = el('s', 'note', money(price));
      old.style.marginRight = '10px';
      pr.appendChild(old);
      pr.appendChild(document.createTextNode('Үнэгүй'));
      if (c.freeUntil) $('status').textContent = c.freeUntil + ' хүртэл үнэгүй.';
      $('pay-btn').textContent = 'Үнэгүй илгээх';
    } else {
      $('price').textContent = money(price);
    }
    $('mock-pay').hidden = !c.mock;
  }).catch(function () { $('price').textContent = ''; });

  // If the buyer reloaded after paying, show the finished card again.
  var saved = load('ss_order');
  if (saved && /^[a-f0-9]{24}$/.test(saved)) {
    fetch('/api/orders/' + saved, { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (o) {
      if (o && o.status === 'paid') finish(o);
    }).catch(function () {});
  }
})();
