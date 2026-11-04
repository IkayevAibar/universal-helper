/* Главная: приветствие, погода, дела на сегодня, вода, курсы, ближайшие даты и платежи */
(function () {
  const { Store, esc, fmt, fmtSmart, dateKey, daysBetween, humanDate, toast, fetchJSON, getRates, cross, MONTHS, WD } = U;
  const CITIES = { tashkent: ['Ташкент', 41.31, 69.28], almaty: ['Алматы', 43.24, 76.89], astana: ['Астана', 51.17, 71.45], samarkand: ['Самарканд', 39.65, 66.96], shymkent: ['Шымкент', 42.32, 69.59] };
  const WMO = { 0: ['☀️', 'Ясно'], 1: ['🌤', 'Почти ясно'], 2: ['⛅', 'Переменная облачность'], 3: ['☁️', 'Пасмурно'], 45: ['🌫', 'Туман'], 48: ['🌫', 'Туман'], 51: ['🌦', 'Морось'], 53: ['🌦', 'Морось'], 55: ['🌦', 'Морось'],
    61: ['🌧', 'Дождь'], 63: ['🌧', 'Дождь'], 65: ['🌧', 'Сильный дождь'], 71: ['🌨', 'Снег'], 73: ['🌨', 'Снег'], 75: ['❄️', 'Сильный снег'], 80: ['🌦', 'Ливень'], 81: ['🌧', 'Ливень'], 82: ['⛈', 'Сильный ливень'], 95: ['⛈', 'Гроза'], 96: ['⛈', 'Гроза с градом'], 99: ['⛈', 'Гроза с градом'] };

  const TIPS = [
    'Отложи 10% сразу после зарплаты — до того, как начнёшь тратить.', 'Сравнивай итоговую сумму перевода, а не «комиссию 0%».', 'Правило 72 часов: хочешь дорогую вещь — подожди 3 дня.',
    'Сделай самое неприятное дело первым — дальше день пойдёт легче.', 'Не можешь начать? Поставь таймер на 5 минут.', 'Стирай свитера при 30° и суши горизонтально.',
    'Кровь отстирывается только холодной водой.', 'Банк никогда не просит код из SMS.', 'Выпей стакан воды прямо сейчас 💧', 'Проверь подписки — может, что-то пора отменить?',
    'Откликайся на вакансии в первые 1–2 дня после публикации.', 'Готовь сразу на 2–3 дня — меньше времени у плиты.', 'Хлорку нельзя смешивать с уксусом и нашатырём!'
  ];

  function greeting() {
    const h = new Date().getHours();
    return h < 5 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер';
  }

  function render(el) {
    const name = Store.get('settings:name', '');
    const d = new Date();
    const tip = TIPS[(d.getDate() + d.getMonth() * 31) % TIPS.length];
    el.innerHTML = `
      <div class="page-head"><div class="hello">${greeting()}${name ? ', ' + esc(name) : ''} 👋</div>
        <p>${['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'][d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}</p></div>
      <div class="grid g3">
        <div class="card" id="weather"><h3>Погода</h3><p class="muted small">Загружаю…</p></div>
        <div class="card" id="ratesCard"><h3>💱 Курсы</h3><p class="muted small">Загружаю…</p></div>
        <div class="card"><h3>💡 Совет дня</h3><p>${esc(tip)}</p></div>
      </div>
      <div class="grid g2 mt">
        <div class="card"><div class="row between"><h2 style="margin:0">✅ Сегодня</h2><a href="#todo" class="small">Все дела →</a></div>
          <form class="quick-add mt" id="hq"><input id="hqi" placeholder="Быстро добавить: «завтра купить хлеб»"><button class="btn">＋</button></form>
          <div id="htasks" class="mt"></div></div>
        <div class="stack">
          <div class="card" id="hwater"></div>
          <div class="card" id="hsoon"><h3>📅 Ближайшее</h3></div>
        </div>
      </div>
      <h2 class="mt" style="margin-top:24px">Разделы</h2>
      <div class="grid gauto">${App.modules.filter(m => m.id !== 'home' && !m.hidden).map(m => `<a class="tile-link" href="#${m.id}"><div class="card"><div style="font-size:1.6rem">${m.icon}</div><b>${esc(m.title)}</b><div class="small muted">${esc(DESC[m.id] || '')}</div></div></a>`).join('')}</div>`;

    drawTasks(el);
    drawWater(el);
    drawSoon(el);
    el.querySelector('#hq').addEventListener('submit', e => {
      e.preventDefault(); const i = el.querySelector('#hqi');
      const t = window.Todo && Todo.add(i.value, dateKey());
      if (t) { i.value = ''; toast('Добавлено: ' + (t.due ? humanDate(t.due) : 'когда-нибудь')); drawTasks(el); }
    });
    loadWeather(el);
    loadRates(el);
  }

  const DESC = { money: 'Через что выгоднее перевести деньги', todo: 'Дела для ленивых', jobs: 'Подбор вакансий и трекер откликов', finance: 'Уроки и калькуляторы', recipes: 'Что приготовить из того, что есть', guide: 'Стирка, пятна, кухня, аптечка', extras: 'Привычки, вода, платежи, таймеры', settings: 'Тема, бэкап данных' };

  function drawTasks(el) {
    const box = el.querySelector('#htasks');
    const list = window.Todo ? Todo.todayList() : [];
    if (!list.length) { box.innerHTML = '<div class="empty"><div class="big">🏖</div>На сегодня дел нет</div>'; return; }
    box.innerHTML = list.slice(0, 6).map(t => `<div class="task ${t.prio ? 'prio' : ''}" data-id="${t.id}"><button class="check" aria-label="Готово">✓</button>
      <div class="grow"><div class="ttext">${t.prio ? '🔥 ' : ''}${esc(t.text)}</div>${t.due < dateKey() ? '<div class="meta"><span class="badge bad">просрочено</span></div>' : t.time ? `<div class="meta"><span class="badge">${t.time}</span></div>` : ''}</div></div>`).join('') +
      (list.length > 6 ? `<p class="small muted mt">…и ещё ${list.length - 6}</p>` : '');
    box.querySelectorAll('.check').forEach(b => b.addEventListener('click', () => {
      const t = Todo.tasks.find(x => x.id === b.closest('[data-id]').dataset.id); if (t) { Todo.complete(t); drawTasks(el); }
    }));
  }

  function drawWater(el) {
    const goal = Store.get('ex:waterGoal', 8), log = Store.get('ex:water', {}), n = log[dateKey()] || 0;
    const box = el.querySelector('#hwater');
    box.innerHTML = `<div class="row between"><h3 style="margin:0">💧 Вода: ${n}/${goal}</h3><button class="btn small" id="hw">＋ стакан</button></div>
      <div class="bar mt"><span style="width:${Math.min(100, n / goal * 100)}%"></span></div>`;
    box.querySelector('#hw').addEventListener('click', () => { log[dateKey()] = n + 1; Store.set('ex:water', log); if (n + 1 === goal) toast('Норма воды выполнена 🎉'); drawWater(el); });
  }

  function drawSoon(el) {
    const items = [];
    const t = dateKey();
    (window.ExtrasDates ? ExtrasDates() : []).forEach(x => {
      let k = x.date;
      if (x.yearly) { const [, m, d] = x.date.split('-').map(Number); const y = new Date().getFullYear(); k = dateKey(new Date(y, m - 1, d)); if (k < t) k = dateKey(new Date(y + 1, m - 1, d)); }
      items.push({ k, text: '🎂 ' + x.name });
    });
    (window.ExtrasBills ? ExtrasBills() : []).forEach(b => items.push({ k: b.next, text: `🧾 ${b.name} — ${fmt(b.sum)} ${b.cur}` }));
    const soon = items.filter(x => x.k >= t && daysBetween(t, x.k) <= 14).sort((a, b) => a.k.localeCompare(b.k)).slice(0, 6);
    el.querySelector('#hsoon').innerHTML = `<h3>📅 Ближайшие 2 недели</h3>` + (soon.length ? soon.map(x => `<div class="row between small mt"><span>${esc(x.text)}</span><span class="badge ${x.k === t ? 'warn' : ''}">${humanDate(x.k)}</span></div>`).join('')
      : '<p class="small muted">Пусто. Добавь дни рождения и платежи в <a href="#extras/dates">Мелочах</a>.</p>');
  }

  async function loadWeather(el) {
    const ck = Store.get('settings:city', 'tashkent');
    const [name, lat, lon] = CITIES[ck] || CITIES.tashkent;
    const box = el.querySelector('#weather');
    const sel = `<select id="citySel" style="width:auto;padding:4px 8px;font-size:.85rem">${Object.entries(CITIES).map(([k, [n]]) => `<option value="${k}" ${k === ck ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
    try {
      const j = await fetchJSON(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&timezone=auto&forecast_days=3`);
      const c = j.current; const [ic, txt] = WMO[c.weather_code] || ['🌡', ''];
      const advice = c.apparent_temperature < 0 ? 'Холодно — шапка и перчатки 🧣' : c.apparent_temperature < 10 ? 'Прохладно — возьми куртку 🧥' : c.apparent_temperature > 32 ? 'Жара — вода и головной убор 🧢' : (j.daily.precipitation_probability_max[0] > 50 ? 'Возможен дождь — зонт ☂️' : 'Приятная погода 🙂');
      box.innerHTML = `<div class="row between"><h3 style="margin:0">Погода</h3>${sel}</div>
        <div class="row mt nw"><span style="font-size:2.4rem">${ic}</span><div><div class="stat"><span class="v">${Math.round(c.temperature_2m)}°</span><span class="l">${txt}, ощущается ${Math.round(c.apparent_temperature)}°</span></div></div></div>
        <p class="small mt" style="margin-bottom:4px">${advice}</p>
        <div class="row small muted">${j.daily.time.map((d, i) => `<span>${i === 0 ? 'Сегодня' : WD[U.parseKey(d).getDay()]}: ${(WMO[j.daily.weather_code[i]] || ['🌡'])[0]} ${Math.round(j.daily.temperature_2m_min[i])}…${Math.round(j.daily.temperature_2m_max[i])}°</span>`).join(' · ')}</div>`;
    } catch (e) {
      box.innerHTML = `<div class="row between"><h3 style="margin:0">Погода</h3>${sel}</div><p class="muted small mt">Не удалось загрузить (нет интернета?)</p>`;
    }
    box.querySelector('#citySel').addEventListener('change', ev => { Store.set('settings:city', ev.target.value); loadWeather(el); });
  }

  async function loadRates(el) {
    const r = await getRates();
    const rows = [['USD', 'UZS'], ['USD', 'KZT'], ['KZT', 'UZS'], ['RUB', 'KZT'], ['EUR', 'KZT']];
    el.querySelector('#ratesCard').innerHTML = `<div class="row between"><h3 style="margin:0">💱 Курсы (рынок)</h3><a href="#money" class="small">Сравнить переводы →</a></div>
      <table class="mt">${rows.map(([a, b]) => `<tr><td class="small">1 ${a}</td><td class="num" style="text-align:right"><b>${fmtSmart(cross(r.rates, a, b))}</b> ${b}</td></tr>`).join('')}</table>
      ${r.offline ? '<p class="small muted">примерные, нет связи</p>' : ''}`;
  }

  App.register({ id: 'home', title: 'Главная', icon: '🏠', render });
})();
