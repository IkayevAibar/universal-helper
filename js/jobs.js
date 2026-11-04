/* Сыщик вакансий: профиль → поиск через API hh (KZ/UZ) с оценкой совпадения + ссылки на другие площадки + трекер откликов */
(function () {
  const { Store, esc, uid, fmt, num, toast, fetchJSON } = U;
  const AREAS = [
    { id: '', name: 'Любой город' }, { id: '40', name: 'Весь Казахстан' }, { id: '160', name: 'Алматы' }, { id: '159', name: 'Астана' },
    { id: '97', name: 'Весь Узбекистан' }, { id: '2759', name: 'Ташкент' }, { id: '113', name: 'Вся Россия' }
  ];
  const STATUSES = { saved: '⭐ Интересно', applied: '📨 Откликнулся', interview: '🗣 Собеседование', offer: '🎉 Оффер', rejected: '❌ Отказ' };
  const DEF_PROFILE = { query: '', skills: '', exclude: 'стажер, без опыта, продажи по телефону', area: '160', remote: false, salary: '', currency: 'KZT', experience: '' };

  let profile = Store.get('jobs:profile', DEF_PROFILE);
  let tracker = Store.get('jobs:tracker', []);
  let lastResults = [], lastFound = 0;
  let root;

  const words = s => String(s || '').split(/[,;\n]/).map(x => x.trim().toLowerCase()).filter(Boolean);
  const strip = s => String(s || '').replace(/<[^>]+>/g, '');

  function score(v) {
    const text = (v.name + ' ' + strip(v.snippet?.requirement) + ' ' + strip(v.snippet?.responsibility) + ' ' + (v.employer?.name || '')).toLowerCase();
    const skills = words(profile.skills);
    const hit = skills.filter(s => text.includes(s));
    const bad = words(profile.exclude).filter(s => text.includes(s));
    let sc = skills.length ? hit.length / skills.length * 60 : 30;
    const q = words(profile.query.replace(/\s+/g, ',')).filter(w => w.length > 2);
    if (q.some(w => v.name.toLowerCase().includes(w))) sc += 20;
    const sal = v.salary; const want = num(profile.salary);
    if (sal && want) {
      const top = sal.to || sal.from;
      if (sal.currency === profile.currency || (sal.currency === 'RUR' && profile.currency === 'RUB')) { if (top >= want) sc += 15; else sc -= 15; }
    } else if (sal) sc += 5;
    if (v.schedule?.id === 'remote') sc += profile.remote ? 10 : 0;
    sc -= bad.length * 25;
    const days = (Date.now() - new Date(v.published_at).getTime()) / 864e5;
    if (days < 3) sc += 5;
    return { score: Math.max(0, Math.min(100, Math.round(sc))), hit, bad };
  }

  function salaryStr(s) {
    if (!s) return 'з/п не указана';
    const c = s.currency === 'RUR' ? 'RUB' : s.currency;
    if (s.from && s.to) return `${fmt(s.from)}–${fmt(s.to)} ${c}`;
    return (s.from ? 'от ' + fmt(s.from) : 'до ' + fmt(s.to)) + ' ' + c;
  }

  function hhBase() { return ['97', '2759'].includes(profile.area) ? 'https://hh.uz' : ['113'].includes(profile.area) ? 'https://hh.ru' : 'https://hh.kz'; }

  async function search(page = 0) {
    const box = root.querySelector('#results');
    if (!profile.query.trim()) { box.innerHTML = '<div class="note">Сначала впиши, кем хочешь работать.</div>'; return; }
    box.innerHTML = '<p class="muted">Ищу вакансии…</p>';
    const p = new URLSearchParams({ text: profile.query, per_page: '50', page: String(page), order_by: 'publication_time' });
    if (profile.area) p.set('area', profile.area);
    if (profile.remote) p.set('schedule', 'remote');
    if (profile.experience) p.set('experience', profile.experience);
    try {
      const j = await fetchJSON('https://api.hh.ru/vacancies?' + p, { headers: { 'HH-User-Agent': 'UniversalHelperPersonal/1.0' } }, 12000);
      lastResults = (j.items || []).map(v => ({ v, ...score(v) })).sort((a, b) => b.score - a.score);
      lastFound = j.found; drawResults(j.found);
    } catch (e) {
      box.innerHTML = `<div class="note">Не получилось загрузить вакансии напрямую (${esc(e.message)}). hh.ru иногда ограничивает запросы из браузера.
        Воспользуйся ссылками ниже — они откроют готовый поиск по твоему профилю.</div>`;
    }
  }

  function drawResults(found) {
    const box = root.querySelector('#results');
    const minScore = num(root.querySelector('#minScore')?.value);
    const list = lastResults.filter(x => x.score >= minScore);
    if (!lastResults.length) { box.innerHTML = '<div class="empty"><div class="big">🔍</div>Ничего не нашлось. Попробуй другие слова или другой город.</div>'; return; }
    box.innerHTML = `<p class="small muted">Найдено на hh: ${fmt(found)} · показаны свежие 50, отсортированы по совпадению с профилем · подходит: ${list.length}</p>` +
      list.map(({ v, score, hit, bad }) => {
        const inTracker = tracker.some(t => t.id === v.id);
        return `<div class="route ${score >= 70 ? 'best' : ''}">
          <div class="row between nw"><div class="grow"><a href="${esc(v.alternate_url)}" target="_blank" rel="noopener"><b>${esc(v.name)}</b></a>
            <div class="small muted">${esc(v.employer?.name || '')} · ${esc(v.area?.name || '')} · ${new Date(v.published_at).toLocaleDateString('ru-RU')}${v.schedule?.id === 'remote' ? ' · 🏠 удалёнка' : ''}</div></div>
            <span class="badge ${score >= 70 ? 'good' : score >= 40 ? 'warn' : ''}" title="Совпадение с профилем">${score}%</span></div>
          <div class="row mt small"><b>${esc(salaryStr(v.salary))}</b>${v.experience ? `<span class="muted">· опыт: ${esc(v.experience.name)}</span>` : ''}</div>
          ${v.snippet?.requirement ? `<p class="small muted" style="margin:6px 0">${esc(strip(v.snippet.requirement))}</p>` : ''}
          <div class="row small">${hit.map(h => `<span class="badge good">✓ ${esc(h)}</span>`).join('')}${bad.map(h => `<span class="badge bad">✕ ${esc(h)}</span>`).join('')}</div>
          <div class="row mt"><button class="btn ghost small" data-save="${v.id}" ${inTracker ? 'disabled' : ''}>${inTracker ? '✓ В трекере' : '⭐ В трекер'}</button>
            <button class="btn ghost small" data-letter="${v.id}">✉️ Сопроводительное</button></div>
        </div>`;
      }).join('');
  }

  function links() {
    const q = encodeURIComponent(profile.query || '');
    const areaName = AREAS.find(a => a.id === profile.area)?.name || '';
    const city = encodeURIComponent(/Весь|Вся|Любой/.test(areaName) ? (areaName.replace(/Весь |Вся /, '').replace('Любой город', '')) : areaName);
    const hh = hhBase() + `/search/vacancy?text=${q}${profile.area ? '&area=' + profile.area : ''}${profile.remote ? '&schedule=remote' : ''}&order_by=publication_time`;
    return [
      ['hh (' + hhBase().replace('https://', '') + ')', hh],
      ['LinkedIn', `https://www.linkedin.com/jobs/search/?keywords=${q}&location=${city}${profile.remote ? '&f_WT=2' : ''}`],
      ['Enbek.kz (гос. биржа KZ)', `https://www.enbek.kz/ru/search/vac?prof=${q}`],
      ['Olx Работа', `https://www.olx.kz/rabota/q-${q}/`],
      ['Indeed', `https://www.indeed.com/jobs?q=${q}&l=${profile.remote ? 'remote' : city}`],
      ['Remote OK (удалёнка)', `https://remoteok.com/remote-${encodeURIComponent((profile.query || 'jobs').toLowerCase().replace(/\s+/g, '-'))}-jobs`],
      ['We Work Remotely', `https://weworkremotely.com/remote-jobs/search?term=${q}`],
      ['Habr Карьера', `https://career.habr.com/vacancies?q=${q}${profile.remote ? '&remote=true' : ''}`],
      ['Google Jobs', `https://www.google.com/search?q=${q}+вакансия+${city}&ibp=htl;jobs`],
      ['Telegram-каналы', `https://www.google.com/search?q=site:t.me+${q}+вакансии`]
    ];
  }

  function letter(v) {
    const skills = words(profile.skills);
    const text = (v.name + ' ' + strip(v.snippet?.requirement)).toLowerCase();
    const matched = skills.filter(s => text.includes(s));
    const use = (matched.length ? matched : skills).slice(0, 4);
    return `Здравствуйте!

Меня заинтересовала вакансия «${v.name}» в компании ${v.employer?.name || ''}. ${use.length ? `У меня есть опыт с ${use.join(', ')}, ` : ''}и я уверен, что смогу быстро включиться в работу и приносить пользу команде.

Коротко обо мне: [1–2 предложения о самом сильном опыте/результате — цифры приветствуются].

Буду рад(а) рассказать подробнее на созвоне. Резюме прикладываю.

С уважением,
[Имя]
[Телефон / Telegram]`;
  }

  function render(el) {
    root = el;
    draw();
  }

  function draw() {
    root.innerHTML = `
      <div class="page-head"><h1>💼 Сыщик вакансий</h1><p>Заполни профиль один раз — дальше просто нажимай «Искать». Вакансии оцениваются по совпадению с твоими навыками.</p></div>
      <div class="grid g2">
        <div class="card">
          <h2>👤 Мой профиль</h2>
          <div class="stack" style="gap:12px">
            <label class="field">Кем хочу работать (запрос)<input id="p_query" value="${esc(profile.query)}" placeholder="например: python разработчик, бухгалтер, менеджер"></label>
            <label class="field">Мои навыки (через запятую)<textarea id="p_skills" rows="2" placeholder="python, sql, excel, английский">${esc(profile.skills)}</textarea></label>
            <label class="field">Не хочу видеть (через запятую)<input id="p_exclude" value="${esc(profile.exclude)}"></label>
            <div class="fields">
              <label class="field">Город<select id="p_area">${AREAS.map(a => `<option value="${a.id}" ${a.id === profile.area ? 'selected' : ''}>${a.name}</option>`).join('')}</select></label>
              <label class="field">Опыт<select id="p_experience">${[['', 'Любой'], ['noExperience', 'Нет опыта'], ['between1And3', '1–3 года'], ['between3And6', '3–6 лет'], ['moreThan6', '6+ лет']].map(([k, l]) => `<option value="${k}" ${k === profile.experience ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
              <label class="field">Хочу з/п от<input id="p_salary" inputmode="numeric" value="${esc(profile.salary)}"></label>
              <label class="field">Валюта<select id="p_currency">${['KZT', 'UZS', 'USD', 'RUB'].map(c => `<option ${c === profile.currency ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
            </div>
            <label class="row small"><input type="checkbox" id="p_remote" ${profile.remote ? 'checked' : ''}> Только удалёнка</label>
            <div class="row"><button class="btn" id="searchBtn">🔍 Искать</button>
              <label class="row small muted">Мин. совпадение <input id="minScore" type="range" min="0" max="90" step="10" value="0" style="width:110px"><span id="minScoreV">0%</span></label></div>
          </div>
        </div>
        <div class="card">
          <h2>🔗 Искать на других сайтах</h2>
          <p class="small muted">Ссылки сразу открывают поиск по твоему запросу.</p>
          <div class="chips" id="links">${links().map(([n, u]) => `<a class="chip" href="${esc(u)}" target="_blank" rel="noopener">${esc(n)} ↗</a>`).join('')}</div>
          <h3 class="mt">💡 Советы</h3>
          <ul class="small">
            <li>Откликайся в первые 1–2 дня после публикации — шансы выше в разы.</li>
            <li>Под каждую вакансию меняй 2–3 строки сопроводительного под требования.</li>
            <li>Цель — 5 откликов в день. Добавь задачу «Поиск работы» в Дела.</li>
            <li>Пиши рекрутерам и сотрудникам компании в LinkedIn/Telegram напрямую.</li>
          </ul>
        </div>
      </div>
      <div class="card mt"><h2>📋 Результаты</h2><div id="results"><p class="muted small">Нажми «Искать».</p></div></div>
      <div class="card mt"><h2>🗂 Трекер откликов</h2><div id="tracker"></div>
        <form class="row mt" id="manualAdd"><input class="grow" id="mName" placeholder="Добавить вручную: должность — компания"><input class="grow" id="mUrl" placeholder="ссылка (необязательно)"><button class="btn ghost">＋</button></form></div>`;
    bind();
    drawTracker();
  }

  function bind() {
    const map = { p_query: 'query', p_skills: 'skills', p_exclude: 'exclude', p_area: 'area', p_salary: 'salary', p_currency: 'currency', p_experience: 'experience' };
    Object.entries(map).forEach(([id, k]) => {
      const el = root.querySelector('#' + id);
      el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => {
        profile[k] = el.value; Store.set('jobs:profile', profile);
        root.querySelector('#links').innerHTML = links().map(([n, u]) => `<a class="chip" href="${esc(u)}" target="_blank" rel="noopener">${esc(n)} ↗</a>`).join('');
      });
    });
    root.querySelector('#p_remote').addEventListener('change', e => { profile.remote = e.target.checked; Store.set('jobs:profile', profile); });
    root.querySelector('#p_query').addEventListener('keydown', e => { if (e.key === 'Enter') search(); });
    root.querySelector('#searchBtn').addEventListener('click', () => search());
    root.querySelector('#minScore').addEventListener('input', e => { root.querySelector('#minScoreV').textContent = e.target.value + '%'; if (lastResults.length) drawResults(lastFound); });
    root.querySelector('#results').addEventListener('click', e => {
      const s = e.target.closest('[data-save]'), l = e.target.closest('[data-letter]');
      if (s) {
        const { v } = lastResults.find(x => x.v.id === s.dataset.save);
        tracker.unshift({ id: v.id, name: v.name, company: v.employer?.name || '', url: v.alternate_url, salary: salaryStr(v.salary), status: 'saved', date: Date.now(), note: '' });
        Store.set('jobs:tracker', tracker); s.disabled = true; s.textContent = '✓ В трекере'; drawTracker();
      }
      if (l) {
        const { v } = lastResults.find(x => x.v.id === l.dataset.letter);
        const txt = letter(v);
        navigator.clipboard?.writeText(txt).then(() => toast('Шаблон письма скопирован 📋'), () => prompt('Скопируй текст:', txt));
      }
    });
    root.querySelector('#manualAdd').addEventListener('submit', e => {
      e.preventDefault();
      const n = root.querySelector('#mName').value.trim(); if (!n) return;
      const [name, company = ''] = n.split(/\s[—-]\s/);
      tracker.unshift({ id: uid(), name, company, url: root.querySelector('#mUrl').value.trim(), salary: '', status: 'applied', date: Date.now(), note: '' });
      Store.set('jobs:tracker', tracker); root.querySelector('#mName').value = ''; root.querySelector('#mUrl').value = ''; drawTracker();
    });
  }

  function drawTracker() {
    const el = root.querySelector('#tracker');
    if (!tracker.length) { el.innerHTML = '<p class="muted small">Сохраняй интересные вакансии и меняй статус — так не потеряешь, куда уже откликнулся.</p>'; return; }
    const counts = {}; tracker.forEach(t => counts[t.status] = (counts[t.status] || 0) + 1);
    el.innerHTML = `<div class="row small mb">${Object.entries(STATUSES).map(([k, l]) => `<span class="badge">${l}: ${counts[k] || 0}</span>`).join('')}</div>
      <div class="table-wrap"><table><tr><th>Вакансия</th><th>Статус</th><th>Заметка</th><th></th></tr>
      ${tracker.map((t, i) => `<tr><td>${t.url ? `<a href="${esc(t.url)}" target="_blank" rel="noopener">${esc(t.name)}</a>` : esc(t.name)}<div class="small muted">${esc(t.company)}${t.salary ? ' · ' + esc(t.salary) : ''} · ${new Date(t.date).toLocaleDateString('ru-RU')}</div></td>
        <td><select data-st="${i}">${Object.entries(STATUSES).map(([k, l]) => `<option value="${k}" ${k === t.status ? 'selected' : ''}>${l}</option>`).join('')}</select></td>
        <td><input data-note="${i}" value="${esc(t.note)}" placeholder="контакт, дата созвона…"></td>
        <td><button class="icon-btn" data-del="${i}">🗑</button></td></tr>`).join('')}</table></div>`;
    el.querySelectorAll('[data-st]').forEach(s => s.addEventListener('change', () => { tracker[+s.dataset.st].status = s.value; Store.set('jobs:tracker', tracker); drawTracker(); }));
    el.querySelectorAll('[data-note]').forEach(s => s.addEventListener('input', () => { tracker[+s.dataset.note].note = s.value; Store.set('jobs:tracker', tracker); }));
    el.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => { tracker.splice(+b.dataset.del, 1); Store.set('jobs:tracker', tracker); drawTracker(); }));
  }

  App.register({ id: 'jobs', title: 'Вакансии', icon: '💼', render });
})();
