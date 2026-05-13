// ===== Mobile nav toggle =====
const menuToggle = document.getElementById("menu-toggle");
const navLinks = document.getElementById("nav-links");

if (menuToggle && navLinks) {
  menuToggle.addEventListener("click", function () {
    navLinks.classList.toggle("show");
    const expanded = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!expanded));
  });

  navLinks.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      navLinks.classList.remove("show");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });
}

const params = new URLSearchParams(window.location.search);
if (params.get("thanks") === "1") {
  alert("Thanks — your email was submitted successfully!");
}

// ===== Nav consolidation =====
// Groups data pages into "Live ▾" and "Insights ▾" dropdowns to keep the nav
// from wrapping on smaller widths. Reuses the .nav-dropdown* classes that
// already style the Settings dropdown across the site.
(function consolidateNav() {
  const navLinks = document.getElementById('nav-links');
  if (!navLinks) return;

  const groups = [
    { label: 'Live', hrefs: ['scores.html', 'schedule.html', 'odds.html', 'injuries.html'] },
    { label: 'Insights', hrefs: ['matchups.html', 'standings.html', 'leaders.html', 'news.html'] },
  ];

  const currentPage = (window.location.pathname.split('/').pop() || 'index.html');

  for (const group of groups) {
    const links = group.hrefs
      .map(h => navLinks.querySelector(`a[href="${h}"]`))
      .filter(Boolean);
    if (links.length === 0) continue;

    const wrapper = document.createElement('div');
    wrapper.className = `nav-dropdown nav-grouped-${group.label.toLowerCase()}`;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nav-dropdown-btn';
    btn.textContent = `${group.label} ▾`;
    if (group.hrefs.includes(currentPage)) btn.classList.add('active');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Close other consolidated dropdowns first.
      document.querySelectorAll('.nav-grouped-live, .nav-grouped-insights').forEach(dd => {
        if (dd !== wrapper) dd.classList.remove('open');
      });
      wrapper.classList.toggle('open');
    });

    const menu = document.createElement('div');
    menu.className = 'nav-dropdown-menu';
    // Left-align the menu under the button; the inline per-page rule sets
    // `right: 0` for the Settings dropdown, so we override here.
    menu.style.left = '0';
    menu.style.right = 'auto';

    // Drop the wrapper where the first matched link was, then move the matched
    // links into the menu so order in the menu mirrors original nav order.
    navLinks.insertBefore(wrapper, links[0]);
    wrapper.appendChild(btn);
    wrapper.appendChild(menu);
    links.forEach(link => menu.appendChild(link));
  }

  // Outside click closes any open grouped dropdown.
  document.addEventListener('click', (e) => {
    document.querySelectorAll('.nav-grouped-live, .nav-grouped-insights').forEach(dd => {
      if (!dd.contains(e.target)) dd.classList.remove('open');
    });
  });
})();

// ===== Global team search (injected into the nav of every page) =====
(function setupTeamSearch() {
  const VERCEL = 'https://better-bookie-five.vercel.app';
  const CACHE_KEY = 'teamIndexV1';
  const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
  const SPORT_LABEL = { nfl: 'NFL', nba: 'NBA', mlb: 'MLB', nhl: 'NHL', ncaafb: 'NCAA FB', ncaabb: 'NCAA BB' };

  // Inject the search styles once.
  const css = `
    .team-search { position: relative; display: inline-block; margin-left: 0.5rem; }
    .team-search input { width: 180px; padding: 0.35rem 0.7rem; font-size: 0.85rem; border-radius: 4px; border: 1px solid rgba(255,255,255,0.18); background: rgba(255,255,255,0.05); color: inherit; font-family: inherit; }
    .team-search input::placeholder { opacity: 0.5; }
    .team-search input:focus { outline: none; border-color: rgba(255,255,255,0.45); background: rgba(255,255,255,0.08); }
    .team-search-results { display: none; position: absolute; top: calc(100% + 4px); right: 0; min-width: 280px; max-height: 360px; overflow-y: auto; background: #1a1a2e; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; z-index: 200; padding: 0.35rem 0; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
    .team-search.open .team-search-results { display: block; }
    .team-search-results .ts-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.45rem 0.75rem; color: inherit; text-decoration: none; font-size: 0.85rem; cursor: pointer; }
    .team-search-results .ts-item:hover, .team-search-results .ts-item.active { background: rgba(255,255,255,0.06); }
    .team-search-results .ts-item img { width: 22px; height: 22px; object-fit: contain; flex-shrink: 0; }
    .team-search-results .ts-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .team-search-results .ts-sport { font-size: 0.7rem; opacity: 0.55; text-transform: uppercase; letter-spacing: 0.05em; }
    .team-search-empty { padding: 0.5rem 0.75rem; opacity: 0.55; font-size: 0.82rem; }
    @media (max-width: 720px) {
      .team-search { margin: 0.5rem 0 0; width: 100%; }
      .team-search input { width: 100%; }
      .team-search-results { right: auto; left: 0; min-width: 100%; }
    }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // Build the widget element.
  function buildWidget() {
    const wrap = document.createElement('div');
    wrap.className = 'team-search';
    wrap.innerHTML = `
      <input type="search" placeholder="🔍 Find a team…" autocomplete="off" aria-label="Search teams">
      <div class="team-search-results" role="listbox"></div>
    `;
    return wrap;
  }

  const nav = document.getElementById('nav-links');
  if (!nav) return;
  const widget = buildWidget();
  nav.appendChild(widget);

  const input = widget.querySelector('input');
  const resultsEl = widget.querySelector('.team-search-results');
  let teamIndex = null;
  let activeIdx = -1;
  let visibleItems = [];

  async function loadIndex() {
    if (teamIndex) return teamIndex;
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null');
      if (cached && Date.now() - cached.savedAt < CACHE_TTL_MS && Array.isArray(cached.teams)) {
        teamIndex = cached.teams;
        return teamIndex;
      }
    } catch {}
    try {
      const r = await fetch(`${VERCEL}/api/team-index`);
      const data = await r.json();
      teamIndex = data?.teams ?? [];
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ teams: teamIndex, savedAt: Date.now() })); } catch {}
      return teamIndex;
    } catch {
      teamIndex = [];
      return teamIndex;
    }
  }

  function score(team, q) {
    const name = (team.name ?? '').toLowerCase();
    const short = (team.short ?? '').toLowerCase();
    const abbrev = (team.abbreviation ?? '').toLowerCase();
    if (name === q || abbrev === q) return 100;
    if (name.startsWith(q)) return 80;
    if (short.startsWith(q)) return 75;
    if (abbrev.startsWith(q)) return 70;
    if (name.includes(q)) return 50;
    if (short.includes(q)) return 40;
    return 0;
  }

  function filter(q) {
    if (!teamIndex || !q) return [];
    const lower = q.trim().toLowerCase();
    if (!lower) return [];
    return teamIndex
      .map(t => ({ ...t, _score: score(t, lower) }))
      .filter(t => t._score > 0)
      .sort((a, b) => b._score - a._score)
      .slice(0, 8);
  }

  function renderResults(matches) {
    activeIdx = -1;
    if (matches.length === 0) {
      resultsEl.innerHTML = `<div class="team-search-empty">No teams match. Try a different name.</div>`;
      visibleItems = [];
      return;
    }
    resultsEl.innerHTML = matches.map(t => `
      <a class="ts-item" href="team.html?sport=${t.sport}&id=${t.id}">
        ${t.logo ? `<img src="${t.logo}" alt="" onerror="this.style.display='none'">` : '<div style="width:22px;height:22px;"></div>'}
        <span class="ts-name">${t.name}</span>
        <span class="ts-sport">${SPORT_LABEL[t.sport] ?? t.sport}</span>
      </a>
    `).join('');
    visibleItems = [...resultsEl.querySelectorAll('.ts-item')];
  }

  async function onInput() {
    const q = input.value;
    if (!q) {
      widget.classList.remove('open');
      resultsEl.innerHTML = '';
      return;
    }
    widget.classList.add('open');
    if (!teamIndex) {
      resultsEl.innerHTML = `<div class="team-search-empty">Loading teams…</div>`;
      await loadIndex();
    }
    renderResults(filter(q));
  }

  function moveActive(delta) {
    if (visibleItems.length === 0) return;
    activeIdx = (activeIdx + delta + visibleItems.length) % visibleItems.length;
    visibleItems.forEach((el, i) => el.classList.toggle('active', i === activeIdx));
    visibleItems[activeIdx].scrollIntoView({ block: 'nearest' });
  }

  input.addEventListener('input', onInput);
  input.addEventListener('focus', () => { if (input.value) widget.classList.add('open'); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); moveActive(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveActive(-1); }
    else if (e.key === 'Enter') {
      const target = activeIdx >= 0 ? visibleItems[activeIdx] : visibleItems[0];
      if (target) { e.preventDefault(); window.location.href = target.href; }
    } else if (e.key === 'Escape') {
      widget.classList.remove('open');
      input.blur();
    }
  });
  document.addEventListener('click', (e) => {
    if (!widget.contains(e.target)) widget.classList.remove('open');
  });
})();
