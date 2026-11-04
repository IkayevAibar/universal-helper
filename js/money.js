/* Калькулятор выгоды переводов: сравнивает цепочки обмена (через $, Paysend, Tenge Bank и т.д.) */
(function () {
  const { Store, esc, uid, fmt, fmtSmart, num, toast, getRates, cross } = U;
  const CURS = ['UZS', 'KZT', 'USD', 'RUB', 'EUR', 'KGS', 'TRY', 'AED', 'CNY', 'GBP'];
  const NAMES = { UZS: 'сум', KZT: 'тенге', USD: 'доллар', RUB: 'рубль', EUR: 'евро', KGS: 'сом', TRY: 'лира', AED: 'дирхам', CNY: 'юань', GBP: 'фунт' };
  const KEY = 'money:v1';

  let rates = null;
  let S = null;

  const step = (from, to, rate, quote, feePct = 0, feeFix = 0, label = '') => ({ id: uid(), from, to, rate, quote, feePct, feeFix, label });

  function presets(r) {
    const usdUzs = cross(r, 'USD', 'UZS') || 12500;
    const usdKzt = cross(r, 'USD', 'KZT') || 520;
    const kztUzs = usdUzs / usdKzt;
    const r2 = x => Math.round(x * 100) / 100;
    return [
      {
        id: uid(), name: '💵 Через доллары', note: 'Купить $ в узбекском банке → перевести/снять → обменять $ на тенге в Казахстане. Впиши курс продажи $ своего банка и курс покупки $ в обменнике KZ.',
        link: '', steps: [
          step('UZS', 'USD', Math.round(usdUzs * 1.006), 'from_per_to', 0, 0, 'Покупка $ в банке UZ'),
          step('USD', 'USD', 1, 'to_per_from', 1, 0, 'Перевод / снятие $ (комиссия)'),
          step('USD', 'KZT', r2(usdKzt * 0.992), 'to_per_from', 0, 0, 'Обмен $ → ₸ в KZ')
        ]
      },
      {
        id: uid(), name: '📲 Paysend', note: 'Перевод с узбекской карты на казахстанскую. Курс и комиссию смотри в приложении Paysend перед отправкой.',
        link: 'https://paysend.com', steps: [step('UZS', 'KZT', r2(kztUzs * 1.02), 'from_per_to', 0, 0, 'Курс Paysend')]
      },
      {
        id: uid(), name: '🏦 Tenge Bank — прямой перевод', note: 'Прямой перевод из Tenge Bank (Узбекистан) в Казахстан. Курс и комиссию смотри в приложении Tenge Bank.',
        link: 'https://tengebank.uz', steps: [step('UZS', 'KZT', r2(kztUzs * 1.012), 'from_per_to', 0.5, 0, 'Курс Tenge Bank')]
      }
    ];
  }

  function load() {
    S = Store.get(KEY, null);
    if (!S) S = { amount: 10000000, from: 'UZS', to: 'KZT', mode: 'send', target: 300000, routes: presets(rates.rates) };
  }
  const save = () => Store.set(KEY, S);

  // Расчёт
  function applyStep(v, s) {
    let x = v * (1 - num(s.feePct) / 100) - num(s.feeFix);
    if (s.from === s.to) return x;
    const r = num(s.rate);
    if (!r) return NaN;
    return s.quote === 'from_per_to' ? x / r : x * r;
  }
  const runRoute = (route, amount) => route.steps.reduce(applyStep, amount);
  function requiredFor(route, target) {
    // цепочка линейна: f(x) = a*x + b
    const b = runRoute(route, 0), a = runRoute(route, 1e6) / 1e6 - b / 1e6;
    return a > 0 ? (target - b) / a : NaN;
  }
  function chainError(route) {
    if (!route.steps.length) return 'Нет шагов';
    if (route.steps[0].from !== S.from) return `Первый шаг должен начинаться с ${S.from}`;
    for (let i = 1; i < route.steps.length; i++) if (route.steps[i].from !== route.steps[i - 1].to) return `Шаг ${i + 1}: валюта не совпадает с предыдущим шагом`;
    if (route.steps[route.steps.length - 1].to !== S.to) return `Последний шаг должен заканчиваться на ${S.to}`;
    return '';
  }
  const market = () => cross(rates.rates, S.from, S.to);

  function results() {
    return S.routes.map(r => {
      const err = chainError(r);
      const out = err ? NaN : runRoute(r, S.amount);
      const need = err ? NaN : requiredFor(r, S.target);
      return { r, err, out, need };
    });
  }

  // Рендер
  let root;
  async function render(el) {
    root = el;
    el.innerHTML = `<div class="page-head"><h1>💱 Курсы и переводы</h1><p>Через что выгоднее выводить деньги: сравни способы по итоговой сумме, которая дойдёт.</p></div><div class="card"><p class="muted">Загружаю курсы…</p></div>`;
    rates = await getRates();
    load();
    draw();
  }

  function curOpts(sel) { return CURS.map(c => `<option ${c === sel ? 'selected' : ''}>${c}</option>`).join(''); }
  function rateLabel(s) { return s.from === s.to ? 'без обмена' : s.quote === 'from_per_to' ? `1 ${s.to} = ? ${s.from}` : `1 ${s.from} = ? ${s.to}`; }

  function draw() {
    const m = market();
    const upd = rates.ts ? new Date(rates.ts).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }) : '';
    root.innerHTML = `
      <div class="page-head"><h1>💱 Курсы и переводы</h1><p>Через что выгоднее выводить деньги: сравни способы по итоговой сумме, которая реально дойдёт.</p></div>
      <div class="grid g2">
        <div class="card">
          <h2>Что переводим</h2>
          <div class="tabs" id="modeTabs">
            <button class="tab ${S.mode === 'send' ? 'active' : ''}" data-mode="send">У меня есть сумма</button>
            <button class="tab ${S.mode === 'receive' ? 'active' : ''}" data-mode="receive">Хочу получить сумму</button>
          </div>
          <div class="fields">
            <label class="field ${S.mode === 'send' ? '' : 'hidden'}">Отправляю<input id="amount" inputmode="decimal" value="${S.amount}"></label>
            <label class="field ${S.mode === 'receive' ? '' : 'hidden'}">Хочу получить<input id="target" inputmode="decimal" value="${S.target}"></label>
            <label class="field">Из валюты<select id="from">${curOpts(S.from)}</select></label>
            <label class="field">В валюту<select id="to">${curOpts(S.to)}</select></label>
          </div>
          <p class="small muted mt">Рыночный курс: <b>1 ${S.to} = ${fmtSmart(1 / m)} ${S.from}</b> · 1 ${S.from} = ${fmtSmart(m)} ${S.to}<br>
            ${esc(rates.source)}${upd ? ', обновлено ' + upd : ''} <button class="btn ghost small" id="refreshRates">↻ Обновить</button></p>
          ${rates.offline ? '<div class="note">Нет связи с сервером курсов — показаны примерные значения. Впиши курсы вручную.</div>' : ''}
        </div>
        <div class="card">
          <h2>🏆 Рейтинг</h2>
          <ol class="rank" id="rank"></ol>
          <div class="row mt"><button class="btn ghost small" id="saveHist">📌 Запомнить сравнение</button></div>
        </div>
      </div>

      <div class="card mt">
        <div class="row between mb"><h2 style="margin:0">Способы перевода</h2>
          <div class="row"><button class="btn small" id="addRoute">＋ Свой способ</button><button class="btn ghost small" id="resetRoutes">↺ Шаблоны</button></div></div>
        <div class="note info small mb">Каждый способ — цепочка шагов. В шаге впиши курс так, как он показан в банке/приложении, и комиссию (% и/или фиксированную в валюте шага). Кнопка ⇄ переворачивает запись курса, «≈ рынок» подставляет рыночный.</div>
        <div id="routes">${S.routes.map(drawRoute).join('')}</div>
      </div>

      <div class="grid g2 mt">
        <div class="card"><h2>📒 История сравнений</h2><div id="hist"></div></div>
        <div class="card"><h2>🔁 Быстрый конвертер (рынок)</h2>
          <div class="fields"><label class="field">Сумма<input id="cvAmt" inputmode="decimal" value="100"></label><label class="field">Валюта<select id="cvCur">${curOpts('USD')}</select></label></div>
          <div class="table-wrap mt"><table id="cvTable"></table></div>
        </div>
      </div>
      <div class="card mt"><h2>💡 Как выбрать выгоднее</h2><ul>
        <li>Сравнивай <b>итоговую сумму на карте получателя</b>, а не «комиссию 0%» — скрытая плата почти всегда в курсе.</li>
        <li>Через доллары часто теряешь дважды: на покупке $ и на продаже $. Выгодно только если спред маленький.</li>
        <li>Проверяй курс <b>в момент отправки</b> — у Paysend и банков он меняется в течение дня.</li>
        <li>У фиксированной комиссии выгоднее отправлять одну крупную сумму, чем несколько маленьких — переключи «Хочу получить», чтобы увидеть.</li>
        <li>Учитывай лимиты и комиссию за снятие наличных в Казахстане (добавь отдельный шаг ₸→₸ с комиссией).</li>
      </ul></div>`;
    bind();
    recalc();
    drawHist();
    drawConverter();
  }

  function drawRoute(r) {
    return `<div class="route" data-route="${r.id}">
      <div class="route-head">
        <input class="rname grow" data-f="name" value="${esc(r.name)}" aria-label="Название способа">
        <div class="row">
          ${r.link ? `<a class="btn ghost small" href="${esc(r.link)}" target="_blank" rel="noopener">Открыть ↗</a>` : ''}
          <button class="btn ghost small" data-act="addStep">＋ шаг</button>
          <button class="icon-btn" data-act="delRoute" title="Удалить способ">🗑</button>
        </div>
      </div>
      ${r.note ? `<p class="small muted" style="margin:4px 6px 0">${esc(r.note)}</p>` : ''}
      ${r.steps.map((s, i) => drawStep(s, i)).join('')}
      <div class="result-line" data-res="${r.id}"></div>
    </div>`;
  }

  function drawStep(s, i) {
    return `<div class="step" data-step="${s.id}">
      <label class="field">${i + 1}. Из<select data-sf="from">${curOpts(s.from)}</select></label>
      <div class="arrow">→</div>
      <label class="field">В<select data-sf="to">${curOpts(s.to)}</select></label>
      <label class="field rate-f"><span data-ratelabel>${rateLabel(s)}</span>
        <span class="rate-wrap"><input data-sf="rate" inputmode="decimal" value="${s.rate}" ${s.from === s.to ? 'disabled' : ''}>
        <button class="btn ghost small flip" data-act="flip" title="Перевернуть запись курса" ${s.from === s.to ? 'disabled' : ''}>⇄</button>
        <button class="btn ghost small flip" data-act="market" title="Подставить рыночный курс" ${s.from === s.to ? 'disabled' : ''}>≈ рынок</button></span></label>
      <label class="field fee-f">Комиссия %<input data-sf="feePct" inputmode="decimal" value="${s.feePct}"></label>
      <label class="field fee-f">Фикс. (${s.from})<input data-sf="feeFix" inputmode="decimal" value="${s.feeFix}"></label>
      <button class="icon-btn del" data-act="delStep" title="Удалить шаг">✕</button>
      ${s.label ? `<div class="small muted" style="grid-column:1/-1;margin-top:-4px">${esc(s.label)}</div>` : ''}
    </div>`;
  }

  function findRoute(el) { const id = el.closest('[data-route]')?.dataset.route; return S.routes.find(r => r.id === id); }
  function findStep(route, el) { const id = el.closest('[data-step]')?.dataset.step; return route?.steps.find(s => s.id === id); }

  function bind() {
    root.querySelector('#modeTabs').addEventListener('click', e => {
      const b = e.target.closest('[data-mode]'); if (!b) return;
      S.mode = b.dataset.mode; save(); draw();
    });
    root.querySelector('#amount').addEventListener('input', e => { S.amount = num(e.target.value); save(); recalc(); });
    root.querySelector('#target').addEventListener('input', e => { S.target = num(e.target.value); save(); recalc(); });
    root.querySelector('#from').addEventListener('change', e => { S.from = e.target.value; save(); draw(); });
    root.querySelector('#to').addEventListener('change', e => { S.to = e.target.value; save(); draw(); });
    root.querySelector('#refreshRates').addEventListener('click', async () => { rates = await U.getRates(true); toast(rates.offline ? 'Не удалось обновить' : 'Курсы обновлены'); draw(); });
    root.querySelector('#addRoute').addEventListener('click', () => {
      const mr = market();
      S.routes.push({ id: uid(), name: 'Мой способ', note: '', link: '', steps: [step(S.from, S.to, round(mr < 1 ? 1 / mr : mr), mr < 1 ? 'from_per_to' : 'to_per_from')] });
      save(); draw();
    });
    root.querySelector('#resetRoutes').addEventListener('click', () => {
      if (!confirm('Вернуть шаблонные способы (Через $, Paysend, Tenge Bank)? Твои способы будут заменены.')) return;
      S.from = 'UZS'; S.to = 'KZT'; S.routes = presets(rates.rates); save(); draw();
    });
    root.querySelector('#saveHist').addEventListener('click', saveHist);

    const routesEl = root.querySelector('#routes');
    routesEl.addEventListener('input', e => {
      const r = findRoute(e.target); if (!r) return;
      if (e.target.dataset.f === 'name') { r.name = e.target.value; save(); recalc(); return; }
      const s = findStep(r, e.target); const f = e.target.dataset.sf;
      if (s && f && e.target.tagName === 'INPUT') { s[f] = e.target.value; save(); recalc(); }
    });
    routesEl.addEventListener('change', e => {
      const r = findRoute(e.target); const s = findStep(r, e.target); const f = e.target.dataset.sf;
      if (s && (f === 'from' || f === 'to')) {
        s[f] = e.target.value;
        if (s.from !== s.to) {
          const mr = cross(rates.rates, s.from, s.to);
          s.quote = mr < 1 ? 'from_per_to' : 'to_per_from';
          s.rate = round(mr < 1 ? 1 / mr : mr);
        }
        save(); draw();
      }
    });
    routesEl.addEventListener('click', e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const r = findRoute(b); if (!r) return;
      const act = b.dataset.act;
      if (act === 'delRoute') { if (!confirm(`Удалить «${r.name}»?`)) return; S.routes = S.routes.filter(x => x !== r); }
      if (act === 'addStep') { const last = r.steps[r.steps.length - 1]; const c = last ? last.to : S.from; r.steps.push(step(c, c, 1, 'to_per_from', 0, 0, 'Комиссия / снятие')); }
      const s = findStep(r, b);
      if (act === 'delStep' && s) r.steps = r.steps.filter(x => x !== s);
      if (act === 'flip' && s) { s.quote = s.quote === 'from_per_to' ? 'to_per_from' : 'from_per_to'; s.rate = round(1 / num(s.rate)); }
      if (act === 'market' && s) { const mr = cross(rates.rates, s.from, s.to); s.rate = round(s.quote === 'from_per_to' ? 1 / mr : mr); }
      save(); draw();
    });
  }
  function round(x) { if (!isFinite(x) || !x) return 0; const d = x >= 100 ? 2 : x >= 1 ? 4 : 6; return Math.round(x * 10 ** d) / 10 ** d; }

  function recalc() {
    const m = market();
    const res = results();
    const send = S.mode === 'send';
    const ideal = send ? S.amount * m : S.target / m;
    const valid = res.filter(x => isFinite(send ? x.out : x.need) && (send ? x.out : x.need) > 0);
    valid.sort((a, b) => send ? b.out - a.out : a.need - b.need);
    const best = valid[0];

    res.forEach(x => {
      const el = root.querySelector(`[data-res="${x.r.id}"]`);
      const card = root.querySelector(`[data-route="${x.r.id}"]`);
      if (!el) return;
      card.classList.toggle('best', x === best && valid.length > 1);
      if (x.err) { el.innerHTML = `<span class="badge bad">${esc(x.err)}</span>`; return; }
      const val = send ? x.out : x.need;
      if (!isFinite(val) || val <= 0) { el.innerHTML = `<span class="badge bad">Проверь курс и комиссии</span>`; return; }
      const eff = send ? S.amount / x.out : x.need / S.target; // сколько FROM за 1 TO
      const loss = send ? (ideal - x.out) / ideal * 100 : (x.need - ideal) / ideal * 100;
      el.innerHTML = send
        ? `<span>Дойдёт: <span class="big">${fmt(x.out, 0)} ${S.to}</span></span>`
        : `<span>Нужно отправить: <span class="big">${fmt(x.need, 0)} ${S.from}</span></span>`;
      el.innerHTML += `<span class="small muted">Итоговый курс: 1 ${S.to} = ${fmtSmart(eff)} ${S.from}</span>
        <span class="badge ${loss < 1.5 ? 'good' : loss < 4 ? 'warn' : 'bad'}">${loss >= 0 ? 'потеря' : 'выгода'} ${fmt(Math.abs(loss), 2)}% к рынку</span>`;
    });

    const rank = root.querySelector('#rank');
    if (!valid.length) { rank.innerHTML = '<li class="muted">Нет корректных способов</li>'; return; }
    rank.innerHTML = valid.map((x, i) => {
      const val = send ? x.out : x.need;
      const diff = send ? best.out - x.out : x.need - best.need;
      return `<li><span class="pos">${i + 1}</span><span class="grow"><b>${esc(x.r.name)}</b>${i ? `<br><span class="small muted">${send ? 'на' : 'дороже на'} ${fmt(diff, 0)} ${send ? S.to + ' меньше' : S.from}</span>` : '<br><span class="small" style="color:var(--good)">самый выгодный</span>'}</span>
        <span class="num nowrap"><b>${fmt(val, 0)}</b> ${send ? S.to : S.from}</span></li>`;
    }).join('') + `<li><span class="pos">≈</span><span class="grow muted small">Идеал по рыночному курсу</span><span class="num nowrap muted">${fmt(ideal, 0)} ${send ? S.to : S.from}</span></li>`;
  }

  function saveHist() {
    const res = results().filter(x => !x.err && isFinite(x.out));
    if (!res.length) return;
    const h = Store.get('money:hist', []);
    h.unshift({ ts: Date.now(), amount: S.amount, from: S.from, to: S.to, items: res.map(x => ({ name: x.r.name, out: x.out })).sort((a, b) => b.out - a.out) });
    Store.set('money:hist', h.slice(0, 30));
    toast('Сохранено в историю'); drawHist();
  }
  function drawHist() {
    const h = Store.get('money:hist', []);
    const el = root.querySelector('#hist');
    if (!h.length) { el.innerHTML = '<p class="muted small">Нажимай «Запомнить сравнение», когда проверяешь курсы — со временем увидишь, какой способ обычно выгоднее.</p>'; return; }
    const wins = {};
    h.forEach(x => { const n = x.items[0]?.name; if (n) wins[n] = (wins[n] || 0) + 1; });
    el.innerHTML = `<p class="small">Чаще всего выигрывал: ${Object.entries(wins).sort((a, b) => b[1] - a[1]).map(([n, c]) => `<span class="badge accent">${esc(n)} × ${c}</span>`).join(' ')}</p>
      <div class="table-wrap"><table><tr><th>Дата</th><th>Сумма</th><th>Лучший</th><th></th></tr>
      ${h.slice(0, 10).map((x, i) => `<tr><td class="small nowrap">${new Date(x.ts).toLocaleDateString('ru-RU')}</td><td class="num small nowrap">${fmt(x.amount)} ${x.from}</td>
        <td class="small">${esc(x.items[0].name)}<br><span class="muted">${fmt(x.items[0].out)} ${x.to}</span></td><td><button class="icon-btn" data-h="${i}">✕</button></td></tr>`).join('')}
      </table></div>`;
    el.querySelectorAll('[data-h]').forEach(b => b.addEventListener('click', () => { h.splice(+b.dataset.h, 1); Store.set('money:hist', h); drawHist(); }));
  }

  function drawConverter() {
    const amt = root.querySelector('#cvAmt'), cur = root.querySelector('#cvCur'), tbl = root.querySelector('#cvTable');
    const upd = () => {
      const a = num(amt.value);
      tbl.innerHTML = CURS.filter(c => c !== cur.value && rates.rates[c]).map(c => `<tr><td>${c} <span class="muted small">${NAMES[c]}</span></td><td class="num" style="text-align:right"><b>${fmtSmart(a * cross(rates.rates, cur.value, c))}</b></td></tr>`).join('');
    };
    amt.addEventListener('input', upd); cur.addEventListener('change', upd); upd();
  }

  App.register({ id: 'money', title: 'Курсы и переводы', short: 'Курсы', icon: '💱', render });
})();
