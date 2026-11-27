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

  var st = document.createElement('style'); st.id = 'env-style';
  st.textContent = "/* Nicer envelope: letter slides out, sparkles burst, then the card rises */\n.env-wrap { transition: opacity .4s ease, transform .4s ease; }\n.env-wrap.leave { opacity: 0; transform: translateY(-14px) scale(.96); }\n.env-body, .env-front, .env-letter, .env-flap { pointer-events: none; }\n.env-letter { position: absolute; left: 9%; right: 9%; top: 10%; bottom: 8%; border-radius: 8px; background: #fffdf8; box-shadow: 0 1px 4px rgba(0,0,0,.18); padding: 16% 12% 0; display: flex; flex-direction: column; gap: 9px; transition: transform .7s cubic-bezier(.2,.8,.2,1) .55s; }\n.env-letter i { display: block; height: 5px; border-radius: 3px; background: color-mix(in srgb, var(--env1) 30%, #fff); }\n.env-letter i:nth-child(2) { width: 80%; }\n.env-letter i:nth-child(3) { width: 55%; }\n.envelope.open .env-letter { transform: translateY(-52%); }\n.env-front { position: absolute; left: 0; right: 0; bottom: 0; top: 0; border-radius: 12px; background: linear-gradient(150deg, var(--env1), var(--env2)); clip-path: polygon(0 100%, 100% 100%, 100% 30%, 50% 62%, 0 30%); filter: brightness(1.08); }\n.env-flap { z-index: 2; transition: transform .6s ease, z-index 0s .3s; }\n.envelope.open .env-flap { z-index: 0; }\n.env-seal { z-index: 3; }\n.spark { position: absolute; left: 50%; top: 40%; width: var(--sz, 18px); height: var(--sz, 18px); color: var(--env-ink); opacity: 0; z-index: 4; pointer-events: none; animation: spark 1s ease-out forwards; }\n.spark svg { width: 100%; height: 100%; display: block; }\n@keyframes spark { 0% { opacity: 0; transform: translate(-50%, -50%) scale(.3); } 20% { opacity: 1; } 100% { opacity: 0; transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(1) rotate(40deg); } }\n#cta a.btn { box-shadow: 0 6px 18px rgba(0,0,0,.18); }\n@media (prefers-reduced-motion: reduce) { .env-letter, .env-flap, .env-wrap { transition: none; } .spark { display: none; } }";
  document.head.appendChild(st);
  // The "write your own card" button jumps straight to the composer on the home page.
  var ctaLink = cta.querySelector('a.btn');
  if (ctaLink) ctaLink.setAttribute('href', '/#compose-title');

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
    var letter = el('span', 'env-letter');
    letter.appendChild(el('i')); letter.appendChild(el('i')); letter.appendChild(el('i'));
    env.appendChild(letter);
    env.appendChild(el('span', 'env-front'));
    env.appendChild(el('span', 'env-flap'));
    var seal = el('span', 'env-seal');
    seal.innerHTML = SC.MOTIFS.heart.svg;
    env.appendChild(seal);
    box.appendChild(env);
    box.appendChild(el('p', 'note', 'Нээхийн тулд дарна уу'));
    stage.appendChild(box);

    var opened = false, auto = null;
    function burst() {
      var motif = SC.MOTIFS[card.motif] && SC.MOTIFS[card.motif].svg ? SC.MOTIFS[card.motif].svg : SC.MOTIFS.heart.svg;
      for (var i = 0; i < 16; i++) {
        var s = el('span', 'spark'); s.innerHTML = motif;
        var a = (i / 16) * Math.PI * 2 + Math.random() * .4, d = 90 + Math.random() * 110;
        s.style.setProperty('--dx', Math.round(Math.cos(a) * d) + 'px');
        s.style.setProperty('--dy', Math.round(Math.sin(a) * d - 40) + 'px');
        s.style.setProperty('--sz', (12 + Math.round(Math.random() * 14)) + 'px');
        s.style.animationDelay = (Math.random() * .15).toFixed(2) + 's';
        env.appendChild(s);
      }
    }
    function openIt() {
      if (opened) return;
      opened = true; clearTimeout(auto);
      if (reduce) { showCard(card); return; }
      env.classList.add('open');
      setTimeout(burst, 500);
      setTimeout(function () { box.classList.add('leave'); }, 1350);
      setTimeout(function () { showCard(card); }, 1750);
    }
    env.addEventListener('click', openIt);
    // Arriving by link: the envelope opens by itself, no tap needed.
    auto = setTimeout(openIt, 1700);
  }

  fetch('/api/cards/' + m[1]).then(function (r) { return r.ok ? r.json() : Promise.reject(); }).then(function (card) {
    card.imageSrcs = SC.imageUrls(m[1], card.images);
    card.videoSrc = SC.videoUrl(m[1], card.video);
    theme(card);
    cta.hidden = false;
    // Every card arrives in an envelope that opens by itself (or on tap).
    if (reduce) showCard(card); else envelope(card);
  }).catch(function () { fail('Мэндчилгээ олдсонгүй. Холбоосыг бүтнээр нь хуулсан эсэхээ шалгана уу.'); });
})();
