/* Ядро: хранилище, роутер, утилиты. Все данные лежат в localStorage этого браузера. */
(function () {
  const PREFIX = 'uh:';

  const Store = {
    get(key, def) {
      try {
        const raw = localStorage.getItem(PREFIX + key);
        return raw == null ? structuredCloneSafe(def) : JSON.parse(raw);
      } catch (e) { return structuredCloneSafe(def); }
    },
    set(key, value) {
      try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch (e) { toast('Не удалось сохранить (память браузера недоступна)'); }
    },
    remove(key) { try { localStorage.removeItem(PREFIX + key); } catch (e) {} },
    exportAll() {
      const out = {};
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k.startsWith(PREFIX)) out[k.slice(PREFIX.length)] = JSON.parse(localStorage.getItem(k));
        }
      } catch (e) {}
      return out;
    },
    importAll(obj) { Object.entries(obj).forEach(([k, v]) => Store.set(k, v)); },
    clearAll() {
      try { Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).forEach(k => localStorage.removeItem(k)); } catch (e) {}
    }
  };
  function structuredCloneSafe(v) { return v === undefined ? v : JSON.parse(JSON.stringify(v)); }

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function fmt(n, digits = 0) {
    if (n == null || !isFinite(n)) return '—';
    return Number(n).toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }
  function fmtSmart(n) {
    if (n == null || !isFinite(n)) return '—';
    const a = Math.abs(n);
    const d = a >= 1000 ? 0 : a >= 10 ? 2 : a >= 1 ? 3 : 5;
    return fmt(n, d);
  }
  const num = v => { const x = parseFloat(String(v ?? '').replace(/\s/g, '').replace(',', '.')); return isFinite(x) ? x : 0; };

  // Даты в локальном часовом поясе в формате YYYY-MM-DD
  const pad = n => String(n).padStart(2, '0');
  const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = (key, n) => { const d = parseKey(key); d.setDate(d.getDate() + n); return dateKey(d); };
  const parseKey = key => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); };
  const daysBetween = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 86400000);
  const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  function humanDate(key) {
    const t = dateKey();
    const diff = daysBetween(t, key);
    if (diff === 0) return 'сегодня';
    if (diff === 1) return 'завтра';
    if (diff === -1) return 'вчера';
    if (diff === 2) return 'послезавтра';
    const d = parseKey(key);
    return `${d.getDate()} ${MONTHS[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''}, ${WD[d.getDay()]}`;
  }
  function plural(n, one, few, many) {
    const a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b > 1 && b < 5) return few;
    if (b === 1) return one;
    return many;
  }

  let toastTimer;
  function toast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  async function fetchJSON(url, opts = {}, timeoutMs = 9000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const r = await fetch(url, { ...opts, signal: ctrl.signal });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } finally { clearTimeout(t); }
  }

  // Рыночные курсы (база USD), кешируются на 6 часов
  const FALLBACK_RATES = { USD: 1, UZS: 12500, KZT: 520, RUB: 82, EUR: 0.87, KGS: 87.5, TRY: 41, AED: 3.67, CNY: 7.15, GBP: 0.76 };
  async function getRates(force = false) {
    const cache = Store.get('rates', null);
    if (!force && cache && Date.now() - cache.ts < 6 * 3600 * 1000) return cache;
    try {
      const j = await fetchJSON('https://open.er-api.com/v6/latest/USD');
      if (j && j.rates) {
        const data = { ts: Date.now(), rates: j.rates, source: 'open.er-api.com', updated: j.time_last_update_utc };
        Store.set('rates', data);
        return data;
      }
    } catch (e) { /* офлайн или API недоступен */ }
    return cache || { ts: 0, rates: FALLBACK_RATES, source: 'примерные значения (нет интернета)', offline: true };
  }
  const cross = (rates, from, to) => (rates[to] && rates[from]) ? rates[to] / rates[from] : NaN;

  // Роутер
  const modules = [];
  let current = null;
  function register(m) { modules.push(m); }

  function renderNav() {
    const items = modules.filter(m => !m.hidden);
    const html = items.map(m => `<a href="#${m.id}" data-id="${m.id}"><span class="ico">${m.icon}</span><span>${esc(m.title)}</span></a>`).join('');
    document.getElementById('nav').innerHTML = html;
    document.getElementById('bottomNav').innerHTML = items.map(m => `<a href="#${m.id}" data-id="${m.id}"><span class="ico">${m.icon}</span><span>${esc(m.short || m.title)}</span></a>`).join('');
  }

  function route() {
    const [id, ...rest] = (location.hash.slice(1) || 'home').split('/');
    const m = modules.find(x => x.id === id) || modules[0];
    if (current && current.destroy) current.destroy();
    current = m;
    document.querySelectorAll('[data-id]').forEach(a => a.classList.toggle('active', a.dataset.id === m.id));
    const active = document.querySelector(`#bottomNav a[data-id="${m.id}"]`);
    if (active) active.scrollIntoView({ block: 'nearest', inline: 'center' });
    const view = document.getElementById('view');
    view.innerHTML = '';
    document.title = (m.id === 'home' ? '' : m.title + ' · ') + 'Мой помощник';
    m.render(view, rest);
    window.scrollTo(0, 0);
  }

  function applyTheme() {
    const t = Store.get('theme', 'auto');
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
  }

  function start() {
    applyTheme();
    renderNav();
    window.addEventListener('hashchange', route);
    document.getElementById('themeToggle').addEventListener('click', () => {
      const order = ['auto', 'light', 'dark'];
      const next = order[(order.indexOf(Store.get('theme', 'auto')) + 1) % order.length];
      Store.set('theme', next); applyTheme();
      toast('Тема: ' + ({ auto: 'как в системе', light: 'светлая', dark: 'тёмная' })[next]);
    });
    route();
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  // Простой линейный график на canvas
  function lineChart(canvas, series, opts = {}) {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, hgt = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = hgt * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const css = getComputedStyle(document.documentElement);
    const muted = css.getPropertyValue('--muted').trim(), border = css.getPropertyValue('--border').trim();
    const pad = { l: 8, r: 8, t: 10, b: 22 };
    const all = series.flatMap(s => s.data);
    const max = Math.max(...all, 1), n = Math.max(...series.map(s => s.data.length));
    const x = i => pad.l + (w - pad.l - pad.r) * (n <= 1 ? 0 : i / (n - 1));
    const y = v => pad.t + (hgt - pad.t - pad.b) * (1 - v / max);
    ctx.strokeStyle = border; ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) { const yy = pad.t + (hgt - pad.t - pad.b) * g / 4; ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(w - pad.r, yy); ctx.stroke(); }
    series.forEach(s => {
      ctx.strokeStyle = s.color; ctx.lineWidth = 2.5; ctx.beginPath();
      s.data.forEach((v, i) => i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v)));
      ctx.stroke();
      if (s.fill) { ctx.lineTo(x(s.data.length - 1), y(0)); ctx.lineTo(x(0), y(0)); ctx.closePath(); ctx.globalAlpha = .12; ctx.fillStyle = s.color; ctx.fill(); ctx.globalAlpha = 1; }
    });
    ctx.fillStyle = muted; ctx.font = '11px system-ui'; ctx.textAlign = 'center';
    const labels = opts.labels || [];
    const stepL = Math.ceil(labels.length / 6) || 1;
    labels.forEach((l, i) => { if (i % stepL === 0 || i === labels.length - 1) ctx.fillText(l, x(i), hgt - 6); });
  }

  window.App = { register, start, route, modules };
  window.U = { Store, esc, uid, fmt, fmtSmart, num, dateKey, addDays, parseKey, daysBetween, humanDate, plural, toast, fetchJSON, getRates, cross, MONTHS, WD, lineChart };
})();
