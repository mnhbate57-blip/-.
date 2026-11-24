/* Shared card catalogue and renderer. Used by the compose page and the card view page. */
(function (g) {
  'use strict';
  var MOTIFS = {
    none: { n: 'Байхгүй', svg: '' },
    heart: { n: 'Зүрх', svg: '<svg viewBox="0 0 48 48" fill="currentColor"><path d="M24 41S6 30 6 17.5C6 11 11 7 16 7c3.5 0 6.5 2 8 5 1.5-3 4.5-5 8-5 5 0 10 4 10 10.5C42 30 24 41 24 41z"/></svg>' },
    cake: { n: 'Бялуу', svg: '<svg viewBox="0 0 48 48" fill="currentColor"><rect x="8" y="26" width="32" height="14" rx="3"/><rect x="8" y="22" width="32" height="5" rx="2" opacity=".55"/><rect x="22" y="12" width="4" height="10" rx="1"/><path d="M24 4c3 3 3 6 0 8-3-2-3-5 0-8z"/></svg>' },
    envelope: { n: 'Дугтуй', svg: '<svg viewBox="0 0 48 48" fill="currentColor"><rect x="5" y="11" width="38" height="27" rx="3" opacity=".3"/><path d="M5 14l19 14 19-14" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/></svg>' },
    star: { n: 'Од', svg: '<svg viewBox="0 0 48 48" fill="currentColor"><path d="M24 5l5.5 12 13 1.5-9.7 8.8 2.7 12.9L24 33.4 12.5 40.2l2.7-12.9L5.5 18.5l13-1.5z"/></svg>' },
    flower: { n: 'Цэцэг', svg: '<svg viewBox="0 0 48 48" fill="currentColor"><circle cx="24" cy="11" r="7"/><circle cx="37" cy="21" r="7"/><circle cx="32" cy="37" r="7"/><circle cx="16" cy="37" r="7"/><circle cx="11" cy="21" r="7"/><circle cx="24" cy="26" r="6" fill="#fff" opacity=".85"/></svg>' },
    balloon: { n: 'Бөмбөлөг', svg: '<svg viewBox="0 0 48 48" fill="currentColor"><ellipse cx="24" cy="19" rx="12" ry="15"/><path d="M24 34l-3 5h6z"/><path d="M24 39c-4 3 4 5 0 8" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
    sun: { n: 'Нар', svg: '<svg viewBox="0 0 48 48" fill="currentColor"><circle cx="24" cy="24" r="9"/><g stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M24 4v6M24 38v6M4 24h6M38 24h6M10 10l4 4M34 34l4 4M38 10l-4 4M14 34l-4 4"/></g></svg>' },
    moon: { n: 'Сар', svg: '<svg viewBox="0 0 48 48" fill="currentColor"><path d="M33 6a19 19 0 1 0 9 31A16 16 0 0 1 33 6z"/></svg>' },
    gift: { n: 'Бэлэг', svg: '<svg viewBox="0 0 48 48" fill="currentColor"><rect x="7" y="20" width="34" height="21" rx="2"/><rect x="5" y="14" width="38" height="8" rx="2" opacity=".6"/><rect x="22" y="14" width="4" height="27" fill="#fff" opacity=".5"/><path d="M24 14c-4-9-12-8-10-3 1 3 6 3 10 3zM24 14c4-9 12-8 10-3-1 3-6 3-10 3z" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>' }
  };
  var MOTIF_ORDER = ['heart', 'cake', 'envelope', 'star', 'flower', 'balloon', 'sun', 'moon', 'gift', 'none'];
  var PATTERNS = { none: 'Хээгүй', confetti: 'Цацраг', dots: 'Цэг', stripes: 'Судал', waves: 'Долгион', hearts: 'Зүрхэн хээ', stars: 'Одон хээ', lines: 'Дэвтрийн шугам' };
  var PATTERN_ORDER = ['none', 'confetti', 'dots', 'stripes', 'waves', 'hearts', 'stars', 'lines'];
  var FONTS = { hand: 'Гар бичмэл', serif: 'Сонгодог', sans: 'Энгийн', round: 'Дугуй', bold: 'Тод' };
  var FONT_ORDER = ['hand', 'serif', 'sans', 'round', 'bold'];
  var PALETTES = [
    { n: 'Сарнай', c: ['#8e1b4a', '#d6456f', '#fff3f7'] }, { n: 'Нар жаргах', c: ['#f2b134', '#f07a3c', '#3a1d05'] },
    { n: 'Далай', c: ['#0f4c81', '#3aa0d8', '#eef8ff'] }, { n: 'Ой', c: ['#1e6b52', '#3aa07d', '#effaf4'] },
    { n: 'Лаванда', c: ['#5a3d8a', '#8f6fc7', '#f6f0ff'] }, { n: 'Ягаан', c: ['#f7c6d0', '#f9a8b8', '#4a1c2a'] },
    { n: 'Шөнө', c: ['#141a3a', '#3b3f8f', '#eef0ff'] }, { n: 'Алт', c: ['#7a5a12', '#d9a93a', '#fff8e6'] },
    { n: 'Гүргэм', c: ['#bfe8d8', '#8fd3bd', '#10382e'] }, { n: 'Тэнгэр', c: ['#d6e8fb', '#a9cdf3', '#122a47'] },
    { n: 'Шүр', c: ['#e2574c', '#f2955c', '#fff5f0'] }, { n: 'Цаас', c: ['#eaf0f9', '#d8e2f2', '#1d2b4a'] },
    { n: 'Хар', c: ['#1f1f24', '#4a4a55', '#f5f5f7'] }
  ];
  var TEMPLATES = {
    love: { label: 'Хайрын мэндчилгээ', pal: 0, pattern: 'hearts', font: 'hand', motif: 'heart', align: 'left' },
    bday: { label: 'Төрсөн өдөр', pal: 1, pattern: 'confetti', font: 'hand', motif: 'cake', align: 'left' },
    letter: { label: 'Захидал', pal: 11, pattern: 'lines', font: 'hand', motif: 'envelope', align: 'left' },
    cheers: { label: 'Баяр хүргэе', pal: 3, pattern: 'stars', font: 'round', motif: 'star', align: 'center' },
    thanks: { label: 'Талархал', pal: 4, pattern: 'dots', font: 'serif', motif: 'flower', align: 'center' },
    night: { label: 'Шөнийн мэнд', pal: 6, pattern: 'stars', font: 'serif', motif: 'moon', align: 'center' },
    sunny: { label: 'Нартай мэнд', pal: 7, pattern: 'waves', font: 'bold', motif: 'sun', align: 'left' },
    gift: { label: 'Бэлгийн карт', pal: 10, pattern: 'stripes', font: 'sans', motif: 'gift', align: 'center' }
  };
  var TEMPLATE_ORDER = ['love', 'bday', 'letter', 'cheers', 'thanks', 'night', 'sunny', 'gift'];
  var HEX = /^#[0-9a-fA-F]{6}$/;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function fmt(ts) {
    if (!ts) return '';
    var d = new Date(ts), p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '.' + p(d.getMonth() + 1) + '.' + p(d.getDate());
  }

  function resolve(c) {
    var t = TEMPLATES[c.type] || TEMPLATES.love;
    var p = PALETTES[t.pal].c;
    return {
      type: TEMPLATES[c.type] ? c.type : 'love',
      c1: HEX.test(c.c1) ? c.c1 : p[0], c2: HEX.test(c.c2) ? c.c2 : p[1], ink: HEX.test(c.ink) ? c.ink : p[2],
      pattern: PATTERNS[c.pattern] ? c.pattern : t.pattern, font: FONTS[c.font] ? c.font : t.font,
      motif: MOTIFS[c.motif] ? c.motif : t.motif,
      align: c.align === 'center' ? 'center' : (c.align === 'left' ? 'left' : t.align)
    };
  }

  function patternLayers(p, ink) {
    var mix = function (pct) { return 'color-mix(in srgb, currentColor ' + pct + '%, transparent)'; };
    var img = [], size = [];
    function svgUrl(svg) { return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")'; }
    if (p === 'confetti') {
      img.push('radial-gradient(circle at 18% 78%,' + mix(18) + ' 0 5px,transparent 6px)');
      img.push('radial-gradient(circle at 82% 62%,' + mix(14) + ' 0 7px,transparent 8px)');
      img.push('radial-gradient(circle at 60% 90%,' + mix(18) + ' 0 4px,transparent 5px)');
      img.push('radial-gradient(circle at 34% 24%,' + mix(12) + ' 0 3px,transparent 4px)');
      img.push('radial-gradient(circle at 70% 12%,' + mix(14) + ' 0 5px,transparent 6px)');
      size = ['auto', 'auto', 'auto', 'auto', 'auto'];
    } else if (p === 'dots') {
      img.push('radial-gradient(' + mix(18) + ' 1.6px,transparent 2.2px)'); size.push('16px 16px');
    } else if (p === 'stripes') {
      img.push('repeating-linear-gradient(45deg,transparent 0 14px,' + mix(10) + ' 14px 28px)'); size.push('auto');
    } else if (p === 'waves') {
      img.push('repeating-radial-gradient(circle at 0 100%,transparent 0 18px,' + mix(12) + ' 18px 20px)'); size.push('auto');
    } else if (p === 'hearts') {
      img.push(svgUrl("<svg xmlns='http://www.w3.org/2000/svg' width='56' height='56'><path d='M28 42S12 32 12 21c0-5 4-9 8-9 3 0 6 2 8 5 2-3 5-5 8-5 4 0 8 4 8 9 0 11-16 21-16 21z' fill='" + ink + "' fill-opacity='.13'/></svg>")); size.push('56px 56px');
    } else if (p === 'stars') {
      img.push(svgUrl("<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60'><path d='M30 10l4 9 10 1-7.5 6.6 2.3 9.8L30 31l-8.8 5.4 2.3-9.8L16 20l10-1z' fill='" + ink + "' fill-opacity='.14'/></svg>")); size.push('60px 60px');
    }
    return { img: img, size: size };
  }

  function buildCard(c, ghost) {
    var d = resolve(c);
    var t = TEMPLATES[d.type];
    var card = el('article', 'card f-' + d.font + ' a-' + d.align + (d.pattern === 'lines' ? ' p-lines' : '') + (ghost ? ' ghosted' : ''));
    var pl = patternLayers(d.pattern, d.ink);
    card.style.backgroundImage = pl.img.concat(['linear-gradient(150deg,' + d.c1 + ',' + d.c2 + ')']).join(',');
    card.style.backgroundSize = pl.size.concat(['auto']).join(',');
    card.style.backgroundColor = d.c1;
    card.style.color = d.ink;
    var top = el('div', 'card-top');
    top.appendChild(el('span', 'chip', t.label));
    var m = el('span', 'motif');
    m.innerHTML = MOTIFS[d.motif].svg;
    top.appendChild(m);
    card.appendChild(top);
    var who = el('div');
    who.appendChild(el('div', 'to-label', 'Хэнд'));
    who.appendChild(el('div', 'to', String(c.to == null ? '' : c.to)));
    card.appendChild(who);
    card.appendChild(el('div', 'msg', String(c.message == null ? '' : c.message)));
    if (Array.isArray(c.imageSrcs) && c.imageSrcs.length) {
      var g = el('div', 'media-imgs' + (c.imageSrcs.length === 1 ? ' one' : ''));
      c.imageSrcs.slice(0, 3).forEach(function (src) {
        var im = document.createElement('img');
        im.src = src; im.alt = 'Мэндчилгээний зураг';
        g.appendChild(im);
      });
      card.appendChild(g);
    }
    var foot = el('div', 'card-foot');
    foot.appendChild(el('span', 'from', '— ' + String(c.from == null ? '' : c.from)));
    foot.appendChild(el('span', '', fmt(c.createdAt)));
    card.appendChild(foot);
    return card;
  }

  function imageUrls(cardId, n) {
    var out = [];
    for (var i = 0; i < Math.min(3, Number(n) || 0); i++) out.push('/api/cards/' + cardId + '/img/' + i);
    return out;
  }

  g.SC = {
    imageUrls: imageUrls,
    MOTIFS: MOTIFS, MOTIF_ORDER: MOTIF_ORDER, PATTERNS: PATTERNS, PATTERN_ORDER: PATTERN_ORDER, FONTS: FONTS, FONT_ORDER: FONT_ORDER,
    PALETTES: PALETTES, TEMPLATES: TEMPLATES, TEMPLATE_ORDER: TEMPLATE_ORDER, buildCard: buildCard, el: el
  };
})(window);
