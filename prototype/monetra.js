/* Monetra prototype shell and demo behaviour. All figures are synthetic demo data. */
(function () {
  const rp = (n) => n.toLocaleString('id-ID');
  const page = document.body.dataset.page;

  const NAV = [
    ['dashboard', 'Dashboard', 'layout-dashboard', 'dashboard.html'],
    ['transactions', 'Transactions', 'receipt-text', 'transactions.html'],
    ['wallets', 'Wallets', 'wallet', 'wallets.html'],
    ['categories', 'Categories', 'tags', 'categories.html'],
    ['budgets', 'Budgets', 'gauge', 'budgets.html'],
    ['reports', 'Reports', 'chart-column', 'reports.html'],
    ['settings', 'Settings', 'settings', 'settings.html'],
  ];
  const TABS = [
    ['dashboard', 'Home', 'house', 'dashboard.html'],
    ['transactions', 'Transactions', 'receipt-text', 'transactions.html'],
    ['add', 'Add', 'plus', 'transaction-new.html'],
    ['reports', 'Reports', 'chart-column', 'reports.html'],
    ['settings', 'Settings', 'settings', 'settings.html'],
  ];
  // On mobile, Wallets, Categories and Budgets live under Home and Settings (PRD 4.2).
  const tabFor = { wallets: 'dashboard', categories: 'settings', budgets: 'settings' };

  if (page) {
    const cur = (id) => (id === page ? ' aria-current="page"' : '');
    const rail = document.createElement('aside');
    rail.className = 'rail';
    rail.innerHTML =
      '<a class="wordmark" href="dashboard.html" aria-label="Monetra home">MONETRA<b>.</b></a>' +
      '<nav aria-label="Main">' +
      NAV.map(([id, label, icon, href]) => `<a href="${href}"${cur(id)}><i data-lucide="${icon}"></i>${label}</a>`).join('') +
      '</nav>' +
      '<a class="btn btn-add" href="transaction-new.html"><i data-lucide="plus"></i>Add transaction</a>' +
      '<div class="rail-user"><strong>Dina Maharani</strong>dina@example.com</div>';
    const band = document.createElement('header');
    band.className = 'band';
    band.innerHTML = '<a class="wordmark" href="dashboard.html" aria-label="Monetra home">MONETRA<b>.</b></a><a class="who" href="settings.html" aria-label="Settings for Dina Maharani">DM</a>';
    const activeTab = tabFor[page] || page;
    const tabbar = document.createElement('nav');
    tabbar.className = 'tabbar';
    tabbar.setAttribute('aria-label', 'Main');
    tabbar.innerHTML = TABS.map(([id, label, icon, href]) =>
      id === 'add'
        ? `<a class="add" href="${href}" aria-label="Add transaction"><span class="sq"><i data-lucide="plus"></i></span>${label}</a>`
        : `<a href="${href}"${id === activeTab ? ' aria-current="page"' : ''}><i data-lucide="${icon}"></i>${label}</a>`
    ).join('');
    const main = document.querySelector('.main');
    document.body.insertBefore(rail, main);
    main.insertBefore(band, main.firstChild);
    document.body.appendChild(tabbar);
  }

  /* November 2026 demo month. Index 0 is 1 Nov. Today is Saturday 14 Nov. */
  const NOV = [185000, 96000, 1250000, 74000, 132000, 58000, 410000, 265000, 88000, 47000, 121000, 310000, 92000, 284000];
  const TODAY = 14, DAYS = 30, PACE = 200000;
  const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const FIRST_OFFSET = 6; // 1 Nov 2026 is a Sunday; weeks run Monday to Sunday.

  function renderSheet(el) {
    const usePace = el.dataset.pace !== 'off';
    const interactive = el.dataset.static === undefined;
    const cap = 420000; // bar scale tops out here so one rent day does not flatten the rest
    let html = DOW.map((d) => `<div class="dow">${d}</div>`).join('');
    for (let i = 0; i < FIRST_OFFSET; i++) html += '<div class="cell blank" aria-hidden="true"></div>';
    for (let d = 1; d <= DAYS; d++) {
      const v = NOV[d - 1];
      const cls = ['cell'];
      if (d > TODAY) cls.push('future');
      if (d === TODAY) cls.push('today');
      const red = usePace && v > PACE;
      if (red) cls.push('red');
      const label = v === undefined
        ? `${d} November, no data yet`
        : `${d} November, Rp ${rp(v)} spent${red ? ', red date, over the daily pace' : ''}${d === TODAY ? ', today' : ''}`;
      const inner = `<span class="n">${d}</span>` + (v === undefined ? '' : `<span class="v">${rp(v)}</span><span class="bar" style="width:${Math.min(100, Math.round((v / cap) * 100))}%"></span>`);
      html += v !== undefined && interactive
        ? `<button type="button" class="${cls.join(' ')}" data-day="${d}" aria-pressed="false" aria-label="${label}">${inner}</button>`
        : `<div class="${cls.join(' ')}" aria-label="${label}">${inner}</div>`;
    }
    const tail = (7 - ((FIRST_OFFSET + DAYS) % 7)) % 7;
    for (let i = 0; i < tail; i++) html += '<div class="cell blank" aria-hidden="true"></div>';
    el.innerHTML = html;
    const note = document.querySelector(el.dataset.note || '#day-note');
    if (!interactive || !note) return;
    const rest = note.innerHTML;
    el.addEventListener('click', (e) => {
      const cell = e.target.closest('button.cell');
      if (!cell) return;
      const was = cell.getAttribute('aria-pressed') === 'true';
      el.querySelectorAll('button.cell').forEach((c) => c.setAttribute('aria-pressed', 'false'));
      el.classList.toggle('has-sel', !was);
      if (was) { note.innerHTML = rest; return; }
      cell.setAttribute('aria-pressed', 'true');
      const d = +cell.dataset.day, v = NOV[d - 1], diff = v - PACE;
      const wd = DOW[(FIRST_OFFSET + d - 1) % 7];
      const verdict = !usePace ? '' : diff > 0
        ? `<span class="neg"><strong>Rp ${rp(diff)} over</strong> the daily pace</span>`
        : `<span>Rp ${rp(-diff)} under the daily pace</span>`;
      note.innerHTML = `<strong>${wd} ${d} Nov</strong><span>Rp ${rp(v)} spent</span>${verdict}<a href="transactions.html">View transactions</a>`;
    });
  }
  document.querySelectorAll('[data-sheet]').forEach(renderSheet);

  /* Year of mini months for Reports: red squares mark red dates. Synthetic pattern, November matches the sheet. */
  const year = document.querySelector('[data-year]');
  if (year) {
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const len = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const offs = [3, 6, 6, 2, 4, 0, 2, 5, 1, 3, 6, 1]; // Monday-first offset of day 1 in 2026
    let seed = 20261114, count = 0, html = '';
    const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    names.forEach((n, m) => {
      let cells = '<i class="x"></i>'.repeat(offs[m]);
      for (let d = 1; d <= len[m]; d++) {
        const future = m > 10 || (m === 10 && d > TODAY);
        const red = !future && (m === 10 ? NOV[d - 1] > PACE : rnd() < (m === 2 ? 0.3 : 0.15));
        if (red) count++;
        cells += `<i class="${future ? 'f' : red ? 'r' : ''}"></i>`;
      }
      html += `<div><h3>${n}</h3><div class="mini" role="img" aria-label="${n} 2026">${cells}</div></div>`;
    });
    year.innerHTML = html;
    const out = document.querySelector('[data-red-count]');
    if (out) out.textContent = count;
  }

  /* Segmented controls and single-choice chip groups */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-choice] > button, [data-choice] > .chip');
    if (!b) return;
    const attr = b.hasAttribute('aria-checked') ? 'aria-checked' : 'aria-pressed';
    [...b.parentElement.children].forEach((s) => s.setAttribute(attr, 'false'));
    b.setAttribute(attr, 'true');
    const group = b.parentElement.dataset.choice;
    if (group === 'type') setType(b.dataset.value);
    if (group === 'tab') document.querySelectorAll('[data-tab]').forEach((p) => (p.hidden = p.dataset.tab !== b.dataset.value));
  });
  function setType(t) {
    document.querySelectorAll('[data-for]').forEach((el) => (el.hidden = !el.dataset.for.split(' ').includes(t)));
    const save = document.querySelector('[data-save]');
    if (save) save.textContent = 'Save ' + t;
  }

  /* Dialogs */
  document.addEventListener('click', (e) => {
    const open = e.target.closest('[data-open]');
    if (open) { e.preventDefault(); document.querySelector(open.dataset.open).showModal(); }
    const close = e.target.closest('[data-close]');
    if (close) close.closest('dialog').close();
    const toggle = e.target.closest('[data-toggle]');
    if (toggle) { e.preventDefault(); const t = document.querySelector(toggle.dataset.toggle); t.hidden = !t.hidden; if (!t.hidden) t.focus && t.focus(); }
  });

  /* Chart readout */
  document.querySelectorAll('.chart').forEach((chart) => {
    const out = document.querySelector(chart.dataset.readout);
    const show = (col) => {
      chart.querySelectorAll('.col').forEach((c) => c.setAttribute('aria-pressed', c === col ? 'true' : 'false'));
      const i = +col.dataset.in, o = +col.dataset.out, net = i - o;
      if (out) out.innerHTML = `<strong>${col.dataset.label}</strong><span>Income Rp ${rp(i)}</span><span>Expense Rp ${rp(o)}</span><span class="${net < 0 ? 'neg' : ''}">Net ${net < 0 ? '−' : '+'}Rp ${rp(Math.abs(net))}</span>`;
    };
    chart.querySelectorAll('.col').forEach((col) => {
      col.addEventListener('click', () => show(col));
      col.addEventListener('focus', () => show(col));
      col.addEventListener('mouseenter', () => show(col));
    });
    const def = chart.querySelector('.col[aria-pressed="true"]');
    if (def) show(def);
  });

  if (window.lucide) window.lucide.createIcons();
})();
