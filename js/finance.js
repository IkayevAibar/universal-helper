/* Финансовая грамотность: уроки, калькуляторы и учёт расходов */
(function () {
  const { Store, esc, uid, fmt, num, toast, dateKey, lineChart } = U;
  let root, tab = Store.get('fin:tab', 'learn');

  const LESSONS = [
    ['1. Сначала заплати себе', `<p>Как только пришла зарплата — <b>сразу</b> переведи 10–20% на отдельный счёт. Не «что останется в конце месяца» (не останется), а в первый же день.</p><ul><li>Настрой автоперевод в банке на день зарплаты.</li><li>Начни хоть с 5% — привычка важнее суммы.</li></ul>`],
    ['2. Подушка безопасности', `<p>Это деньги на случай потери работы, болезни, поломки. Цель — <b>3–6 месячных расходов</b>.</p><ul><li>Храни отдельно от карты для трат, но с быстрым доступом (накопительный счёт / депозит с правом снятия).</li><li>Пока нет подушки — не инвестируй в рискованное.</li><li>Посчитай в калькуляторе «Подушка».</li></ul>`],
    ['3. Бюджет 50/30/20', `<p>Простое правило распределения дохода:</p><ul><li><b>50%</b> — необходимое: жильё, еда, транспорт, связь, кредиты.</li><li><b>30%</b> — желания: кафе, развлечения, одежда сверх нужного.</li><li><b>20%</b> — будущее: подушка, цели, инвестиции.</li></ul><p>Если «необходимое» больше 60% — ищи, где сократить, или как увеличить доход.</p>`],
    ['4. Сложный процент', `<p>Процент начисляется на проценты. 100 000 под 15% годовых через 10 лет станут ~405 000, а не 250 000.</p><ul><li>Главное — <b>время</b>: начать на 5 лет раньше часто важнее, чем вкладывать больше.</li><li>Регулярные пополнения дают больше, чем разовый вклад.</li></ul>`],
    ['5. Инфляция съедает деньги', `<p>Деньги «под подушкой» дешевеют каждый год. Если инфляция 8–10%, то через 7–9 лет на ту же сумму купишь примерно вдвое меньше.</p><ul><li>Сравнивай ставку депозита с инфляцией: реальная доходность = ставка − инфляция.</li><li>Держать сбережения в нескольких валютах (сум/тенге/доллар) — способ снизить валютный риск.</li></ul>`],
    ['6. Кредиты и рассрочки', `<ul><li>Смотри на <b>ГЭСВ/эффективную ставку</b> и общую переплату, а не на ежемесячный платёж.</li><li>«Рассрочка 0%» часто прячет стоимость в цену товара или страховку.</li><li>Платежи по всем кредитам — не больше 30% дохода.</li><li>Гаси сначала самый дорогой долг (лавина) или самый маленький (снежный ком — для мотивации).</li><li>Никогда не бери кредит на потребление «чтобы как у всех».</li></ul>`],
    ['7. Инвестиции — с чего начать', `<ul><li>Только после подушки и без долгов под высокий процент.</li><li>Начинай с простого: депозиты, гос. облигации, широкие индексные фонды (ETF).</li><li><b>Диверсификация</b>: не всё в одну бумагу/валюту/страну.</li><li>Вкладывай только то, что не понадобится 3–5 лет.</li><li>Обещают 5–10% в месяц «гарантированно» — это мошенничество/пирамида.</li></ul>`],
    ['8. Защита от мошенников', `<ul><li>Банк <b>никогда</b> не просит код из SMS, CVV или пароль. Звонят «из банка» — клади трубку и перезвони по номеру с карты.</li><li>«Ваша карта заблокирована, переведите на безопасный счёт» — 100% мошенники.</li><li>Не переходи по ссылкам из SMS о «выигрыше» и «доставке».</li><li>Включи уведомления обо всех операциях и лимиты на онлайн-платежи.</li></ul>`],
    ['9. Импульсивные покупки', `<ul><li><b>Правило 72 часов</b>: хочешь вещь дороже N — подожди 3 дня. Половина желаний пройдёт.</li><li>Считай цену в часах работы: «эти кроссовки = 20 часов моей работы».</li><li>Удали сохранённые карты из маркетплейсов — лишний шаг охлаждает.</li><li>Проверь калькулятор «Цена привычки».</li></ul>`],
    ['10. Увеличивай доход', `<p>Экономить можно до предела, а доход ограничен куда меньше.</p><ul><li>Раз в год проси повышение или ищи предложения на рынке (см. «Вакансии»).</li><li>Вкладывай в навыки, которые лучше оплачиваются: язык, IT, продажи.</li><li>Подработка/фриланс — отдельный счёт и сразу часть в накопления.</li></ul>`],
    ['11. Финансовые цели', `<p>Цель = сумма + срок. «Накопить на машину» → «1,5 млн ₸ за 18 месяцев = 83 тыс в месяц».</p><ul><li>Раздели на короткие (до года), средние (1–5 лет) и долгие (пенсия, жильё).</li><li>Для каждой цели — отдельный «конверт» или счёт.</li></ul>`],
    ['12. Ежемесячный ритуал (15 минут)', `<ol><li>Посмотри расходы за месяц по категориям.</li><li>Найди 1 статью, где можно сократить.</li><li>Проверь подписки — отмени ненужные.</li><li>Пополни подушку/цели.</li><li>Запиши, сколько всего у тебя денег (капитал) — смотри, как растёт.</li></ol>`]
  ];

  const MN = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const CATS = ['🍔 Еда', '🏠 Жильё', '🚕 Транспорт', '📱 Связь', '🛍 Покупки', '🎉 Развлечения', '💊 Здоровье', '📚 Учёба', '🎁 Подарки', '💸 Другое'];

  function render(el) { root = el; draw(); }

  function draw() {
    root.innerHTML = `<div class="page-head"><h1>📈 Финансы</h1><p>Короткие уроки, калькуляторы и простой учёт расходов.</p></div>
      <div class="tabs" id="ftabs">${[['learn', '📚 Уроки'], ['budget', '🧮 Бюджет 50/30/20'], ['compound', '🌱 Сложный процент'], ['cushion', '🛟 Подушка'], ['loan', '🏦 Кредит'], ['habit', '☕ Цена привычки'], ['goal', '🎯 Цель'], ['spend', '🧾 Расходы']]
        .map(([k, l]) => `<button class="tab ${tab === k ? 'active' : ''}" data-t="${k}">${l}</button>`).join('')}</div>
      <div id="fbody"></div>`;
    root.querySelector('#ftabs').addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (b) { tab = b.dataset.t; Store.set('fin:tab', tab); draw(); } });
    ({ learn, budget, compound, cushion, loan, habit, goal, spend })[tab](root.querySelector('#fbody'));
  }

  // Поля калькуляторов запоминаются
  function form(el, key, fields, calc) {
    const vals = Store.get('fin:' + key, Object.fromEntries(fields.map(f => [f[0], f[2]])));
    el.innerHTML = `<div class="grid g2"><div class="card"><div class="fields">${fields.map(([k, l, , extra]) =>
      `<label class="field">${l}<input data-k="${k}" inputmode="decimal" value="${esc(vals[k])}" ${extra || ''}></label>`).join('')}</div></div><div class="card" id="out"></div></div><div id="extra"></div>`;
    const run = () => { const v = {}; el.querySelectorAll('[data-k]').forEach(i => v[i.dataset.k] = num(i.value)); calc(v, el.querySelector('#out'), el.querySelector('#extra')); };
    el.querySelectorAll('[data-k]').forEach(i => i.addEventListener('input', () => { vals[i.dataset.k] = i.value; Store.set('fin:' + key, vals); run(); }));
    run();
  }

  function learn(el) {
    const done = Store.get('fin:learned', []);
    el.innerHTML = `<div class="card mb"><div class="row between"><b>Прочитано: ${done.length} из ${LESSONS.length}</b><span class="muted small">Отмечай уроки галочкой</span></div>
      <div class="bar mt"><span style="width:${done.length / LESSONS.length * 100}%"></span></div></div>` +
      LESSONS.map(([t, b], i) => `<details class="acc"><summary><span>${done.includes(i) ? '✅ ' : ''}${esc(t)}</span></summary><div class="acc-body">${b}
        <label class="row small mt"><input type="checkbox" data-l="${i}" ${done.includes(i) ? 'checked' : ''}> Понял, применяю</label></div></details>`).join('');
    el.querySelectorAll('[data-l]').forEach(c => c.addEventListener('change', () => {
      const i = +c.dataset.l; const d = Store.get('fin:learned', []);
      Store.set('fin:learned', c.checked ? [...new Set([...d, i])] : d.filter(x => x !== i)); learn(el);
      if (c.checked) toast('+1 к финансовой грамотности 🧠');
    }));
  }

  function budget(el) {
    form(el, 'budget', [['income', 'Доход в месяц', 500000], ['needs', 'Сейчас трачу на необходимое', 0], ['wants', 'Сейчас трачу на желания', 0]], (v, out) => {
      const n = v.income * .5, w = v.income * .3, s = v.income * .2;
      const row = (l, ideal, cur, more) => {
        const ok = more ? cur >= ideal : cur <= ideal;
        const badge = cur == null ? '' : ok ? '<span class="badge good">ок</span>' : `<span class="badge bad">${more ? '−' : '+'}${fmt(Math.abs(cur - ideal))}</span>`;
        return `<tr><td>${l}</td><td class="num"><b>${fmt(ideal)}</b></td><td class="num">${cur == null ? '—' : fmt(cur)}</td><td>${badge}</td></tr>`;
      };
      const filled = v.needs || v.wants;
      const saving = filled ? v.income - v.needs - v.wants : null;
      out.innerHTML = `<h2>Распределение</h2><table><tr><th></th><th>Норма</th><th>Сейчас</th><th></th></tr>
        ${row('🏠 Необходимое 50%', n, filled ? v.needs : null)}${row('🎉 Желания 30%', w, filled ? v.wants : null)}${row('💰 Накопления 20%', s, saving, true)}</table>
        <p class="small muted mt">Накопления 20% = <b>${fmt(s * 12)}</b> за год.</p>`;
    });
  }

  function compound(el) {
    form(el, 'compound', [['start', 'Стартовая сумма', 100000], ['monthly', 'Пополнение в месяц', 20000], ['rate', 'Доходность, % годовых', 14], ['years', 'Срок, лет', 10], ['infl', 'Инфляция, % (для реальной суммы)', 8]], (v, out, extra) => {
      const months = Math.round(v.years * 12), r = v.rate / 100 / 12;
      let bal = v.start, inv = v.start; const balS = [bal], invS = [inv], labels = ['0'];
      for (let m = 1; m <= months; m++) { bal = bal * (1 + r) + v.monthly; inv += v.monthly; if (m % 12 === 0 || m === months) { balS.push(bal); invS.push(inv); labels.push(String(Math.ceil(m / 12))); } }
      const real = bal / Math.pow(1 + v.infl / 100, v.years);
      out.innerHTML = `<h2>Через ${fmt(v.years)} ${U.plural(v.years, 'год', 'года', 'лет')}</h2>
        <div class="grid g2"><div class="stat"><span class="v">${fmt(bal)}</span><span class="l">итого на счёте</span></div>
        <div class="stat"><span class="v">${fmt(inv)}</span><span class="l">вложено своих</span></div>
        <div class="stat"><span class="v" style="color:var(--good)">+${fmt(bal - inv)}</span><span class="l">заработали проценты</span></div>
        <div class="stat"><span class="v">${fmt(real)}</span><span class="l">в сегодняшних деньгах (с инфляцией)</span></div></div>`;
      extra.innerHTML = `<div class="card mt"><div class="legend"><span><i style="background:var(--accent)"></i>Баланс</span><span><i style="background:var(--muted)"></i>Вложено</span></div><canvas class="chart" id="cc"></canvas><p class="small muted">По оси — годы</p></div>`;
      const css = getComputedStyle(document.documentElement);
      requestAnimationFrame(() => lineChart(extra.querySelector('#cc'), [{ data: invS, color: css.getPropertyValue('--muted').trim() }, { data: balS, color: css.getPropertyValue('--accent').trim(), fill: true }], { labels }));
    });
  }

  function cushion(el) {
    form(el, 'cushion', [['spend', 'Мои обязательные расходы в месяц', 300000], ['have', 'Уже накоплено', 0], ['save', 'Могу откладывать в месяц', 50000]], (v, out) => {
      const t3 = v.spend * 3, t6 = v.spend * 6;
      const left = Math.max(0, t3 - v.have), m = v.save ? Math.ceil(left / v.save) : Infinity;
      const pct = Math.min(100, v.have / t6 * 100);
      out.innerHTML = `<h2>Подушка</h2><p>Минимум (3 мес): <b>${fmt(t3)}</b><br>Комфорт (6 мес): <b>${fmt(t6)}</b></p>
        <div class="bar"><span style="width:${pct}%"></span></div><p class="small muted mt">Накоплено ${fmt(pct, 0)}% от 6-месячной подушки · хватит на ${fmt(v.spend ? v.have / v.spend : 0, 1)} мес.</p>
        ${left > 0 ? `<p>До минимума осталось <b>${fmt(left)}</b> — это примерно <b>${isFinite(m) ? m + ' ' + U.plural(m, 'месяц', 'месяца', 'месяцев') : '∞ (укажи сколько откладываешь)'}</b>.</p>` : '<p class="badge good">Минимальная подушка есть 🎉</p>'}`;
    });
  }

  function loan(el) {
    form(el, 'loan', [['sum', 'Сумма кредита', 2000000], ['rate', 'Ставка, % годовых', 24], ['months', 'Срок, месяцев', 24], ['extra', 'Досрочно доплачивать в месяц', 0]], (v, out) => {
      const r = v.rate / 100 / 12, n = v.months;
      const pay = r ? v.sum * r / (1 - Math.pow(1 + r, -n)) : v.sum / n;
      const total = pay * n;
      let bal = v.sum, m = 0, paid = 0;
      while (bal > 0.5 && m < 1200) { const int = bal * r; const p = Math.min(bal + int, pay + v.extra); bal = bal + int - p; paid += p; m++; }
      out.innerHTML = `<h2>Аннуитетный платёж</h2><div class="grid g2">
        <div class="stat"><span class="v">${fmt(pay)}</span><span class="l">в месяц</span></div>
        <div class="stat"><span class="v" style="color:var(--bad)">${fmt(total - v.sum)}</span><span class="l">переплата (${fmt((total - v.sum) / v.sum * 100, 0)}%)</span></div></div>
        <p class="mt">Всего отдашь: <b>${fmt(total)}</b></p>
        ${v.extra ? `<div class="note info">С доплатой ${fmt(v.extra)}/мес закроешь за <b>${m} мес.</b> вместо ${n} и сэкономишь <b>${fmt(total - paid)}</b>.</div>` : '<p class="small muted">Впиши досрочную доплату — увидишь, сколько сэкономишь.</p>'}`;
    });
  }

  function habit(el) {
    form(el, 'habit', [['cost', 'Стоимость за раз', 1500], ['perWeek', 'Раз в неделю', 5], ['rate', 'Если бы вкладывал под % годовых', 12], ['hourly', 'Мой доход в час (необязательно)', 0]], (v, out) => {
      const month = v.cost * v.perWeek * 52 / 12, year = month * 12;
      const fv = yrs => { const r = v.rate / 100 / 12; let b = 0; for (let i = 0; i < yrs * 12; i++) b = b * (1 + r) + month; return b; };
      out.innerHTML = `<h2>Привычка стоит</h2><table>
        <tr><td>в месяц</td><td class="num"><b>${fmt(month)}</b></td></tr><tr><td>в год</td><td class="num"><b>${fmt(year)}</b></td></tr>
        <tr><td>за 5 лет с вложением</td><td class="num"><b>${fmt(fv(5))}</b></td></tr><tr><td>за 10 лет с вложением</td><td class="num"><b>${fmt(fv(10))}</b></td></tr></table>
        ${v.hourly ? `<p class="mt">Это <b>${fmt(year / v.hourly)} часов</b> работы в год.</p>` : ''}
        <p class="small muted">Не значит «никогда не пей кофе» — просто решай осознанно.</p>`;
    });
  }

  function goal(el) {
    form(el, 'goal', [['target', 'Сколько нужно', 1500000], ['have', 'Уже есть', 0], ['months', 'За сколько месяцев', 12], ['rate', 'Доход на остаток, % годовых', 0]], (v, out) => {
      const r = v.rate / 100 / 12, n = Math.max(1, v.months);
      const fvHave = v.have * Math.pow(1 + r, n);
      const need = Math.max(0, v.target - fvHave);
      const monthly = r ? need * r / (Math.pow(1 + r, n) - 1) : need / n;
      out.innerHTML = `<h2>Откладывать</h2><div class="stat"><span class="v">${fmt(monthly)}</span><span class="l">в месяц</span></div>
        <p class="mt">≈ <b>${fmt(monthly / 4.33)}</b> в неделю · <b>${fmt(monthly / 30.4)}</b> в день</p>
        <p class="small muted">Создай задачу «каждый месяц отложить ${fmt(monthly)}» в Делах.</p>`;
    });
  }

  // Учёт расходов
  function spend(el) {
    const list = Store.get('fin:spend', []);
    const now = new Date();
    const mk = Store.get('fin:spendMonth', `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    const months = [...new Set([mk, ...list.map(x => x.date.slice(0, 7))])].sort().reverse();
    const cur = list.filter(x => x.date.startsWith(mk));
    const total = cur.reduce((a, b) => a + b.sum, 0);
    const byCat = {}; cur.forEach(x => byCat[x.cat] = (byCat[x.cat] || 0) + x.sum);
    const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    const [y, m] = mk.split('-').map(Number);
    el.innerHTML = `<div class="grid g2">
      <div class="card"><h2>Добавить расход</h2>
        <form id="sf" class="stack" style="gap:10px">
          <div class="fields"><label class="field">Сумма<input id="sSum" inputmode="decimal" required></label><label class="field">Дата<input id="sDate" type="date" value="${dateKey()}"></label></div>
          <div class="chips" id="sCats">${CATS.map((c, i) => `<button type="button" class="chip ${i === 0 ? 'on' : ''}" data-c="${esc(c)}">${c}</button>`).join('')}</div>
          <input id="sNote" placeholder="Комментарий (необязательно)">
          <button class="btn">Добавить</button></form></div>
      <div class="card"><div class="row between"><h2 style="margin:0">${MN[m - 1]} ${y}</h2>
        <select id="sMonth" style="width:auto">${months.map(x => `<option ${x === mk ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
        <div class="stat mt"><span class="v">${fmt(total)}</span><span class="l">потрачено за месяц</span></div>
        <div class="mt">${sorted.length ? sorted.map(([c, s]) => `<div class="mt"><div class="row between small"><span>${esc(c)}</span><b class="num">${fmt(s)} · ${fmt(s / total * 100)}%</b></div><div class="bar"><span style="width:${s / sorted[0][1] * 100}%"></span></div></div>`).join('') : '<p class="muted small">Пока пусто</p>'}</div></div></div>
      <div class="card mt"><h2>Записи</h2>${cur.length ? `<div class="table-wrap"><table><tr><th>Дата</th><th>Категория</th><th>Сумма</th><th></th></tr>
        ${cur.sort((a, b) => b.date.localeCompare(a.date)).map(x => `<tr><td class="small nowrap">${x.date.slice(8)}.${x.date.slice(5, 7)}</td><td>${esc(x.cat)}${x.note ? `<div class="small muted">${esc(x.note)}</div>` : ''}</td><td class="num nowrap">${fmt(x.sum)}</td><td><button class="icon-btn" data-d="${x.id}">🗑</button></td></tr>`).join('')}</table></div>` : '<p class="muted small">Записывай траты хотя бы месяц — увидишь, куда уходят деньги.</p>'}</div>`;
    let cat = CATS[0];
    el.querySelector('#sCats').addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (!b) return; cat = b.dataset.c; el.querySelectorAll('#sCats .chip').forEach(x => x.classList.toggle('on', x === b)); });
    el.querySelector('#sf').addEventListener('submit', e => {
      e.preventDefault();
      const sum = num(el.querySelector('#sSum').value); if (!sum) return;
      const date = el.querySelector('#sDate').value || dateKey();
      list.push({ id: uid(), sum, cat, date, note: el.querySelector('#sNote').value.trim() });
      Store.set('fin:spend', list); Store.set('fin:spendMonth', date.slice(0, 7)); toast('Записано'); spend(el);
    });
    el.querySelector('#sMonth').addEventListener('change', e => { Store.set('fin:spendMonth', e.target.value); spend(el); });
    el.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', () => { Store.set('fin:spend', list.filter(x => x.id !== b.dataset.d)); spend(el); }));
  }

  App.register({ id: 'finance', title: 'Финансы', icon: '📈', render });
  window.FinTips = LESSONS;
})();
