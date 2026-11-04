/* Полезные мелочи: привычки, вода, платежи, даты, делёж счёта, решалка, помидор, дыхание, пароли, заметки, единицы */
(function () {
  const { Store, esc, uid, fmt, num, toast, dateKey, addDays, parseKey, daysBetween, humanDate, plural, WD } = U;
  let root, tab = Store.get('ex:tab', 'habits'), timers = [];
  const clearTimers = () => { timers.forEach(t => { clearInterval(t); clearTimeout(t); }); timers = []; };

  const TABS = [['habits', '🔁 Привычки'], ['water', '💧 Вода'], ['bills', '🧾 Платежи и подписки'], ['dates', '🎂 Даты'], ['split', '🍽 Делим счёт'], ['decide', '🎲 Решалка'],
    ['pomo', '🍅 Помидор'], ['breath', '🫁 Дыхание'], ['pass', '🔐 Пароли'], ['notes', '📝 Заметки'], ['units', '📏 Единицы']];

  function render(el, rest) {
    root = el;
    if (rest && rest[0] && TABS.some(t => t[0] === rest[0])) tab = rest[0];
    draw();
  }
  function draw() {
    clearTimers();
    root.innerHTML = `<div class="page-head"><h1>🧰 Мелочи</h1><p>Маленькие штуки, которые экономят время и нервы.</p></div>
      <div class="tabs" id="xtabs">${TABS.map(([k, l]) => `<button class="tab ${tab === k ? 'active' : ''}" data-t="${k}">${l}</button>`).join('')}</div><div id="xbody"></div>`;
    root.querySelector('#xtabs').addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (b) { tab = b.dataset.t; Store.set('ex:tab', tab); draw(); } });
    const fns = { habits, water, bills, dates, split, decide, pomo, breath, pass, notes, units };
    fns[tab](root.querySelector('#xbody'));
  }

  // ---------- Привычки ----------
  function habits(el) {
    const list = Store.get('ex:habits', [{ id: uid(), name: '💧 2 л воды', log: {} }, { id: uid(), name: '🚶 Прогулка 20 мин', log: {} }, { id: uid(), name: '📚 10 страниц', log: {} }]);
    const days = Array.from({ length: 7 }, (_, i) => addDays(dateKey(), i - 6));
    const streak = h => { let n = 0, d = dateKey(); if (!h.log[d]) d = addDays(d, -1); while (h.log[d]) { n++; d = addDays(d, -1); } return n; };
    el.innerHTML = `<div class="card"><div class="habit-row" style="border:none"><span></span>${days.map(d => `<span class="small muted" style="text-align:center">${WD[parseKey(d).getDay()]}</span>`).join('')}<span></span></div>
      ${list.map(h => `<div class="habit-row" data-h="${h.id}"><span><b>${esc(h.name)}</b><br><span class="small muted">🔥 ${streak(h)} · всего ${Object.keys(h.log).length}</span></span>
        ${days.map(d => `<button class="day ${h.log[d] ? 'on' : ''} ${d === dateKey() ? 'today' : ''}" data-d="${d}">${parseKey(d).getDate()}</button>`).join('')}
        <button class="icon-btn" data-del>✕</button></div>`).join('')}
      <form class="row mt" id="hf"><input class="grow" id="hn" placeholder="Новая привычка (с эмодзи веселее 🙂)"><button class="btn">＋</button></form>
      <p class="small muted mt">Не ломай цепочку: отмечай каждый день. Пропустил один раз — ничего, не пропускай два подряд.</p></div>`;
    const save = () => Store.set('ex:habits', list);
    el.querySelectorAll('[data-h]').forEach(row => {
      const h = list.find(x => x.id === row.dataset.h);
      row.addEventListener('click', e => {
        const d = e.target.closest('[data-d]');
        if (d) { h.log[d.dataset.d] ? delete h.log[d.dataset.d] : h.log[d.dataset.d] = 1; save(); habits(el); }
        if (e.target.closest('[data-del]') && confirm('Удалить привычку?')) { list.splice(list.indexOf(h), 1); save(); habits(el); }
      });
    });
    el.querySelector('#hf').addEventListener('submit', e => { e.preventDefault(); const n = el.querySelector('#hn').value.trim(); if (!n) return; list.push({ id: uid(), name: n, log: {} }); save(); habits(el); });
    save();
  }

  // ---------- Вода ----------
  function water(el) {
    const goal = Store.get('ex:waterGoal', 8);
    const log = Store.get('ex:water', {});
    const t = dateKey(), n = log[t] || 0;
    const week = Array.from({ length: 7 }, (_, i) => addDays(t, i - 6));
    el.innerHTML = `<div class="grid g2"><div class="card"><h2>Сегодня: ${n} из ${goal} стаканов</h2>
      <div class="water">${Array.from({ length: Math.max(goal, n) }, (_, i) => `<button class="${i < n ? 'full' : ''}" data-w="${i + 1}" aria-label="Стакан ${i + 1}"></button>`).join('')}</div>
      <div class="row mt"><button class="btn" id="wPlus">＋ Стакан (250 мл)</button><button class="btn ghost" id="wMinus">−</button>
      <label class="row small muted">Цель <input id="wGoal" type="number" min="1" max="20" value="${goal}" style="width:70px"></label></div>
      <p class="small muted mt">≈ ${fmt(n * 0.25, 2)} л. Норма — примерно 30 мл на кг веса, больше в жару и при спорте.</p></div>
      <div class="card"><h2>Неделя</h2>${week.map(d => `<div class="row nw mt"><span class="small" style="width:70px">${WD[parseKey(d).getDay()]}, ${parseKey(d).getDate()}</span><div class="bar grow"><span style="width:${Math.min(100, (log[d] || 0) / goal * 100)}%"></span></div><span class="small num" style="width:30px">${log[d] || 0}</span></div>`).join('')}</div></div>`;
    const set = v => { log[t] = Math.max(0, v); Store.set('ex:water', log); water(el); };
    el.querySelector('#wPlus').onclick = () => { set(n + 1); if (n + 1 === goal) toast('Цель по воде выполнена 💧🎉'); };
    el.querySelector('#wMinus').onclick = () => set(n - 1);
    el.querySelectorAll('[data-w]').forEach(b => b.onclick = () => set(+b.dataset.w === n ? n - 1 : +b.dataset.w));
    el.querySelector('#wGoal').onchange = e => { Store.set('ex:waterGoal', Math.max(1, +e.target.value || 8)); water(el); };
  }

  // ---------- Платежи и подписки ----------
  function nextPay(b) {
    const now = new Date(); const t = dateKey();
    if (b.period === 'year') {
      const [mm, dd] = (b.date || '01-01').split('-').map(Number);
      let d = dateKey(new Date(now.getFullYear(), mm - 1, dd)); if (d < t) d = dateKey(new Date(now.getFullYear() + 1, mm - 1, dd)); return d;
    }
    const day = Math.min(28, Math.max(1, +b.day || 1));
    let d = dateKey(new Date(now.getFullYear(), now.getMonth(), day)); if (d < t) d = dateKey(new Date(now.getFullYear(), now.getMonth() + 1, day)); return d;
  }
  function bills(el) {
    const list = Store.get('ex:bills', []);
    const monthly = {}; list.forEach(b => { monthly[b.cur] = (monthly[b.cur] || 0) + (b.period === 'year' ? b.sum / 12 : b.sum); });
    const sorted = [...list].sort((a, b) => nextPay(a).localeCompare(nextPay(b)));
    el.innerHTML = `<div class="grid g2"><div class="card"><h2>Добавить</h2>
      <form id="bf" class="stack" style="gap:10px"><input id="bName" placeholder="Название: интернет, Spotify, аренда…" required>
        <div class="fields"><label class="field">Сумма<input id="bSum" inputmode="decimal" required></label>
          <label class="field">Валюта<select id="bCur">${['KZT', 'UZS', 'USD', 'RUB'].map(c => `<option>${c}</option>`).join('')}</select></label>
          <label class="field">Период<select id="bPer"><option value="month">Каждый месяц</option><option value="year">Раз в год</option></select></label>
          <label class="field" id="bDayF">Число месяца<input id="bDay" type="number" min="1" max="28" value="1"></label>
          <label class="field hidden" id="bDateF">Дата (ежегодно)<input id="bDate" type="date"></label></div>
        <button class="btn">Добавить</button></form></div>
      <div class="card"><h2>В месяц уходит</h2>${Object.keys(monthly).length ? Object.entries(monthly).map(([c, s]) => `<div class="stat"><span class="v">${fmt(s)} ${c}</span><span class="l">≈ ${fmt(s * 12)} ${c} в год</span></div>`).join('') : '<p class="muted small">Добавь регулярные платежи — будешь знать, сколько уходит и когда платить.</p>'}
        <p class="small muted mt">Раз в месяц пересматривай подписки — отменяй то, чем не пользуешься.</p></div></div>
      <div class="card mt"><h2>Ближайшие</h2>${sorted.length ? `<div class="table-wrap"><table>${sorted.map(b => { const d = nextPay(b), left = daysBetween(dateKey(), d); return `<tr><td><b>${esc(b.name)}</b><div class="small muted">${b.period === 'year' ? 'ежегодно' : 'ежемесячно'}</div></td>
        <td class="num nowrap">${fmt(b.sum)} ${b.cur}</td><td><span class="badge ${left <= 3 ? 'warn' : ''}">${humanDate(d)}</span></td>
        <td class="nowrap"><button class="icon-btn" data-todo="${b.id}" title="Добавить в Дела">✅</button><button class="icon-btn" data-del="${b.id}">🗑</button></td></tr>`; }).join('')}</table></div>` : '<p class="muted small">Пусто</p>'}</div>`;
    el.querySelector('#bPer').onchange = e => { el.querySelector('#bDayF').classList.toggle('hidden', e.target.value === 'year'); el.querySelector('#bDateF').classList.toggle('hidden', e.target.value !== 'year'); };
    el.querySelector('#bf').onsubmit = e => {
      e.preventDefault();
      const per = el.querySelector('#bPer').value;
      list.push({ id: uid(), name: el.querySelector('#bName').value.trim(), sum: num(el.querySelector('#bSum').value), cur: el.querySelector('#bCur').value, period: per,
        day: +el.querySelector('#bDay').value || 1, date: (el.querySelector('#bDate').value || dateKey()).slice(5) });
      Store.set('ex:bills', list); bills(el);
    };
    el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { Store.set('ex:bills', list.filter(x => x.id !== b.dataset.del)); bills(el); });
    el.querySelectorAll('[data-todo]').forEach(b => b.onclick = () => {
      const x = list.find(y => y.id === b.dataset.todo);
      window.Todo && Todo.add(`Оплатить ${x.name} — ${fmt(x.sum)} ${x.cur} ${x.period === 'year' ? '' : 'каждый месяц'} #счета`, nextPay(x));
      toast('Добавлено в Дела');
    });
  }

  // ---------- Даты ----------
  function dates(el) {
    const list = Store.get('ex:dates', []);
    const next = x => { if (!x.yearly) return x.date; const [, m, d] = x.date.split('-').map(Number); const y = new Date().getFullYear(); let k = dateKey(new Date(y, m - 1, d)); if (k < dateKey()) k = dateKey(new Date(y + 1, m - 1, d)); return k; };
    const sorted = list.map(x => ({ ...x, n: next(x) })).sort((a, b) => a.n.localeCompare(b.n));
    el.innerHTML = `<div class="card"><form id="df" class="row"><input class="grow" id="dName" placeholder="Что: ДР мамы, годовщина, отпуск, дедлайн…" required><input id="dDate" type="date" required style="width:auto">
      <label class="row small"><input type="checkbox" id="dYear" checked> каждый год</label><button class="btn">＋</button></form></div>
      <div class="grid gauto mt">${sorted.length ? sorted.map(x => { const left = daysBetween(dateKey(), x.n); const age = x.yearly ? parseKey(x.n).getFullYear() - +x.date.slice(0, 4) : 0; return `<div class="card">
        <div class="row between nw"><b>${esc(x.name)}</b><button class="icon-btn" data-del="${x.id}">✕</button></div>
        <div class="stat mt"><span class="v">${left === 0 ? '🎉 Сегодня!' : left < 0 ? 'прошло' : left + ' ' + plural(left, 'день', 'дня', 'дней')}</span><span class="l">${humanDate(x.n)}${age > 0 ? ` · ${age}-я годовщина / исполнится ${age}` : ''}</span></div></div>`; }).join('')
        : '<div class="card empty"><div class="big">🎂</div>Добавь дни рождения близких — больше не забудешь.</div>'}</div>`;
    el.querySelector('#df').onsubmit = e => { e.preventDefault(); list.push({ id: uid(), name: el.querySelector('#dName').value.trim(), date: el.querySelector('#dDate').value, yearly: el.querySelector('#dYear').checked }); Store.set('ex:dates', list); dates(el); };
    el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { Store.set('ex:dates', list.filter(x => x.id !== b.dataset.del)); dates(el); });
  }
  window.ExtrasDates = () => Store.get('ex:dates', []);
  window.ExtrasBills = () => Store.get('ex:bills', []).map(b => ({ ...b, next: nextPay(b) }));

  // ---------- Делим счёт ----------
  function split(el) {
    const v = Store.get('ex:split', { total: 0, people: 2, tip: 10, service: 0 });
    el.innerHTML = `<div class="grid g2"><div class="card"><div class="fields">
      <label class="field">Сумма счёта<input data-k="total" inputmode="decimal" value="${v.total || ''}"></label>
      <label class="field">Человек<input data-k="people" type="number" min="1" value="${v.people}"></label>
      <label class="field">Чаевые %<input data-k="tip" inputmode="decimal" value="${v.tip}"></label>
      <label class="field">Обслуживание % (если не включено)<input data-k="service" inputmode="decimal" value="${v.service}"></label></div>
      <div class="chips mt">${[0, 5, 10, 15].map(p => `<button class="chip" data-tip="${p}">${p}%</button>`).join('')}</div></div>
      <div class="card" id="splitOut"></div></div>`;
    const calc = () => {
      const service = v.total * v.service / 100, tip = (v.total + service) * v.tip / 100, all = v.total + service + tip, per = all / Math.max(1, v.people);
      el.querySelector('#splitOut').innerHTML = `<h2>Каждый платит</h2><div class="stat"><span class="v">${fmt(Math.ceil(per))}</span><span class="l">с человека (округлено вверх)</span></div>
        <table class="mt"><tr><td>Счёт</td><td class="num">${fmt(v.total)}</td></tr><tr><td>Обслуживание</td><td class="num">${fmt(service)}</td></tr><tr><td>Чаевые</td><td class="num">${fmt(tip)}</td></tr><tr><td><b>Итого</b></td><td class="num"><b>${fmt(all)}</b></td></tr></table>`;
    };
    el.querySelectorAll('[data-k]').forEach(i => i.oninput = () => { v[i.dataset.k] = num(i.value); Store.set('ex:split', v); calc(); });
    el.querySelectorAll('[data-tip]').forEach(b => b.onclick = () => { v.tip = +b.dataset.tip; el.querySelector('[data-k="tip"]').value = v.tip; Store.set('ex:split', v); calc(); });
    calc();
  }

  // ---------- Решалка ----------
  function decide(el) {
    const opts = Store.get('ex:decide', 'Плов\nШаурма\nПицца\nЛагман\nПриготовить дома');
    el.innerHTML = `<div class="grid g2"><div class="card"><h2>Не можешь выбрать?</h2>
      <label class="field">Варианты (каждый с новой строки)<textarea id="dOpts" rows="6">${esc(opts)}</textarea></label>
      <div class="row mt"><button class="btn" id="dGo">🎲 Выбрать за меня</button><button class="btn ghost" id="coin">🪙 Монетка</button><button class="btn ghost" id="dice">🎲 Кубик</button><button class="btn ghost" id="yesno">❓ Да/Нет</button></div></div>
      <div class="card" style="display:grid;place-items:center;text-align:center;min-height:200px"><div><div class="muted small">Результат</div><div id="dRes" style="font-size:2rem;font-weight:800;margin-top:8px">—</div></div></div></div>`;
    const res = el.querySelector('#dRes');
    const spin = (arr) => { let i = 0; const t = setInterval(() => { res.textContent = arr[Math.floor(Math.random() * arr.length)]; if (++i > 14) { clearInterval(t); res.textContent = '👉 ' + arr[Math.floor(Math.random() * arr.length)]; } }, 70); timers.push(t); };
    el.querySelector('#dOpts').oninput = e => Store.set('ex:decide', e.target.value);
    el.querySelector('#dGo').onclick = () => { const a = el.querySelector('#dOpts').value.split('\n').map(s => s.trim()).filter(Boolean); if (a.length) spin(a); };
    el.querySelector('#coin').onclick = () => spin(['Орёл', 'Решка']);
    el.querySelector('#dice').onclick = () => spin(['1', '2', '3', '4', '5', '6']);
    el.querySelector('#yesno').onclick = () => spin(['Да', 'Нет', 'Определённо да', 'Лучше нет', 'Спроси завтра']);
  }

  // ---------- Помидор ----------
  function pomo(el) {
    const st = Store.get('ex:pomo', { work: 25, rest: 5, count: {} });
    let left = st.work * 60, mode = 'work', running = false, t = null;
    el.innerHTML = `<div class="card" style="text-align:center"><div class="muted" id="pMode">Работа</div>
      <div id="pTime" class="num" style="font-size:4rem;font-weight:800;letter-spacing:-.02em">${String(st.work).padStart(2, '0')}:00</div>
      <div class="row" style="justify-content:center"><button class="btn big" id="pStart">▶ Старт</button><button class="btn ghost big" id="pReset">↺</button><button class="btn ghost big" id="pSkip">⏭</button></div>
      <div class="row mt" style="justify-content:center"><label class="row small muted">Работа <input id="pW" type="number" value="${st.work}" style="width:64px"> мин</label><label class="row small muted">Отдых <input id="pR" type="number" value="${st.rest}" style="width:64px"> мин</label></div>
      <p class="small muted mt">Сегодня помидоров: <b id="pCount">${st.count[dateKey()] || 0}</b> 🍅</p></div>`;
    const show = () => { el.querySelector('#pTime').textContent = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`; el.querySelector('#pMode').textContent = mode === 'work' ? '🧠 Работа' : '☕ Отдых'; document.title = el.querySelector('#pTime').textContent + ' · Помидор'; };
    const switchMode = () => {
      if (mode === 'work') { st.count[dateKey()] = (st.count[dateKey()] || 0) + 1; Store.set('ex:pomo', st); el.querySelector('#pCount').textContent = st.count[dateKey()]; }
      mode = mode === 'work' ? 'rest' : 'work'; left = (mode === 'work' ? st.work : st.rest) * 60; show();
      toast(mode === 'work' ? 'Отдых окончен — за работу 💪' : 'Помидор готов! Отдохни ☕'); beep();
    };
    el.querySelector('#pStart').onclick = e => {
      running = !running; e.target.textContent = running ? '⏸ Пауза' : '▶ Старт';
      if (running) { t = setInterval(() => { left--; if (left <= 0) switchMode(); show(); }, 1000); timers.push(t); } else clearInterval(t);
    };
    el.querySelector('#pReset').onclick = () => { left = (mode === 'work' ? st.work : st.rest) * 60; show(); };
    el.querySelector('#pSkip').onclick = () => switchMode();
    el.querySelector('#pW').onchange = e => { st.work = Math.max(1, +e.target.value); Store.set('ex:pomo', st); if (mode === 'work' && !running) { left = st.work * 60; show(); } };
    el.querySelector('#pR').onchange = e => { st.rest = Math.max(1, +e.target.value); Store.set('ex:pomo', st); };
  }
  function beep() { try { const a = new AudioContext(), o = a.createOscillator(), g = a.createGain(); o.connect(g); g.connect(a.destination); o.frequency.value = 880; g.gain.value = .1; o.start(); o.stop(a.currentTime + .4); navigator.vibrate && navigator.vibrate(300); } catch (e) {} }

  // ---------- Дыхание ----------
  function breath(el) {
    const modes = { box: ['Квадратное 4-4-4-4 (успокоиться, собраться)', [['Вдох', 4, 1.35], ['Задержка', 4, 1.35], ['Выдох', 4, 1], ['Задержка', 4, 1]]], relax: ['4-7-8 (уснуть, снять тревогу)', [['Вдох', 4, 1.35], ['Задержка', 7, 1.35], ['Выдох', 8, 1]]], calm: ['Спокойное 5-5 (снизить стресс)', [['Вдох', 5, 1.35], ['Выдох', 5, 1]]] };
    let m = Store.get('ex:breath', 'box');
    el.innerHTML = `<div class="card" style="text-align:center"><div class="chips" style="justify-content:center">${Object.entries(modes).map(([k, [l]]) => `<button class="chip ${k === m ? 'on' : ''}" data-m="${k}">${l}</button>`).join('')}</div>
      <div class="breath" id="circle">Нажми старт</div><button class="btn big" id="bGo">▶ Старт</button><p class="small muted mt">5–10 циклов достаточно. Дыши носом, выдыхай медленно.</p></div>`;
    el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { Store.set('ex:breath', b.dataset.m); clearTimers(); breath(el); });
    const c = el.querySelector('#circle');
    el.querySelector('#bGo').onclick = e => {
      if (timers.length) { clearTimers(); c.textContent = 'Нажми старт'; c.style.transform = 'scale(1)'; e.target.textContent = '▶ Старт'; return; }
      e.target.textContent = '⏹ Стоп';
      const phases = modes[m][1]; let i = 0;
      const run = () => { const [name, sec, scale] = phases[i % phases.length]; c.style.transitionDuration = sec + 's'; c.style.transform = `scale(${scale})`;
        let s = sec; c.textContent = `${name} ${s}`; const iv = setInterval(() => { s--; if (s > 0) c.textContent = `${name} ${s}`; }, 1000); timers.push(iv);
        timers.push(setTimeout(() => { clearInterval(iv); i++; run(); }, sec * 1000)); };
      timers.push(0); run();
    };
  }

  // ---------- Пароли ----------
  function pass(el) {
    const o = Store.get('ex:pass', { len: 16, digits: true, symbols: true, words: false });
    el.innerHTML = `<div class="card"><div class="pw" id="pw"></div>
      <div class="row mt"><button class="btn" id="pwNew">↻ Новый</button><button class="btn ghost" id="pwCopy">📋 Копировать</button></div>
      <div class="row mt"><label class="row small">Длина <input id="pwLen" type="range" min="8" max="40" value="${o.len}"><b id="pwLenV">${o.len}</b></label>
        <label class="row small"><input type="checkbox" id="pwD" ${o.digits ? 'checked' : ''}> цифры</label><label class="row small"><input type="checkbox" id="pwS" ${o.symbols ? 'checked' : ''}> символы</label>
        <label class="row small"><input type="checkbox" id="pwW" ${o.words ? 'checked' : ''}> из слов (легко запомнить)</label></div>
      <p class="small muted mt">Генерируется прямо в браузере, никуда не отправляется.</p></div>`;
    const WORDS = 'sun moon tree river stone cloud tiger apple green blue fast happy coffee winter summer orange silver rocket pizza garden window guitar planet yellow dragon forest ocean candle'.split(' ');
    const rnd = n => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; };
    const gen = () => {
      let s;
      if (o.words) { s = Array.from({ length: Math.max(3, Math.round(o.len / 5)) }, () => WORDS[rnd(WORDS.length)]).map(w => w[0].toUpperCase() + w.slice(1)).join('-') + (o.digits ? rnd(100) : ''); }
      else { let chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ'; if (o.digits) chars += '23456789'; if (o.symbols) chars += '!@#$%^&*-_=+?'; s = Array.from({ length: o.len }, () => chars[rnd(chars.length)]).join(''); }
      el.querySelector('#pw').textContent = s;
    };
    const save = () => { Store.set('ex:pass', o); gen(); };
    el.querySelector('#pwNew').onclick = gen;
    el.querySelector('#pwCopy').onclick = () => navigator.clipboard?.writeText(el.querySelector('#pw').textContent).then(() => toast('Скопировано'));
    el.querySelector('#pwLen').oninput = e => { o.len = +e.target.value; el.querySelector('#pwLenV').textContent = o.len; save(); };
    el.querySelector('#pwD').onchange = e => { o.digits = e.target.checked; save(); };
    el.querySelector('#pwS').onchange = e => { o.symbols = e.target.checked; save(); };
    el.querySelector('#pwW').onchange = e => { o.words = e.target.checked; save(); };
    gen();
  }

  // ---------- Заметки ----------
  function notes(el) {
    const list = Store.get('ex:notes', []);
    el.innerHTML = `<div class="card"><textarea id="nNew" rows="3" placeholder="Быстрая заметка: номер, идея, список, ссылка… (Ctrl+Enter — сохранить)"></textarea>
      <div class="row mt"><button class="btn" id="nAdd">Сохранить</button><input id="nQ" class="grow" placeholder="Поиск по заметкам" style="max-width:280px"></div></div>
      <div class="grid gauto mt" id="nList"></div>`;
    const drawList = () => {
      const q = el.querySelector('#nQ').value.toLowerCase();
      const items = list.filter(n => !q || n.text.toLowerCase().includes(q)).sort((a, b) => (b.pin - a.pin) || b.ts - a.ts);
      el.querySelector('#nList').innerHTML = items.length ? items.map(n => `<div class="card" data-n="${n.id}"><div style="white-space:pre-wrap;word-break:break-word">${esc(n.text)}</div>
        <div class="row between mt"><span class="small muted">${new Date(n.ts).toLocaleDateString('ru-RU')}</span><span><button class="icon-btn" data-a="pin">${n.pin ? '📌' : '📍'}</button><button class="icon-btn" data-a="copy">📋</button><button class="icon-btn" data-a="del">🗑</button></span></div></div>`).join('')
        : '<div class="card empty">Заметок нет</div>';
    };
    const add = () => { const t = el.querySelector('#nNew').value.trim(); if (!t) return; list.push({ id: uid(), text: t, ts: Date.now(), pin: false }); Store.set('ex:notes', list); el.querySelector('#nNew').value = ''; drawList(); };
    el.querySelector('#nAdd').onclick = add;
    el.querySelector('#nNew').onkeydown = e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) add(); };
    el.querySelector('#nQ').oninput = drawList;
    el.querySelector('#nList').onclick = e => {
      const b = e.target.closest('[data-a]'); if (!b) return; const n = list.find(x => x.id === b.closest('[data-n]').dataset.n);
      if (b.dataset.a === 'pin') n.pin = !n.pin;
      if (b.dataset.a === 'copy') { navigator.clipboard?.writeText(n.text).then(() => toast('Скопировано')); return; }
      if (b.dataset.a === 'del') { if (!confirm('Удалить заметку?')) return; list.splice(list.indexOf(n), 1); }
      Store.set('ex:notes', list); drawList();
    };
    drawList();
  }

  // ---------- Единицы ----------
  function units(el) {
    const G = {
      'Длина': { 'мм': .001, 'см': .01, 'м': 1, 'км': 1000, 'дюйм': .0254, 'фут': .3048, 'ярд': .9144, 'миля': 1609.344 },
      'Вес': { 'г': 1, 'кг': 1000, 'т': 1e6, 'унция': 28.3495, 'фунт': 453.592 },
      'Объём': { 'мл': 1, 'л': 1000, 'стакан (250)': 250, 'ст. ложка': 15, 'ч. ложка': 5, 'галлон (US)': 3785.41, 'жидк. унция': 29.5735 },
      'Площадь': { 'м²': 1, 'сотка': 100, 'гектар': 10000, 'км²': 1e6, 'фут²': .092903 },
      'Скорость': { 'км/ч': 1, 'м/с': 3.6, 'миль/ч': 1.609344, 'узел': 1.852 },
      'Данные': { 'КБ': 1, 'МБ': 1024, 'ГБ': 1048576, 'ТБ': 1073741824 }
    };
    let g = Store.get('ex:unitG', 'Длина');
    el.innerHTML = `<div class="grid g2"><div class="card"><div class="tabs">${[...Object.keys(G), 'Температура'].map(k => `<button class="tab ${k === g ? 'active' : ''}" data-g="${k}">${k}</button>`).join('')}</div>
      <div class="fields"><label class="field">Значение<input id="uV" inputmode="decimal" value="1"></label>${g === 'Температура' ? `<label class="field">Из<select id="uF"><option>°C</option><option>°F</option></select></label>` : `<label class="field">Из<select id="uF">${Object.keys(G[g]).map(u => `<option>${u}</option>`).join('')}</select></label>`}</div></div>
      <div class="card"><table id="uOut"></table></div></div>`;
    el.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { Store.set('ex:unitG', b.dataset.g); units(el); });
    const calc = () => {
      const v = num(el.querySelector('#uV').value), f = el.querySelector('#uF').value;
      if (g === 'Температура') { const c = f === '°C' ? v : (v - 32) * 5 / 9; el.querySelector('#uOut').innerHTML = `<tr><td>°C</td><td class="num"><b>${fmt(c, 1)}</b></td></tr><tr><td>°F</td><td class="num"><b>${fmt(c * 9 / 5 + 32, 1)}</b></td></tr><tr><td>K</td><td class="num"><b>${fmt(c + 273.15, 1)}</b></td></tr>`; return; }
      const base = v * G[g][f];
      el.querySelector('#uOut').innerHTML = Object.entries(G[g]).filter(([u]) => u !== f).map(([u, k]) => `<tr><td>${u}</td><td class="num"><b>${U.fmtSmart(base / k)}</b></td></tr>`).join('');
    };
    el.querySelector('#uV').oninput = calc; el.querySelector('#uF').onchange = calc; calc();
  }

  App.register({ id: 'extras', title: 'Мелочи', icon: '🧰', render, destroy: clearTimers });
})();
