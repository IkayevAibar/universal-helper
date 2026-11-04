/* Рисует значки ухода за одеждой (ISO 3758) в SVG. Спецификация: 'тип:параметр:линии' */
(function () {
  const S = 'fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';
  const cross = '<path d="M7 7 L41 41 M41 7 L7 41" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>';
  const dots = (n, cx, cy, gap = 6) => Array.from({ length: n }, (_, i) => `<circle cx="${cx + (i - (n - 1) / 2) * gap}" cy="${cy}" r="2.2" fill="currentColor"/>`).join('');
  const lines = n => [43, 47].slice(0, n).map(y => `<path d="M8 ${y} H40" ${S}/>`).join('');

  function tub(inner, n) {
    return `<path d="M5 15 L10 37 H38 L43 15" ${S}/><path d="M5 15 q4.75 -5 9.5 0 t9.5 0 t9.5 0 t9.5 0" ${S}/>${inner}${lines(n)}`;
  }

  function icon(spec) {
    const [type, p = '', l = '0'] = spec.split(':');
    const n = +l || 0;
    let body = '';
    switch (type) {
      case 'wash':
        if (p === 'x') body = tub('', 0) + cross;
        else if (p === 'hand') body = tub('<path d="M17 33 v-9 m4 9 v-12 m4 12 v-12 m4 12 v-9 m-12 3 q-4 -3 -6 0 l6 6 h12 q2 -2 2 -6" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/>', 0);
        else if (p.startsWith('d')) body = tub(dots(+p.slice(1), 24, 27), n);
        else body = tub(`<text x="24" y="32" text-anchor="middle" font-size="12" font-weight="700" fill="currentColor" font-family="system-ui">${p}</text>`, n);
        break;
      case 'bleach':
        body = `<path d="M24 6 L44 40 H4 Z" ${S}/>`;
        if (p === 'x') body += cross;
        if (p === 'noncl') body += `<path d="M18 36 L28 18 M24 36 L32 22" ${S}/>`;
        if (p === 'cl') body += `<text x="24" y="35" text-anchor="middle" font-size="11" font-weight="700" fill="currentColor" font-family="system-ui">CL</text>`;
        break;
      case 'tumble':
        body = `<rect x="6" y="6" width="36" height="36" rx="2" ${S}/><circle cx="24" cy="24" r="13" ${S}/>`;
        if (p === 'x') body += cross;
        else if (p === 'fill') body += '<circle cx="24" cy="24" r="10" fill="currentColor"/>';
        else if (+p) body += dots(+p, 24, 24);
        body = body + (n ? '' : '');
        if (n) body = `<g transform="translate(0,-2)">${body}</g>${lines(n).replace(/43/g, '45')}`;
        break;
      case 'dry':
        body = `<rect x="6" y="6" width="36" height="36" rx="2" ${S}/>`;
        if (p === 'line') body += `<path d="M7 9 q17 14 34 0" ${S}/>`;
        if (p === 'drip') body += `<path d="M18 13 V35 M24 13 V35 M30 13 V35" ${S}/>`;
        if (p === 'flat') body += `<path d="M13 24 H35" ${S}/>`;
        if (p === 'shade') body += `<path d="M6 16 L16 6 M6 23 L23 6" ${S}/><path d="M13 30 H35" ${S}/>`;
        if (p === 'lineshade') body += `<path d="M6 16 L16 6 M6 23 L23 6" ${S}/><path d="M20 12 q11 10 21 -3" ${S}/>`;
        break;
      case 'iron':
        body = `<path d="M5 37 H42 C42 25 37 16 26 16 H14 L12 22" ${S}/><path d="M20 16 V12 H38" ${S}/>`;
        if (p === 'x') body += cross;
        else if (p === 'nosteam') body += `<path d="M10 40 L6 46 M18 40 L14 46" ${S}/><path d="M4 39 L18 47" ${S}/>`;
        else if (+p) body += dots(+p, 27, 29, 6);
        break;
      case 'clean':
        body = `<circle cx="24" cy="24" r="17" ${S}/>`;
        if (p === 'x') body += cross;
        else if (p) body += `<text x="24" y="30" text-anchor="middle" font-size="16" font-weight="700" fill="currentColor" font-family="system-ui">${p}</text>`;
        if (n) body += [44, 48].slice(0, n).map(y => `<path d="M10 ${y - 1} H38" ${S}/>`).join('');
        break;
      case 'wring':
        body = `<path d="M8 24 q4 -12 8 0 t8 0 t8 0 t8 0" ${S}/><path d="M6 24 c-3 6 4 10 6 4 M42 24 c3 6 -4 10 -6 4" ${S}/>`;
        if (p === 'x') body += cross;
        break;
    }
    return `<svg viewBox="0 0 48 50" aria-hidden="true">${body}</svg>`;
  }

  window.LaundryIcon = icon;
})();
