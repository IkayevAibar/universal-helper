/* Рецепты по продуктам: отметь что есть дома → покажет что можно приготовить и чего не хватает */
(function () {
  const { Store, esc, toast, dateKey } = U;
  let have = new Set(Store.get('rec:have', []));
  let filt = Store.get('rec:filter', { maxTime: 0, onlyReady: false, fav: false, q: '' });
  let favs = new Set(Store.get('rec:fav', []));
  let root;

  const saveHave = () => Store.set('rec:have', [...have]);

  function analyze(r) {
    const missing = r.need.filter(i => !have.has(i));
    (r.any || []).forEach(group => { if (!group.some(i => have.has(i))) missing.push(group.join(' / ')); });
    const optHave = (r.opt || []).filter(i => have.has(i));
    const total = r.need.length + (r.any || []).length;
    return { r, missing, optHave, pct: (total - missing.length) / total };
  }

  function render(el) { root = el; draw(); }

  function draw() {
    root.innerHTML = `<div class="page-head"><h1>🍳 Что приготовить</h1><p>Отметь, что есть дома — покажу, что можно приготовить прямо сейчас. Соль, сахар, перец и вода — считаются всегда.</p></div>
      <div class="card">
        <div class="row between mb"><h2 style="margin:0">🧺 У меня есть <span class="badge accent" id="haveCount">${have.size}</span></h2>
          <button class="btn ghost small" id="clearHave">Очистить</button></div>
        <input id="ingSearch" placeholder="Быстрый поиск продукта…" class="mb">
        <div id="ings">${Object.entries(INGREDIENTS).map(([cat, items]) => `<div class="mb"><div class="small muted mb" style="margin-bottom:6px">${cat}</div>
          <div class="chips">${items.map(i => `<button class="chip ${have.has(i) ? 'on' : ''}" data-i="${esc(i)}">${esc(i)}</button>`).join('')}</div></div>`).join('')}</div>
      </div>
      <div class="card mt">
        <div class="row">
          <label class="row small"><input type="checkbox" id="onlyReady" ${filt.onlyReady ? 'checked' : ''}> Только то, что могу прямо сейчас</label>
          <label class="row small"><input type="checkbox" id="favOnly" ${filt.fav ? 'checked' : ''}> ❤️ Избранное</label>
          <select id="maxTime" style="width:auto">${[[0, 'Любое время'], [15, 'до 15 мин'], [30, 'до 30 мин'], [60, 'до 1 часа']].map(([v, l]) => `<option value="${v}" ${+filt.maxTime === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
          <input id="recQ" class="grow" placeholder="Поиск по названию" value="${esc(filt.q)}" style="max-width:260px">
          <button class="btn ghost small" id="randRec">🎲 Удиви меня</button>
        </div>
      </div>
      <div id="recList" class="grid gauto mt"></div>`;
    bind();
    drawList();
  }

  function bind() {
    root.querySelector('#ings').addEventListener('click', e => {
      const b = e.target.closest('[data-i]'); if (!b) return;
      const i = b.dataset.i; have.has(i) ? have.delete(i) : have.add(i);
      b.classList.toggle('on'); saveHave(); root.querySelector('#haveCount').textContent = have.size; drawList();
    });
    root.querySelector('#ingSearch').addEventListener('input', e => {
      const q = e.target.value.trim().toLowerCase();
      root.querySelectorAll('#ings [data-i]').forEach(b => b.classList.toggle('hidden', q && !b.dataset.i.includes(q)));
    });
    root.querySelector('#clearHave').addEventListener('click', () => { have.clear(); saveHave(); draw(); });
    const setF = (k, v) => { filt[k] = v; Store.set('rec:filter', filt); drawList(); };
    root.querySelector('#onlyReady').addEventListener('change', e => setF('onlyReady', e.target.checked));
    root.querySelector('#favOnly').addEventListener('change', e => setF('fav', e.target.checked));
    root.querySelector('#maxTime').addEventListener('change', e => setF('maxTime', +e.target.value));
    root.querySelector('#recQ').addEventListener('input', e => setF('q', e.target.value));
    root.querySelector('#randRec').addEventListener('click', () => {
      const ready = RECIPES.map(analyze).filter(x => !x.missing.length);
      const pool = ready.length ? ready : RECIPES.map(analyze);
      const pick = pool[Math.floor(Math.random() * pool.length)];
      filt.q = pick.r.n; Store.set('rec:filter', filt); root.querySelector('#recQ').value = pick.r.n; drawList();
      setTimeout(() => root.querySelector('#recList details')?.setAttribute('open', ''), 0);
    });
    root.querySelector('#recList').addEventListener('click', e => {
      const f = e.target.closest('[data-fav]'), s = e.target.closest('[data-shop]');
      if (f) { const n = f.dataset.fav; favs.has(n) ? favs.delete(n) : favs.add(n); Store.set('rec:fav', [...favs]); drawList(); }
      if (s) {
        const a = analyze(RECIPES.find(r => r.n === s.dataset.shop));
        if (window.Todo) { a.missing.forEach(m => Todo.add(`Купить: ${m} #покупки`, dateKey())); toast(`Добавил ${a.missing.length} в Дела на сегодня 🛒`); }
      }
    });
  }

  function drawList() {
    const q = (filt.q || '').trim().toLowerCase();
    let list = RECIPES.map(analyze)
      .filter(x => !filt.maxTime || x.r.t <= filt.maxTime)
      .filter(x => !filt.onlyReady || !x.missing.length)
      .filter(x => !filt.fav || favs.has(x.r.n))
      .filter(x => !q || x.r.n.toLowerCase().includes(q));
    list.sort((a, b) => a.missing.length - b.missing.length || b.optHave.length - a.optHave.length || a.r.t - b.r.t);
    const el = root.querySelector('#recList');
    if (!have.size && !q && !filt.fav) {
      list = list.slice(0, 60);
    }
    el.innerHTML = list.length ? list.map(({ r, missing, optHave }) => `<div class="card recipe">
        <div class="row between nw"><span class="emoji">${r.e}</span>
          <div class="row nw"><span class="badge">⏱ ${r.t} мин</span><button class="icon-btn" data-fav="${esc(r.n)}" title="В избранное">${favs.has(r.n) ? '❤️' : '🤍'}</button></div></div>
        <h3 style="margin:0">${esc(r.n)}</h3>
        ${missing.length ? `<div class="small"><span class="missing">Не хватает: ${missing.map(esc).join(', ')}</span></div>` : '<div><span class="badge good">✓ Можно готовить</span></div>'}
        <div class="small muted">Нужно: ${[...r.need, ...(r.any || []).map(g => g.join('/'))].map(i => have.has(i) || (i.includes('/') && i.split('/').some(x => have.has(x))) ? `<b style="color:var(--text)">${esc(i)}</b>` : esc(i)).join(', ')}</div>
        ${r.opt?.length ? `<div class="small muted">По желанию: ${r.opt.map(i => optHave.includes(i) ? `<b style="color:var(--text)">${esc(i)}</b>` : esc(i)).join(', ')}</div>` : ''}
        <details><summary class="small" style="cursor:pointer;color:var(--accent);font-weight:600">Как готовить</summary><ol class="recipe-steps small">${r.s.map(x => `<li>${esc(x)}</li>`).join('')}</ol></details>
        ${missing.length && missing.length <= 3 ? `<button class="btn ghost small" data-shop="${esc(r.n)}" style="align-self:flex-start">🛒 Недостающее → в Дела</button>` : ''}
      </div>`).join('') : '<div class="card empty"><div class="big">🤷</div>Ничего не нашлось. Отметь больше продуктов или сними фильтры.</div>';
  }

  App.register({ id: 'recipes', title: 'Рецепты', icon: '🍳', render });
})();
