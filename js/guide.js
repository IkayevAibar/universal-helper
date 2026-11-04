/* Большой гайд: значки на одежде (с расшифровкой ярлыка) + статьи с поиском */
(function () {
  const { Store, esc } = U;
  let root, cat = Store.get('guide:cat', 'symbols'), q = '';
  let picked = [];

  const cats = () => ['symbols', ...new Set(GUIDE.map(g => g.cat))];
  const plain = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

  function render(el) { root = el; draw(); }

  function draw() {
    root.innerHTML = `<div class="page-head"><h1>📖 Большой гайд</h1><p>Как стирать по значкам, выводить пятна, хранить еду, первая помощь и другие житейские штуки.</p></div>
      <input class="guide-search" id="gq" placeholder="🔎 Поиск по гайду: «кровь», «шерсть», «накипь», «рис»…" value="${esc(q)}">
      <div class="tabs" id="gtabs">${cats().map(c => `<button class="tab ${c === cat && !q ? 'active' : ''}" data-c="${esc(c)}">${c === 'symbols' ? '🏷 Значки на одежде' : esc(c)}</button>`).join('')}</div>
      <div id="gbody"></div>`;
    root.querySelector('#gtabs').addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (b) { cat = b.dataset.c; q = ''; Store.set('guide:cat', cat); draw(); } });
    const inp = root.querySelector('#gq');
    inp.addEventListener('input', () => { q = inp.value; root.querySelectorAll('#gtabs .tab').forEach(t => t.classList.toggle('active', !q && t.dataset.c === cat)); body(); });
    body();
  }

  function body() {
    const el = root.querySelector('#gbody');
    const query = q.trim().toLowerCase();
    if (query) return search(el, query);
    if (cat === 'symbols') return symbols(el);
    el.innerHTML = GUIDE.filter(g => g.cat === cat).map((g, i) => `<details class="acc" ${i === 0 ? 'open' : ''}><summary>${esc(g.title)}</summary><div class="acc-body">${g.html}</div></details>`).join('');
  }

  function search(el, query) {
    const re = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    const sym = LAUNDRY.flatMap(g => g.items).filter(([, t]) => t.toLowerCase().includes(query));
    const arts = GUIDE.filter(g => (g.title + ' ' + plain(g.html)).toLowerCase().includes(query));
    const mark = html => html.replace(/>([^<]+)</g, (m, t) => '>' + t.replace(re, '<mark>$1</mark>') + '<');
    el.innerHTML = (sym.length ? `<div class="card mb"><h3>Значки</h3><div class="sym-grid">${sym.map(([s, t]) => symHTML(s, t)).join('')}</div></div>` : '') +
      (arts.length ? arts.map(g => `<details class="acc" open><summary>${esc(g.title)} <span class="badge">${esc(g.cat)}</span></summary><div class="acc-body">${mark('>' + g.html + '<').slice(1, -1)}</div></details>`).join('')
        : (sym.length ? '' : '<div class="card empty"><div class="big">🤔</div>Ничего не нашёл. Попробуй другое слово.</div>'));
  }

  const symHTML = (s, t, on) => `<button class="sym ${on ? 'chip on' : ''}" data-s="${esc(s)}" style="text-align:left;cursor:pointer;font:inherit;color:inherit${on ? ';border-color:var(--accent)' : ''}">${LaundryIcon(s)}<span class="t">${esc(t)}</span></button>`;

  function symbols(el) {
    const all = Object.fromEntries(LAUNDRY.flatMap(g => g.items));
    el.innerHTML = `<div class="card mb"><h2>🔍 Расшифруй свой ярлык</h2>
        <p class="small muted">Нажми на значки, которые видишь на ярлыке вещи, — соберу инструкцию по уходу.</p>
        <div id="picked">${picked.length ? `<ol>${picked.map(s => `<li>${esc(all[s])}</li>`).join('')}</ol><button class="btn ghost small" id="clearPick">Сбросить</button>` : '<p class="muted small">Пока ничего не выбрано.</p>'}</div></div>
      <div class="card">${LAUNDRY.map(g => `<div class="sym-group"><h3>${esc(g.group)}</h3><div class="sym-grid">${g.items.map(([s, t]) => symHTML(s, t, picked.includes(s))).join('')}</div></div>`).join('')}
        <div class="note info mt small">Подсказка: <b>чем больше точек — тем горячее</b>, <b>черта снизу — деликатнее</b>, <b>крест — нельзя</b>. Ванночка — стирка, треугольник — отбеливание, квадрат — сушка, утюг — глажка, круг — химчистка.</div></div>`;
    el.querySelectorAll('[data-s]').forEach(b => b.addEventListener('click', () => {
      const s = b.dataset.s; picked = picked.includes(s) ? picked.filter(x => x !== s) : [...picked, s]; symbols(el);
    }));
    el.querySelector('#clearPick')?.addEventListener('click', () => { picked = []; symbols(el); });
  }

  App.register({ id: 'guide', title: 'Гайд', icon: '📖', render });
})();
