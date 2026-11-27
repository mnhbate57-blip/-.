(function () {
  'use strict';
  var SC = window.SC, el = SC.el;
  var $ = function (id) { return document.getElementById(id); };
  var m = /^\/inbox\/([a-f0-9]{32})$/.exec(location.pathname);
  var data = null, seenKey = '';

  function store(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function setStatus(msg, kind) { var s = $('status'); s.textContent = msg; s.className = 'status' + (kind ? ' ' + kind : ''); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function fmt(ts) { var d = new Date(ts); return d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }

  if (!m) { $('missing').hidden = false; return; }
  store('ss_box', m[1]);

  function copy(inputId, btnId) {
    var input = $(inputId), b = $(btnId), label = b.textContent;
    var done = function (t) { b.textContent = t; setTimeout(function () { b.textContent = label; }, 2000); };
    input.select();
    try { navigator.clipboard.writeText(input.value).then(function () { done('Хуулсан'); }, function () { done('Сонгосон'); }); }
    catch (e) { done('Сонгосон'); }
  }
  $('pub-copy').addEventListener('click', function () { copy('pub-link', 'pub-copy'); });
  $('key-copy').addEventListener('click', function () { copy('key-link', 'key-copy'); });

  function shareButtons(url, name) {
    var box = $('share'); box.textContent = '';
    var text = name + '-д мэндчилгээ илгээгээрэй: ' + url;
    if (navigator.share) {
      var nb = el('button', 'btn', 'Хуваалцах'); nb.type = 'button';
      nb.addEventListener('click', function () { navigator.share({ title: 'Сэтгэлийн шуудан', text: name + '-д мэндчилгээ илгээгээрэй', url: url }).catch(function () {}); });
      box.appendChild(nb);
    }
    [['Viber', 'viber://forward?text=' + encodeURIComponent(text)],
     ['Telegram', 'https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(name + '-д мэндчилгээ илгээгээрэй')],
     ['Facebook', 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url)],
     ['SMS', 'sms:?&body=' + encodeURIComponent(text)]].forEach(function (s) {
      var a = el('a', 'btn ghost', s[0]); a.href = s[1]; a.target = '_blank'; a.rel = 'noopener noreferrer'; box.appendChild(a);
    });
  }

  /* ---------- story picture, drawn in the browser ---------- */
  var HEART = 'M24 41S6 30 6 17.5C6 11 11 7 16 7c3.5 0 6.5 2 8 5 1.5-3 4.5-5 8-5 5 0 10 4 10 10.5C42 30 24 41 24 41z';
  function makeStory(name, url) {
    var W = 1080, H = 1920, cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var c = cv.getContext('2d');
    var g = c.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#8e1b4a'); g.addColorStop(.55, '#c43c6c'); g.addColorStop(1, '#f07a3c');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(255,255,255,.12)';
    for (var y = 40; y < H; y += 60) for (var x = 40; x < W; x += 60) { c.beginPath(); c.arc(x, y, 3, 0, 7); c.fill(); }
    var heart = new Path2D(HEART);
    [[700, 250, 9, .26, .2], [90, 1450, 6, .2, -.3], [830, 1500, 5, .2, .25], [150, 330, 4, .2, -.2]].forEach(function (h) {
      c.save(); c.translate(h[0], h[1]); c.rotate(h[4]); c.scale(h[2], h[2]); c.globalAlpha = h[3]; c.fillStyle = '#fff'; c.fill(heart); c.restore();
    });
    c.textAlign = 'center'; c.fillStyle = '#fff';
    function fit(txt, fam, size, maxW) { do { c.font = fam.replace('{s}', size); size -= 4; } while (c.measureText(txt).width > maxW && size > 36); }
    c.font = '800 44px Nunito, Arial, sans-serif'; c.fillText('СЭТГЭЛИЙН ШУУДАН', W / 2, 520);
    fit(name, 'italic 600 {s}px Lora, Georgia, serif', 140, W - 140); c.fillText(name, W / 2, 700);
    c.font = 'italic 600 78px Lora, Georgia, serif';
    c.fillText('надад мэндчилгээ', W / 2, 840); c.fillText('илгээгээрэй', W / 2, 935);
    var pw = 820, ph = 130, px = (W - pw) / 2, py = 1090;
    c.fillStyle = '#fff'; c.beginPath();
    if (c.roundRect) c.roundRect(px, py, pw, ph, 65); else c.rect(px, py, pw, ph);
    c.fill();
    c.fillStyle = '#8e1b4a'; c.font = '800 42px Nunito, Arial, sans-serif'; c.fillText('Линк дээр дарж карт бичээрэй', W / 2, py + 82);
    c.fillStyle = 'rgba(255,255,255,.92)';
    fit(url.replace(/^https?:\/\//, ''), '600 {s}px Nunito, Arial, sans-serif', 40, W - 120); c.fillText(url.replace(/^https?:\/\//, ''), W / 2, 1330);
    c.font = '600 36px Nunito, Arial, sans-serif'; c.fillText('Бүртгэл шаардахгүй', W / 2, 1640);
    return cv.toDataURL('image/png');
  }

  $('story-make').addEventListener('click', function () {
    if (!data) return;
    var b = $('story-make'); b.disabled = true; $('story-note').textContent = 'Бэлтгэж байна…';
    var fonts = document.fonts && document.fonts.load ? Promise.race([
      Promise.all([document.fonts.load('italic 600 80px Lora'), document.fonts.load('800 40px Nunito')]),
      new Promise(function (r) { setTimeout(r, 1500); })
    ]) : Promise.resolve();
    fonts.catch(function () {}).then(function () {
      var url = location.origin + '/m/' + data.id;
      var png = makeStory(data.name, url);
      $('story-img').src = png; $('story-img').hidden = false;
      $('story-dl').href = png; $('story-dl').hidden = false;
      $('story-note').textContent = 'Татахгүй бол зургийг удаан дарж хадгалаарай.';
      b.disabled = false; b.textContent = 'Дахин бэлтгэх';
    });
  });

  /* ---------- inbox ---------- */
  function render() {
    var list = $('msgs'); list.textContent = '';
    var last = Number(load(seenKey)) || 0, newest = last;
    data.messages.forEach(function (msg) {
      var item = el('div', 'msg-item');
      var meta = el('div', 'msg-meta');
      var left = el('span', '', fmt(msg.createdAt));
      if (msg.createdAt > last) { left.appendChild(document.createTextNode(' ')); left.appendChild(el('span', 'badge-new', 'Шинэ')); }
      meta.appendChild(left);
      var del = el('button', 'btn ghost', 'Устгах'); del.type = 'button';
      var armed = null;
      del.addEventListener('click', function () {
        if (!armed) { del.textContent = 'Үнэхээр устгах уу?'; armed = setTimeout(function () { armed = null; del.textContent = 'Устгах'; }, 3000); return; }
        clearTimeout(armed);
        fetch('/api/inbox/' + m[1] + '/cards/' + msg.cardId, { method: 'DELETE' }).then(function (r) {
          if (!r.ok) throw 0;
          data.messages = data.messages.filter(function (x) { return x.cardId !== msg.cardId; });
          render();
        }).catch(function () { setStatus('Устгаж чадсангүй.', 'bad'); });
      });
      meta.appendChild(del);
      item.appendChild(meta);
      item.appendChild(SC.buildCard(Object.assign({}, msg, { imageSrcs: SC.imageUrls(msg.cardId, msg.images), videoSrc: SC.videoUrl(msg.cardId, msg.video) })));
      list.appendChild(item);
      if (msg.createdAt > newest) newest = msg.createdAt;
    });
    $('empty').hidden = data.messages.length > 0;
    $('count').textContent = data.messages.length ? '(' + data.messages.length + ')' : '';
    store(seenKey, String(newest));
  }

  function loadInbox(first) {
    setStatus(first ? '' : 'Шинэчилж байна…', '');
    fetch('/api/inbox/' + m[1], { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); }).then(function (d) {
      var firstLoad = !data;
      data = d; seenKey = 'ss_seen_' + d.id;
      store('ss_box_pub', d.id);
      $('name').textContent = d.name;
      document.title = d.name + ' — шуудангийн хайрцаг';
      var url = location.origin + '/m/' + d.id;
      $('pub-link').value = url;
      $('key-link').value = location.origin + '/inbox/' + m[1];
      if (firstLoad) shareButtons(url, d.name);
      $('missing').hidden = true; $('main').hidden = false;
      setStatus('', '');
      render();
    }).catch(function (code) {
      if (code === 404) { $('main').hidden = true; $('missing').hidden = false; $('name').textContent = ''; }
      else setStatus('Шинэчилж чадсангүй.', 'bad');
    });
  }
  $('refresh').addEventListener('click', function () { loadInbox(false); });
  setInterval(function () { if (!document.hidden) loadInbox(true); }, 60000);
  loadInbox(true);
})();
