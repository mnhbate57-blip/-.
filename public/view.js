(function () {
  'use strict';
  var box = document.getElementById('card');
  var m = /^\/c\/([a-f0-9]{32})$/.exec(location.pathname);
  function fail(msg) { box.textContent = ''; var p = document.createElement('p'); p.className = 'note'; p.textContent = msg; box.appendChild(p); }
  if (!m) { fail('Холбоос буруу байна.'); return; }
  fetch('/api/cards/' + m[1]).then(function (r) { return r.ok ? r.json() : Promise.reject(); }).then(function (card) {
    box.textContent = '';
    card.imageSrcs = window.SC.imageUrls(m[1], card.images);
    box.appendChild(window.SC.buildCard(card));
  }).catch(function () { fail('Мэндчилгээ олдсонгүй.'); });
})();
