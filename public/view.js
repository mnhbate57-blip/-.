(function () {
  'use strict';
  var SC = window.SC, el = SC.el;
  var stage = document.getElementById('stage');
  var cta = document.getElementById('cta');
  var m = /^\/c\/([a-f0-9]{32})$/.exec(location.pathname);

  function fail(msg) {
    stage.textContent = '';
    stage.appendChild(el('p', 'note', msg));
    cta.hidden = false;
  }
  if (!m) { fail('Холбоос буруу байна.'); return; }

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var HEX = /^#[0-9a-fA-F]{6}$/;

  // Tint the whole page with the card's own colours and let a few of its motifs drift upward.
  function theme(card) {
    var c1 = HEX.test(card.c1) ? card.c1 : '#8e1b4a';
    var c2 = HEX.test(card.c2) ? card.c2 : '#d6456f';
    document.body.style.setProperty('--t1', c1);
    document.body.style.setProperty('--t2', c2);
    document.body.classList.add('themed');
    var box = document.getElementById('floaty');
    var motif = SC.MOTIFS[card.motif] && SC.MOTIFS[card.motif].svg ? SC.MOTIFS[card.motif].svg : SC.MOTIFS.heart.svg;
    if (!box || reduce) return;
    box.textContent = '';
    for (var i = 0; i < 12; i++) {
      var s = el('span', 'fl');
      s.innerHTML = motif;
      var size = 16 + Math.round(Math.random() * 26);
      s.style.width = size + 'px'; s.style.height = size + 'px';
      s.style.left = Math.round(Math.random() * 96) + '%';
      s.style.animationDuration = (14 + Math.random() * 14).toFixed(1) + 's';
      s.style.animationDelay = (-Math.random() * 20).toFixed(1) + 's';
      box.appendChild(s);
    }
  }

  function showCard(card) {
    stage.textContent = '';
    var wrap = el('div', 'reveal');
    var from = String(card.from || '').trim();
    wrap.appendChild(el('p', 'hello', from ? from + '-аас танд' : 'Танд'));
    wrap.appendChild(SC.buildCard(card));
    stage.appendChild(wrap);
    cta.hidden = false;
  }

  function envelope(card) {
    var c1 = HEX.test(card.c1) ? card.c1 : '#8e1b4a';
    var c2 = HEX.test(card.c2) ? card.c2 : '#d6456f';
    var ink = HEX.test(card.ink) ? card.ink : '#fff3f7';
    var from = String(card.from || '').trim();

    stage.textContent = '';
    var box = el('div', 'env-wrap');
    box.appendChild(el('p', 'env-title', from ? from + '-аас танд мэндчилгээ ирлээ' : 'Танд мэндчилгээ ирлээ'));

    var env = el('button', 'envelope');
    env.type = 'button';
    env.setAttribute('aria-label', 'Мэндчилгээг нээх');
    env.style.setProperty('--env1', c1);
    env.style.setProperty('--env2', c2);
    env.style.setProperty('--env-ink', ink);
    env.appendChild(el('span', 'env-body'));
    env.appendChild(el('span', 'env-flap'));
    var seal = el('span', 'env-seal');
    seal.innerHTML = SC.MOTIFS.heart.svg;
    env.appendChild(seal);
    box.appendChild(env);
    box.appendChild(el('p', 'note', 'Нээхийн тулд дарна уу'));
    stage.appendChild(box);

    var opened = false;
    env.addEventListener('click', function () {
      if (opened) return;
      opened = true;
      if (reduce) { showCard(card); return; }
      env.classList.add('open');
      setTimeout(function () { showCard(card); }, 750);
    });
  }

  fetch('/api/cards/' + m[1]).then(function (r) { return r.ok ? r.json() : Promise.reject(); }).then(function (card) {
    card.imageSrcs = SC.imageUrls(m[1], card.images);
    card.videoSrc = SC.videoUrl(m[1], card.video);
    theme(card);
    // Premium cards open like an envelope. Free cards (and plain older cards) show at once.
    if (card.plan === 'premium') envelope(card); else showCard(card);
  }).catch(function () { fail('Мэндчилгээ олдсонгүй. Холбоосыг бүтнээр нь хуулсан эсэхээ шалгана уу.'); });
})();
