/* Рецепты по продуктам: отметь что есть дома и какая есть техника → покажет что можно приготовить и чего не хватает */
(function () {
  const { Store, esc, toast, dateKey } = U;
  const TOOL_ICONS = { 'плита': '🔥', 'духовка': '♨️', 'микроволновка': '📡', 'блендер': '🌪', 'аэрогриль': '🌀', 'соковыжималка': '🍊' };
  let have = new Set(Store.get('rec:have', []));
  let custom = Store.get('rec:custom', []);
  let myTools = new Set(Store.get('rec:tools', ['плита', 'духовка', 'микроволновка', 'блендер']));
  let filt = Object.assign({ maxTime: 0, onlyReady: false, fav: false, q: '', tag: '', toolsOnly: true, sort: 'match' }, Store.get('rec:filter', {}));
  let favs = new Set(Store.get('rec:fav', []));
  let root;

  const collapsed = () => Store.get('rec:collapsed', window.innerWidth < 700 && have.size > 0);
  const saveHave = () => Store.set('rec:have', [...have]);
  const saveFilt = () => Store.set('rec:filter', filt);

  function analyze(r) {
    const missing = r.need.filter(i => !have.has(i));
    (r.any || []).forEach(group => { if (!group.some(i => have.has(i))) missing.push(group.join(' / ')); });
    const optHave = (r.opt || []).filter(i => have.has(i));
    const missTools = (r.tools || []).filter(g => !g.split('|').some(t => myTools.has(t)));
    return { r, missing, optHave, missTools };
  }

  function render(el) { root = el; draw(); }

  function ingChips(items) {
    return items.map(i => `<button class="chip ${have.has(i) ? 'on' : ''}" data-i="${esc(i)}">${esc(i)}</button>`).join('');
  }

  function draw() {
    const cats = Object.entries(INGREDIENTS);
    if (custom.length) cats.push(['⭐ Мои продукты', custom]);
    root.innerHTML = `<div class="page-head"><h1>🍳 Что приготовить</h1><p>Отметь продукты и технику — покажу, что можно приготовить прямо сейчас. Соль, сахар, перец и вода считаются всегда. ${RECIPES.length} рецептов.</p></div>
      <div class="card">
        <h2>🔌 Моя техника</h2>
        <div class="chips" id="tools">${APPLIANCES.map(t => `<button class="chip ${myTools.has(t) ? 'on' : ''}" data-tool="${esc(t)}">${TOOL_ICONS[t] || ''} ${esc(t)}</button>`).join('')}</div>
        <p class="small muted" style="margin:8px 0 0">Купишь аэрогриль — просто включи его тут, и откроются рецепты для него.</p>
      </div>
      <div class="card mt">
        <div class="row between mb"><h2 style="margin:0">🧺 У меня есть <span class="badge accent" id="haveCount">${have.size}</span></h2>
          <div class="row"><button class="btn ghost small" id="toggleAll">${collapsed() ? 'Показать все продукты' : 'Свернуть'}</button><button class="btn ghost small" id="clearHave">Очистить</button></div></div>
        <form id="ingForm" class="row nw mb"><input id="ingSearch" class="grow" placeholder="Поиск продукта… Нет в списке — нажми Enter, добавлю свой" autocomplete="off"><button class="btn ghost">＋</button></form>
        <div id="haveList" class="chips mb"></div>
        <div id="ings" class="${collapsed() ? 'hidden' : ''}">${cats.map(([cat, items]) => `<div class="mb ing-cat"><div class="small muted" style="margin-bottom:6px">${esc(cat)}</div>
          <div class="chips">${ingChips(items)}</div></div>`).join('')}</div>
      </div>
      <div class="card mt">
        <div class="chips mb" id="tags"><button class="chip ${!filt.tag ? 'on' : ''}" data-tag="">Все</button>${Object.entries(REC_TAGS).map(([k, l]) => `<button class="chip ${filt.tag === k ? 'on' : ''}" data-tag="${k}">${l}</button>`).join('')}</div>
        <div class="row">
          <label class="row small"><input type="checkbox" id="onlyReady" ${filt.onlyReady ? 'checked' : ''}> Только то, что могу прямо сейчас</label>
          <label class="row small"><input type="checkbox" id="toolsOnly" ${filt.toolsOnly ? 'checked' : ''}> Только с моей техникой</label>
          <label class="row small"><input type="checkbox" id="favOnly" ${filt.fav ? 'checked' : ''}> ❤️ Избранное</label>
        </div>
        <div class="row mt">
          <select id="maxTime" style="width:auto">${[[0, 'Любое время'], [5, 'до 5 мин'], [15, 'до 15 мин'], [30, 'до 30 мин'], [60, 'до 1 часа']].map(([v, l]) => `<option value="${v}" ${+filt.maxTime === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
          <select id="sort" style="width:auto">${[['match', 'Сначала то, что могу'], ['protein', 'Больше белка'], ['fast', 'Быстрее'], ['light', 'Меньше калорий']].map(([v, l]) => `<option value="${v}" ${filt.sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
          <input id="recQ" class="grow" placeholder="Поиск по названию" value="${esc(filt.q)}" style="max-width:260px">
          <button class="btn ghost small" id="randRec">🎲 Удиви меня</button>
        </div>
        <p class="small muted" id="recCount" style="margin:10px 0 0"></p>
      </div>
      <div id="recList" class="grid gauto mt"></div>`;
    bind();
    drawHave();
    drawList();
  }

  function drawHave() {
    root.querySelector('#haveCount').textContent = have.size;
    root.querySelector('#haveList').innerHTML = have.size ? [...have].map(i => `<button class="chip on" data-i="${esc(i)}" title="Убрать">${esc(i)} ✕</button>`).join('') : '';
  }

  function toggleIng(i) {
    have.has(i) ? have.delete(i) : have.add(i);
    saveHave();
    root.querySelectorAll(`[data-i="${CSS.escape(i)}"]`).forEach(b => b.classList.toggle('on', have.has(i)));
    drawHave(); drawList();
  }

  function bind() {
    root.querySelector('#tools').addEventListener('click', e => {
      const b = e.target.closest('[data-tool]'); if (!b) return;
      const t = b.dataset.tool; myTools.has(t) ? myTools.delete(t) : myTools.add(t);
      Store.set('rec:tools', [...myTools]); b.classList.toggle('on', myTools.has(t)); drawList();
    });
    const onIng = e => { const b = e.target.closest('[data-i]'); if (b) toggleIng(b.dataset.i); };
    root.querySelector('#ings').addEventListener('click', onIng);
    root.querySelector('#haveList').addEventListener('click', onIng);
    const search = root.querySelector('#ingSearch');
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      if (q) root.querySelector('#ings').classList.remove('hidden');
      root.querySelectorAll('#ings [data-i]').forEach(b => b.classList.toggle('hidden', !!q && !b.dataset.i.includes(q)));
      root.querySelectorAll('#ings .ing-cat').forEach(c => c.classList.toggle('hidden', !!q && !c.querySelector('[data-i]:not(.hidden)')));
    });
    root.querySelector('#ingForm').addEventListener('submit', e => {
      e.preventDefault();
      const q = search.value.trim().toLowerCase(); if (!q) return;
      const all = [...Object.values(INGREDIENTS).flat(), ...custom];
      const exact = all.find(i => i === q) || (all.filter(i => i.includes(q)).length === 1 ? all.find(i => i.includes(q)) : null);
      if (exact) { if (!have.has(exact)) toggleIng(exact); }
      else { custom.push(q); Store.set('rec:custom', custom); have.add(q); saveHave(); toast(`Добавил «${q}» в мои продукты`); draw(); return; }
      search.value = ''; search.dispatchEvent(new Event('input'));
    });
    root.querySelector('#toggleAll').addEventListener('click', () => { Store.set('rec:collapsed', !collapsed()); draw(); });
    root.querySelector('#clearHave').addEventListener('click', () => { if (!have.size || confirm('Снять отметки со всех продуктов?')) { have.clear(); saveHave(); draw(); } });
    root.querySelector('#tags').addEventListener('click', e => {
      const b = e.target.closest('[data-tag]'); if (!b) return;
      filt.tag = b.dataset.tag; saveFilt();
      root.querySelectorAll('#tags .chip').forEach(x => x.classList.toggle('on', x === b)); drawList();
    });
    const setF = (k, v) => { filt[k] = v; saveFilt(); drawList(); };
    root.querySelector('#onlyReady').addEventListener('change', e => setF('onlyReady', e.target.checked));
    root.querySelector('#toolsOnly').addEventListener('change', e => setF('toolsOnly', e.target.checked));
    root.querySelector('#favOnly').addEventListener('change', e => setF('fav', e.target.checked));
    root.querySelector('#maxTime').addEventListener('change', e => setF('maxTime', +e.target.value));
    root.querySelector('#sort').addEventListener('change', e => setF('sort', e.target.value));
    root.querySelector('#recQ').addEventListener('input', e => setF('q', e.target.value));
    root.querySelector('#randRec').addEventListener('click', () => {
      const pool0 = filtered();
      const ready = pool0.filter(x => !x.missing.length);
      const pool = ready.length ? ready : pool0;
      if (!pool.length) return toast('Нечего выбрать — сними фильтры');
      const pick = pool[Math.floor(Math.random() * pool.length)];
      filt.q = pick.r.n; saveFilt(); root.querySelector('#recQ').value = pick.r.n; drawList();
      setTimeout(() => root.querySelector('#recList details')?.setAttribute('open', ''), 0);
    });
    root.querySelector('#recList').addEventListener('click', e => {
      const f = e.target.closest('[data-fav]'), s = e.target.closest('[data-shop]');
      if (f) { const n = f.dataset.fav; favs.has(n) ? favs.delete(n) : favs.add(n); Store.set('rec:fav', [...favs]); drawList(); }
      if (s && window.Todo) {
        const a = analyze(RECIPES.find(r => r.n === s.dataset.shop));
        a.missing.forEach(m => Todo.add(`Купить: ${m} #покупки`, dateKey()));
        toast(`Добавил ${a.missing.length} в Дела на сегодня 🛒`);
      }
    });
  }

  function filtered() {
    const q = (filt.q || '').trim().toLowerCase();
    return RECIPES.map(analyze)
      .filter(x => !filt.tag || x.r.tags.includes(filt.tag))
      .filter(x => !filt.maxTime || x.r.t <= filt.maxTime)
      .filter(x => !filt.onlyReady || !x.missing.length)
      .filter(x => !filt.toolsOnly || !x.missTools.length)
      .filter(x => !filt.fav || favs.has(x.r.n))
      .filter(x => !q || x.r.n.toLowerCase().includes(q));
  }

  function drawList() {
    const list = filtered();
    const byMatch = (a, b) => a.missing.length - b.missing.length || b.optHave.length - a.optHave.length || a.r.t - b.r.t;
    const sorters = {
      match: byMatch,
      protein: (a, b) => (b.r.p || 0) - (a.r.p || 0) || byMatch(a, b),
      fast: (a, b) => a.r.t - b.r.t || byMatch(a, b),
      light: (a, b) => (a.r.kcal || 9999) - (b.r.kcal || 9999) || byMatch(a, b)
    };
    const readyFirst = (a, b) => (a.missing.length > 0) - (b.missing.length > 0);
    list.sort((a, b) => readyFirst(a, b) || (sorters[filt.sort] || byMatch)(a, b));
    const ready = list.filter(x => !x.missing.length).length;
    root.querySelector('#recCount').textContent = `Найдено: ${list.length} · можно приготовить сейчас: ${ready}`;
    const has = i => have.has(i) || (i.includes('/') && i.split('/').some(x => have.has(x)));
    root.querySelector('#recList').innerHTML = list.length ? list.map(({ r, missing, optHave, missTools }) => `<div class="card recipe">
        <div class="row between nw"><span class="emoji">${r.e}</span>
          <div class="row nw"><span class="badge">⏱ ${r.t} мин</span><button class="icon-btn" data-fav="${esc(r.n)}" title="В избранное">${favs.has(r.n) ? '❤️' : '🤍'}</button></div></div>
        <h3 style="margin:0">${esc(r.n)}</h3>
        <div class="row small" style="gap:4px">
          ${(r.tools || []).map(g => `<span class="badge" title="Техника">${g.split('|').map(t => (TOOL_ICONS[t] || '') + ' ' + t).join(' или ')}</span>`).join('')}
          ${r.p ? `<span class="badge good" title="Белок на порцию, примерно">💪 ${r.p} г белка</span>` : ''}
          ${r.kcal ? `<span class="badge" title="Калории на порцию, примерно">~${r.kcal} ккал</span>` : ''}
        </div>
        ${missTools.length ? `<div class="small"><span class="badge warn">Нужна техника: ${missTools.map(g => g.split('|').join(' / ')).join(', ')}</span></div>` : ''}
        ${missing.length ? `<div class="small"><span class="missing">Не хватает: ${missing.map(esc).join(', ')}</span></div>` : '<div><span class="badge good">✓ Все продукты есть</span></div>'}
        <div class="small muted">Нужно: ${[...r.need, ...(r.any || []).map(g => g.join('/'))].map(i => has(i) ? `<b style="color:var(--text)">${esc(i)}</b>` : esc(i)).join(', ')}</div>
        ${r.opt?.length ? `<div class="small muted">По желанию: ${r.opt.map(i => optHave.includes(i) ? `<b style="color:var(--text)">${esc(i)}</b>` : esc(i)).join(', ')}</div>` : ''}
        <details><summary class="small" style="cursor:pointer;color:var(--accent);font-weight:600">Как готовить</summary><ol class="recipe-steps small">${r.s.map(x => `<li>${esc(x)}</li>`).join('')}</ol>
          ${r.ag ? `<div class="note info small mt">🌀 ${esc(r.ag)}</div>` : ''}</details>
        ${missing.length && missing.length <= 3 ? `<button class="btn ghost small" data-shop="${esc(r.n)}" style="align-self:flex-start">🛒 Недостающее → в Дела</button>` : ''}
      </div>`).join('') : '<div class="card empty"><div class="big">🤷</div>Ничего не нашлось. Отметь больше продуктов или сними фильтры.</div>';
  }

  App.register({ id: 'recipes', title: 'Рецепты', icon: '🍳', render });
})();
