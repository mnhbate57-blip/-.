(function () {
  'use strict';
  var SC = window.SC, el = SC.el;
  var $ = function (id) { return document.getElementById(id); };
  var m = /^\/m\/([a-f0-9]{12})$/.exec(location.pathname);
  var type = 'love', owner = '', busy = false, pics = [], vid = null;

  function look() {
    var t = SC.TEMPLATES[type], p = SC.PALETTES[t.pal].c;
    return { type: type, c1: p[0], c2: p[1], ink: p[2], pattern: t.pattern, font: t.font, motif: t.motif, align: t.align };
  }
  function draft() { return { from: $('from').value.trim(), message: $('message').value.trim() }; }
  function setStatus(msg, kind) { var s = $('status'); s.textContent = msg; s.className = 'status' + (kind ? ' ' + kind : ''); }
  function show(id) { ['view-compose', 'view-sent', 'view-missing'].forEach(function (v) { $(v).hidden = v !== id; }); window.scrollTo(0, 0); }

  function renderPreview() {
    var d = draft(), ghost = !d.message;
    var c = Object.assign(look(), {
      to: owner, from: d.from || 'Таны нэр',
      message: d.message || 'Чамд баяр баясгалан, эрүүл энх, үргэлж инээмсэглэл хүсье.',
      createdAt: Date.now(), imageSrcs: pics, videoSrc: vid ? vid.url : ''
    });
    var box = $('preview'); box.textContent = '';
    box.appendChild(SC.buildCard(c, ghost));
  }

  function renderTypes() {
    var box = $('types'); box.textContent = '';
    SC.TEMPLATE_ORDER.forEach(function (k) {
      var t = SC.TEMPLATES[k], p = SC.PALETTES[t.pal].c;
      var b = el('button', 'tile'); b.type = 'button';
      b.setAttribute('aria-pressed', String(type === k));
      b.style.background = 'linear-gradient(150deg,' + p[0] + ',' + p[1] + ')';
      b.style.color = p[2];
      var ic = el('span', 'tile-ic'); ic.innerHTML = SC.MOTIFS[t.motif].svg;
      b.appendChild(ic); b.appendChild(el('span', 'tile-name', t.label));
      b.addEventListener('click', function () { type = k; renderTypes(); renderPreview(); });
      box.appendChild(b);
    });
  }

  function renderPics() {
    var box = $('picked'); box.textContent = '';
    pics.forEach(function () {
      var row = el('div', 'pick-row');
      var th = document.createElement('img'); th.src = pics[0]; th.alt = '';
      row.appendChild(th);
      var rm = el('button', 'btn ghost', 'Хасах'); rm.type = 'button';
      rm.addEventListener('click', function () { pics = []; renderPics(); renderPreview(); });
      row.appendChild(rm); box.appendChild(row);
    });
    $('add-img').hidden = pics.length >= 1;
  }
  $('add-img').addEventListener('click', function () { $('img-input').click(); });
  $('img-input').addEventListener('change', function () {
    var f = $('img-input').files[0]; $('img-input').value = '';
    if (!f) return;
    SC.shrink(f).then(function (d) { pics = [d]; renderPics(); renderPreview(); setStatus('', ''); }, function () { setStatus('Зургийг уншиж чадсангүй.', 'bad'); });
  });

  function renderVid() {
    var box = $('vid-picked'); box.textContent = '';
    if (vid) {
      var row = el('div', 'pick-row');
      row.appendChild(el('span', 'pick-name', 'Видео: ' + vid.name));
      var rm = el('button', 'btn ghost', 'Хасах'); rm.type = 'button';
      rm.addEventListener('click', function () { vid = null; renderVid(); renderPreview(); });
      row.appendChild(rm); box.appendChild(row);
    }
    $('add-vid').hidden = !!vid;
  }
  $('add-vid').addEventListener('click', function () { $('vid-input').click(); });
  $('vid-input').addEventListener('change', function () {
    var f = $('vid-input').files[0]; $('vid-input').value = '';
    if (!f) return;
    setStatus('Видео оруулж байна…', ''); $('add-vid').disabled = true;
    SC.uploadVideo(f).then(function (token) {
      vid = { token: token, url: URL.createObjectURL(f), name: f.name };
      setStatus('', ''); renderVid(); renderPreview();
    }, function (e) { setStatus(e && e.message ? e.message : 'Видео оруулж чадсангүй.', 'bad'); })
      .then(function () { $('add-vid').disabled = false; });
  });

  if (!m) { show('view-missing'); return; }

  fetch('/api/mailboxes/' + m[1]).then(function (r) { return r.ok ? r.json() : Promise.reject(); }).then(function (b) {
    owner = b.name;
    $('title').textContent = owner + '-д мэндчилгээ илгээ';
    renderTypes(); renderPreview();
    show('view-compose');
  }).catch(function () { $('hero').hidden = true; show('view-missing'); });

  ['from', 'message'].forEach(function (id) {
    $(id).addEventListener('input', function () {
      if (id === 'message') $('count').textContent = $('message').value.length + '/300';
      renderPreview();
    });
  });

  $('form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var d = draft();
    if (!d.message) { setStatus('Зурвасаа бичнэ үү.', 'bad'); $('message').focus(); return; }
    if (busy) return;
    busy = true; $('send-btn').disabled = true; setStatus('Илгээж байна…', '');
    fetch('/api/mailboxes/' + m[1] + '/cards', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card: Object.assign(look(), d), images: pics, video: vid ? vid.token : null })
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); }).then(function (r) {
      if (!r.ok) { setStatus((r.body && r.body.error) || 'Алдаа гарлаа. Дахин оролдоно уу.', 'bad'); return; }
      $('sent-note').textContent = owner + ' таны мэндчилгээг дараа нь уншина.';
      var box = $('sent-card'); box.textContent = '';
      box.appendChild(SC.buildCard(Object.assign(look(), { to: owner, from: d.from || 'Нэргүй', message: d.message, createdAt: Date.now(), imageSrcs: pics, videoSrc: vid ? vid.url : '' })));
      show('view-sent');
    }).catch(function () { setStatus('Сервертэй холбогдож чадсангүй.', 'bad'); })
      .then(function () { busy = false; $('send-btn').disabled = false; });
  });

  $('again').addEventListener('click', function () {
    pics = []; renderPics(); vid = null; renderVid(); $('message').value = ''; $('count').textContent = '0/300'; setStatus('', '');
    renderPreview(); show('view-compose');
  });
})();
