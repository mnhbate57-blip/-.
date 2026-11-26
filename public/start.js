(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('box-form');
  if (!form) return;
  function load() { try { return localStorage.getItem('ss_box'); } catch (e) { return null; } }
  function save(v) { try { localStorage.setItem('ss_box', v); } catch (e) {} }

  var mine = load();
  if (mine && /^[a-f0-9]{32}$/.test(mine)) { $('box-mine').href = '/inbox/' + mine; $('box-mine').hidden = false; }

  var busy = false;
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var name = $('box-name').value.trim();
    var st = $('box-status');
    if (!name) { st.textContent = 'Нэрээ бичнэ үү.'; st.className = 'status bad'; return; }
    if (busy) return;
    busy = true; $('box-btn').disabled = true; st.textContent = 'Үүсгэж байна…'; st.className = 'status';
    fetch('/api/mailboxes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
      .then(function (r) {
        if (!r.ok) { st.textContent = (r.body && r.body.error) || 'Алдаа гарлаа.'; st.className = 'status bad'; return; }
        save(r.body.ownerKey);
        location.href = '/inbox/' + r.body.ownerKey + '?new=1';
      })
      .catch(function () { st.textContent = 'Сервертэй холбогдож чадсангүй.'; st.className = 'status bad'; })
      .then(function () { busy = false; $('box-btn').disabled = false; });
  });
})();
