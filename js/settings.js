/* Настройки: имя, тема, резервная копия данных */
(function () {
  const { Store, esc, toast } = U;
  function render(el) {
    const theme = Store.get('theme', 'auto');
    el.innerHTML = `<div class="page-head"><h1>⚙️ Настройки</h1><p>Все данные хранятся только в этом браузере. Делай резервную копию, чтобы перенести на другое устройство.</p></div>
      <div class="grid g2">
        <div class="card"><h2>👤 Обо мне</h2>
          <label class="field">Как к тебе обращаться<input id="sName" value="${esc(Store.get('settings:name', ''))}" placeholder="Имя"></label>
          <h3 class="mt">Тема</h3>
          <div class="tabs">${[['auto', '🌓 Как в системе'], ['light', '☀️ Светлая'], ['dark', '🌙 Тёмная']].map(([k, l]) => `<button class="tab ${k === theme ? 'active' : ''}" data-th="${k}">${l}</button>`).join('')}</div></div>
        <div class="card"><h2>💾 Резервная копия</h2>
          <p class="small muted">Скачай файл с данными (дела, вакансии, расходы, привычки…) и загрузи его на телефоне или после очистки браузера.</p>
          <div class="row"><button class="btn" id="exp">⬇️ Скачать копию</button><label class="btn ghost" style="cursor:pointer">⬆️ Загрузить<input type="file" id="imp" accept="application/json" class="hidden"></label></div>
          <h3 class="mt">📱 Как поставить на телефон</h3>
          <p class="small">Открой сайт в браузере телефона → меню (⋮ или «Поделиться») → <b>«Добавить на главный экран»</b>. Будет как приложение и работает без интернета (кроме курсов, погоды и вакансий).</p>
          <h3 class="mt">🧨 Сброс</h3><button class="btn danger small" id="wipe">Удалить все данные</button></div>
      </div>`;
    el.querySelector('#sName').addEventListener('input', e => Store.set('settings:name', e.target.value.trim()));
    el.querySelectorAll('[data-th]').forEach(b => b.addEventListener('click', () => { Store.set('theme', b.dataset.th); location.reload(); }));
    el.querySelector('#exp').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(Store.exportAll(), null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `pomoshnik-backup-${U.dateKey()}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
    el.querySelector('#imp').addEventListener('change', async e => {
      const f = e.target.files[0]; if (!f) return;
      try { const data = JSON.parse(await f.text()); if (!confirm('Загрузить данные из файла? Текущие данные с теми же ключами будут заменены.')) return; Store.importAll(data); toast('Данные загружены'); setTimeout(() => location.reload(), 600); }
      catch (err) { toast('Не получилось прочитать файл'); }
    });
    el.querySelector('#wipe').addEventListener('click', () => { if (confirm('Точно удалить ВСЕ данные? Это нельзя отменить.') && confirm('Совсем точно?')) { Store.clearAll(); location.reload(); } });
  }
  App.register({ id: 'settings', title: 'Настройки', icon: '⚙️', render });
})();
