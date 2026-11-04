/* TO-DO для ленивых: умный ввод, «одна задача», перенос просрочки, наборы, серии */
(function () {
  const { Store, esc, uid, dateKey, addDays, parseKey, daysBetween, humanDate, plural, toast } = U;
  const KEY = 'todo:tasks';
  let tasks = Store.get(KEY, []);
  let view = Store.get('todo:view', 'today');
  let root, timer = null;

  const save = () => Store.set(KEY, tasks);
  const today = () => dateKey();

  const PRAISE = ['Красавчик! 💪', 'Минус одна! ✨', 'Так держать 🔥', 'Вот это продуктивность 😎', 'Ещё чуть-чуть и можно отдыхать 🛋', 'Сделано — и забыто ✅'];

  const PACKS = {
    '☀️ Утро': ['Выпить стакан воды', 'Заправить кровать', 'Умыться и почистить зубы', 'Позавтракать', 'Посмотреть дела на день'],
    '🧹 Быстрая уборка': ['Вынести мусор', 'Помыть посуду', 'Протереть стол и раковину', 'Разложить вещи по местам (10 мин)', 'Пропылесосить'],
    '🛒 Базовые покупки': ['Хлеб', 'Яйца', 'Молоко', 'Овощи', 'Чай/кофе', 'Средство для посуды'],
    '✈️ Перед поездкой': ['Паспорт и документы', 'Зарядки и пауэрбанк', 'Билеты/бронь в телефоне', 'Деньги/карты, сообщить банку', 'Лекарства', 'Выключить технику и воду'],
    '💼 Поиск работы': ['Обновить резюме', 'Откликнуться на 3 вакансии', 'Написать одному знакомому про работу', 'Решить 1 задачу/потренироваться'],
    '🧾 Раз в месяц': ['Оплатить коммуналку', 'Пополнить телефон и интернет', 'Отложить деньги в подушку', 'Проверить подписки', 'Постирать постельное бельё']
  };

  const WDAYS = { 'пн': 1, 'понедельник': 1, 'вт': 2, 'вторник': 2, 'ср': 3, 'среда': 3, 'среду': 3, 'чт': 4, 'четверг': 4, 'пт': 5, 'пятница': 5, 'пятницу': 5, 'сб': 6, 'суббота': 6, 'субботу': 6, 'вс': 0, 'воскресенье': 0 };

  // Разбор фразы: «завтра в 18:00 позвонить маме !» → дата, время, приоритет
  function parse(input, defaultDue) {
    let t = ' ' + input.trim() + ' ';
    let due = defaultDue, time = '', prio = false, repeat = '', tags = [];
    const cut = re => { const m = t.match(re); if (m) t = t.replace(re, ' '); return m; };
    if (cut(/\s?!+/) || cut(/\s(срочно|важно)\s/i)) prio = true;
    let m;
    while ((m = cut(/\s#([\p{L}\d_-]+)/u))) tags.push(m[1].toLowerCase());
    if (cut(/\s(каждый день|ежедневно)\s/i)) { repeat = 'daily'; due = due || today(); }
    if (cut(/\s(каждую неделю|еженедельно)\s/i)) { repeat = 'weekly'; due = due || today(); }
    if (cut(/\s(каждый месяц|ежемесячно)\s/i)) { repeat = 'monthly'; due = due || today(); }
    if ((m = cut(/\s(?:в\s)?(\d{1,2}):(\d{2})\s/))) time = m[1].padStart(2, '0') + ':' + m[2];
    if (cut(/\sпослезавтра\s/i)) due = addDays(today(), 2);
    else if (cut(/\sзавтра\s/i)) due = addDays(today(), 1);
    else if (cut(/\sсегодня\s/i)) due = today();
    else if ((m = cut(/\sчерез\s(\d+)\s(дн[еяй]й?|день|дня)\s/i))) due = addDays(today(), +m[1]);
    else if (cut(/\sчерез неделю\s/i)) due = addDays(today(), 7);
    else if (cut(/\s(когда-нибудь|потом)\s/i)) due = '';
    else if ((m = cut(/\s(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?\s/))) {
      const y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : new Date().getFullYear();
      due = dateKey(new Date(y, +m[2] - 1, +m[1]));
      if (!m[3] && due < today()) due = dateKey(new Date(y + 1, +m[2] - 1, +m[1]));
    } else {
      const wdRe = new RegExp('\\s(?:в|во)?\\s?(' + Object.keys(WDAYS).sort((a, b) => b.length - a.length).join('|') + ')\\s', 'i');
      if ((m = cut(wdRe))) {
        const target = WDAYS[m[1].toLowerCase()];
        const d = new Date(); let add = (target - d.getDay() + 7) % 7; if (add === 0) add = 7;
        due = addDays(today(), add);
      }
    }
    return { text: t.replace(/\s+/g, ' ').trim(), due, time, prio, repeat, tags };
  }

  function add(input, defaultDue) {
    const p = parse(input, defaultDue);
    if (!p.text) return null;
    const task = { id: uid(), done: false, created: Date.now(), ...p };
    tasks.push(task); save();
    return task;
  }

  function nextDate(t) {
    let d = t.due || today();
    const step = x => {
      if (t.repeat === 'daily') return addDays(x, 1);
      if (t.repeat === 'weekly') return addDays(x, 7);
      const dt = parseKey(x); dt.setMonth(dt.getMonth() + 1); return dateKey(dt);
    };
    do { d = step(d); } while (d <= today());
    return d;
  }

  function complete(t) {
    t.done = true; t.doneAt = Date.now();
    if (t.repeat) tasks.push({ ...t, id: uid(), done: false, doneAt: null, due: nextDate(t), created: Date.now() });
    const log = Store.get('todo:log', {}); log[today()] = (log[today()] || 0) + 1; Store.set('todo:log', log);
    save();
    toast(PRAISE[Math.floor(Math.random() * PRAISE.length)]);
  }

  const order = (a, b) => (a.due || '9999') .localeCompare(b.due || '9999') || (b.prio - a.prio) || (a.time || '99').localeCompare(b.time || '99') || a.created - b.created;
  const todayList = () => tasks.filter(t => !t.done && t.due && t.due <= today()).sort((a, b) => (b.prio - a.prio) || order(a, b));
  const upcoming = () => tasks.filter(t => !t.done && t.due && t.due > today()).sort(order);
  const someday = () => tasks.filter(t => !t.done && !t.due).sort((a, b) => (b.prio - a.prio) || a.created - b.created);
  const doneList = () => tasks.filter(t => t.done).sort((a, b) => b.doneAt - a.doneAt);

  function streak() {
    const log = Store.get('todo:log', {});
    let n = 0, d = today();
    if (!log[d]) d = addDays(d, -1);
    while (log[d]) { n++; d = addDays(d, -1); }
    return n;
  }

  function taskHTML(t) {
    const overdue = t.due && t.due < today() && !t.done;
    const meta = [
      t.due ? `<span class="badge ${overdue ? 'bad' : t.due === today() ? 'accent' : ''}">${overdue ? '⚠ ' : ''}${humanDate(t.due)}${t.time ? ' ' + t.time : ''}</span>` : (t.time ? `<span class="badge">${t.time}</span>` : ''),
      t.repeat ? `<span class="badge">🔁 ${{ daily: 'каждый день', weekly: 'каждую неделю', monthly: 'каждый месяц' }[t.repeat]}</span>` : '',
      ...t.tags.map(g => `<span class="badge accent">#${esc(g)}</span>`)
    ].filter(Boolean).join('');
    return `<div class="task ${t.done ? 'done' : ''} ${t.prio ? 'prio' : ''}" data-id="${t.id}">
      <button class="check" data-a="toggle" aria-label="Готово">✓</button>
      <div class="grow"><div class="ttext">${t.prio ? '🔥 ' : ''}${esc(t.text)}</div>${meta ? `<div class="meta">${meta}</div>` : ''}</div>
      <div class="actions">
        ${t.done ? '' : `<button class="icon-btn" data-a="snooze" title="На завтра">💤</button>`}
        <button class="icon-btn" data-a="edit" title="Изменить">✏️</button>
        <button class="icon-btn" data-a="del" title="Удалить">🗑</button>
      </div></div>`;
  }

  function render(el) {
    root = el;
    draw();
  }

  function draw() {
    tasks = Store.get(KEY, []);
    const tl = todayList(), up = upcoming(), sd = someday(), dn = doneList();
    const overdue = tl.filter(t => t.due < today());
    const log = Store.get('todo:log', {});
    const st = streak();
    const lists = { today: tl, upcoming: up, someday: sd, done: dn };
    const list = lists[view] || tl;
    root.innerHTML = `
      <div class="page-head"><h1>✅ Дела</h1><p>Пиши как говоришь: <span class="kbd">завтра в 18:00 позвонить маме !</span> · <span class="kbd">каждый день выпить витамины</span> · <span class="kbd">в пт оплатить интернет #счета</span></p></div>
      <div class="grid g3 mb">
        <div class="card stat"><span class="v">${log[today()] || 0}</span><span class="l">сделано сегодня</span></div>
        <div class="card stat"><span class="v">${tl.length}</span><span class="l">осталось на сегодня</span></div>
        <div class="card stat"><span class="v">🔥 ${st}</span><span class="l">${plural(st, 'день', 'дня', 'дней')} подряд с делами</span></div>
      </div>
      <div class="card">
        <form class="quick-add" id="qa"><input id="qaInput" placeholder="Что надо сделать? Enter — добавить" autocomplete="off"><button class="btn">＋</button></form>
        <p class="small muted" id="qaHint" style="margin:6px 2px 0">&nbsp;</p>
        <div class="row mt">
          <button class="btn ghost small" id="focusBtn">🎯 Одна задача</button>
          <button class="btn ghost small" id="randBtn">🎲 Случайная</button>
          <button class="btn ghost small" id="timerBtn">⏱ Просто начни (5 мин)</button>
          ${overdue.length ? `<button class="btn ghost small" id="moveOverdue">🧹 Просрочку (${overdue.length}) → на сегодня</button>` : ''}
        </div>
        <div id="timerBox" class="hidden note info mt"></div>
      </div>
      <div id="focus" class="mt"></div>
      <div class="card mt">
        <div class="tabs" id="vtabs">
          ${[['today', `Сегодня (${tl.length})`], ['upcoming', `Скоро (${up.length})`], ['someday', `Когда-нибудь (${sd.length})`], ['done', 'Готово']].map(([k, l]) => `<button class="tab ${view === k ? 'active' : ''}" data-v="${k}">${l}</button>`).join('')}
        </div>
        <div id="list">${list.length ? (view === 'done' ? list.slice(0, 60) : list).map(taskHTML).join('') : emptyState()}</div>
        ${view === 'done' && dn.length ? '<div class="row mt"><button class="btn ghost small" id="clearDone">Очистить выполненные</button></div>' : ''}
      </div>
      <div class="card mt"><h2>📦 Наборы задач в один клик</h2><p class="small muted">Не хочется придумывать — добавь готовый список.</p>
        <div class="chips">${Object.keys(PACKS).map(k => `<button class="chip" data-pack="${esc(k)}">${esc(k)}</button>`).join('')}</div></div>
      <div class="card mt"><h2>🧠 Приёмы для ленивых</h2><ul>
        <li><b>Правило 2 минут</b> — если дело занимает меньше 2 минут, сделай сразу, не записывай.</li>
        <li><b>Съешь лягушку</b> — отметь самое неприятное дело <span class="kbd">!</span>, оно встанет первым. Сделай его до обеда.</li>
        <li><b>5 минут</b> — договорись с собой сделать только 5 минут. Обычно потом уже не хочется бросать.</li>
        <li><b>Не больше 3 главных дел</b> в день. Остальное — бонус.</li>
        <li><b>Дробить</b>: «сделать ремонт» → «посмотреть цены на краску». Маленькое начать легче.</li>
      </ul></div>`;
    bindAll();
  }

  function emptyState() {
    const m = { today: ['🏖', 'На сегодня всё! Можно отдыхать.'], upcoming: ['📅', 'Ничего не запланировано. Напиши «завтра …» или «в пт …».'], someday: ['💭', 'Сюда падают дела без даты. Напиши «потом …».'], done: ['🌱', 'Пока ничего не сделано — начни с самого простого.'] };
    const [i, t] = m[view];
    return `<div class="empty"><div class="big">${i}</div>${t}</div>`;
  }

  function bindAll() {
    const inp = root.querySelector('#qaInput');
    const hint = root.querySelector('#qaHint');
    const def = () => view === 'today' ? today() : '';
    inp.addEventListener('input', () => {
      if (!inp.value.trim()) { hint.innerHTML = '&nbsp;'; return; }
      const p = parse(inp.value, def());
      hint.innerHTML = `→ «${esc(p.text)}» · ${p.due ? humanDate(p.due) : 'без даты'}${p.time ? ' в ' + p.time : ''}${p.prio ? ' · 🔥 важно' : ''}${p.repeat ? ' · 🔁' : ''}${p.tags.length ? ' · #' + p.tags.join(' #') : ''}`;
    });
    root.querySelector('#qa').addEventListener('submit', e => {
      e.preventDefault();
      const t = add(inp.value, def());
      if (t) { toast('Добавлено: ' + (t.due ? humanDate(t.due) : 'когда-нибудь')); draw(); root.querySelector('#qaInput').focus(); }
    });
    root.querySelector('#vtabs').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) { view = b.dataset.v; Store.set('todo:view', view); draw(); } });
    root.querySelector('#list').addEventListener('click', e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      const t = tasks.find(x => x.id === b.closest('[data-id]').dataset.id); if (!t) return;
      const a = b.dataset.a;
      if (a === 'toggle') { if (t.done) { t.done = false; save(); } else complete(t); }
      if (a === 'snooze') { t.due = addDays(today(), 1); save(); toast('Перенесено на завтра 💤'); }
      if (a === 'del') { tasks = tasks.filter(x => x !== t); save(); }
      if (a === 'edit') {
        const v = prompt('Изменить задачу (можно указать новую дату словами):', t.text + (t.prio ? ' !' : ''));
        if (v != null && v.trim()) { const p = parse(v, t.due); Object.assign(t, { text: p.text, due: p.due, time: p.time || t.time, prio: p.prio, tags: p.tags.length ? p.tags : t.tags, repeat: p.repeat || t.repeat }); save(); }
      }
      draw();
    });
    root.querySelector('#clearDone')?.addEventListener('click', () => { tasks = tasks.filter(t => !t.done); save(); draw(); });
    root.querySelector('#moveOverdue')?.addEventListener('click', () => { tasks.forEach(t => { if (!t.done && t.due && t.due < today()) t.due = today(); }); save(); toast('Всё на сегодня. Без стресса 🙂'); draw(); });
    root.querySelectorAll('[data-pack]').forEach(b => b.addEventListener('click', () => {
      PACKS[b.dataset.pack].forEach(x => add(x, today()));
      toast('Набор добавлен на сегодня'); view = 'today'; draw();
    }));
    root.querySelector('#focusBtn').addEventListener('click', () => focusMode(0));
    root.querySelector('#randBtn').addEventListener('click', () => {
      const pool = todayList().length ? todayList() : [...someday(), ...upcoming()];
      if (!pool.length) return toast('Задач нет — свобода!');
      focusMode(Math.floor(Math.random() * pool.length), pool);
    });
    root.querySelector('#timerBtn').addEventListener('click', startTimer);
  }

  function focusMode(idx, pool) {
    pool = pool || todayList();
    const box = root.querySelector('#focus');
    if (!pool.length) { box.innerHTML = `<div class="card focus-card"><div class="big" style="font-size:2.5rem">🏖</div><div class="ftext">На сегодня дел нет</div></div>`; return; }
    const t = pool[idx % pool.length];
    box.innerHTML = `<div class="card focus-card">
      <div class="muted small">Сейчас только это (${idx % pool.length + 1} из ${pool.length}):</div>
      <div class="ftext">${t.prio ? '🔥 ' : ''}${esc(t.text)}</div>
      <div class="row" style="justify-content:center">
        <button class="btn big" data-f="done">✅ Сделал</button>
        <button class="btn ghost big" data-f="skip">⏭ Другую</button>
        <button class="btn ghost big" data-f="snooze">💤 Завтра</button>
        <button class="btn ghost big" data-f="close">✕</button>
      </div></div>`;
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    box.onclick = e => {
      const f = e.target.closest('[data-f]')?.dataset.f; if (!f) return;
      if (f === 'close') { box.innerHTML = ''; return; }
      if (f === 'done') complete(t);
      if (f === 'snooze') { t.due = addDays(today(), 1); save(); }
      draw();
      if (f === 'skip') focusMode(idx + 1, pool);
      else if (todayList().length) focusMode(0);
    };
  }

  function startTimer() {
    const box = root.querySelector('#timerBox');
    clearInterval(timer);
    let left = 5 * 60;
    box.classList.remove('hidden');
    const tick = () => {
      const mm = String(Math.floor(left / 60)).padStart(2, '0'), ss = String(left % 60).padStart(2, '0');
      box.innerHTML = `⏱ <b class="num" style="font-size:1.3rem">${mm}:${ss}</b> — просто делай что-нибудь из списка. Потом можно остановиться. <button class="btn ghost small" id="tStop">Стоп</button>`;
      box.querySelector('#tStop').onclick = () => { clearInterval(timer); box.classList.add('hidden'); };
      if (left-- <= 0) { clearInterval(timer); box.innerHTML = '🎉 5 минут прошло! Хочешь — продолжай, хочешь — отдыхай. Ты молодец.'; try { navigator.vibrate && navigator.vibrate(300); } catch (e) {} }
    };
    tick(); timer = setInterval(tick, 1000);
  }

  App.register({ id: 'todo', title: 'Дела', icon: '✅', render, destroy() { clearInterval(timer); } });
  window.Todo = { todayList: () => { tasks = Store.get(KEY, []); return todayList(); }, complete: t => { complete(t); }, add: (s, d) => add(s, d), save: () => save(), reload: () => { tasks = Store.get(KEY, []); }, get tasks() { return tasks; } };
})();
