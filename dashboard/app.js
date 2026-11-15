// Token Launch Radar — the page's logic. Everything renders from window.RADAR (../data.js, written
// by main.ts from the same board the gate checks): no fetch, no framework, no network. The board
// table, the filters, the per-protocol detail view, the comparables and the method page are all
// rendered here from that one dataset, so what the screenshots show is what the code computes.

const R = window.RADAR;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Money, compact: $1.54B, $262M, $1.2M, $850K, $940. */
function money(n) {
  if (n === null || n === undefined) return '—';
  const a = Math.abs(n);
  if (a >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}
/** A signed percent with one decimal, or an em dash. */
function pct(n) {
  if (n === null || n === undefined) return '—';
  const s = n > 0 ? '+' : '';
  return `${s}${n.toFixed(1)}%`;
}
function cls(n) { return n === null || n === undefined || n === 0 ? '' : n > 0 ? 'pos' : 'neg'; }
function ageText(days) {
  if (days === null || days === undefined) return 'age unknown';
  if (days < 365) return `${days}d old`;
  return `${(days / 365).toFixed(1)}y old`;
}

// ------------------------------------------------------------- masthead + stats
$('modelVersion').textContent = R.model_version;
$('mastMeta').innerHTML =
  `snapshot <b>${esc(R.as_of)}</b><br>source <b>${esc(R.source.split(',')[0])}</b><br>model <b>${esc(R.model_version)}</b>`;
const totalImplied = R.rows.reduce((s, r) => s + r.implied_value_usd, 0);
const stats = [
  [String(R.protocols_scanned), 'protocols scanned'],
  [`<em>${R.board_size}</em>`, `on the board (${R.watchlist_size} watchlist + ${R.early_size} early)`],
  [money(totalImplied), 'total implied value'],
  [String(R.categories.length), 'categories priced from live peers'],
  [`${R.global_multiple.toFixed(3)}&times;`, 'global median mcap / TVL'],
];
$('stats').innerHTML = stats.map(([v, k]) => `<div class="stat"><div class="v">${v}</div><div class="k">${k}</div></div>`).join('');
$('footNote').textContent = `Built from ${R.source}. The board holds ${R.board_size} pre-token protocols: the ${R.watchlist_size} of the watchlist (TVL at or above ${money(R.floor_usd)} recording no token) and ${R.early_size} early finds below that floor.`;

// ------------------------------------------------------------- state + filters
const state = { view: 'board', q: '', cat: '', chain: '', set: 'all', sort: 'implied', detail: '' };
(function fromHash() {
  const h = new URLSearchParams(location.hash.replace(/^#/, ''));
  for (const k of ['view', 'q', 'cat', 'chain', 'set', 'sort', 'detail']) if (h.get(k)) state[k] = h.get(k);
})();

const catOf = (r) => r.category ?? 'Uncategorised';
const categories = [...new Set(R.rows.map(catOf))].sort();
const chains = [...new Set(R.rows.flatMap((r) => r.chains))].sort();
$('fCategory').innerHTML = `<option value="">All categories</option>` + categories.map((c) => `<option>${esc(c)}</option>`).join('');
$('fChain').innerHTML = `<option value="">All chains</option>` + chains.map((c) => `<option>${esc(c)}</option>`).join('');
$('q').value = state.q;
$('fCategory').value = state.cat;
$('fChain').value = state.chain;
$('fSet').value = state.set;
$('fSort').value = state.sort;

function visibleRows() {
  let rows = R.rows.filter((r) =>
    (state.set === 'all' || (state.set === 'watchlist') === r.on_watchlist) &&
    (state.cat === '' || catOf(r) === state.cat) &&
    (state.chain === '' || r.chains.includes(state.chain)) &&
    (state.q === '' || `${r.name} ${catOf(r)} ${r.slug}`.toLowerCase().includes(state.q.toLowerCase())));
  const by = {
    implied: (a, b) => a.rank - b.rank,
    expected: (a, b) => b.expected_value_usd - a.expected_value_usd,
    score: (a, b) => b.launch_score - a.launch_score || a.rank - b.rank,
    tvl: (a, b) => b.tvl_usd - a.tvl_usd,
    growth: (a, b) => (b.change_7d ?? -Infinity) - (a.change_7d ?? -Infinity),
    age: (a, b) => (b.age_days ?? -1) - (a.age_days ?? -1),
  };
  return rows.sort(by[state.sort] ?? by.implied);
}

function renderBoard() {
  const rows = visibleRows();
  $('rowCount').textContent = `${rows.length} of ${R.rows.length} protocols`;
  $('boardBody').innerHTML = rows.map((r) => `
    <tr class="row${state.detail === r.slug ? ' open' : ''}" data-slug="${esc(r.slug)}">
      <td class="rank">${r.rank}</td>
      <td><span class="pname">${esc(r.name)}</span><span class="badge ${r.on_watchlist ? 'wl' : 'early'}">${r.on_watchlist ? 'WATCHLIST' : 'EARLY'}</span><br>
          <span class="pcat">${esc(catOf(r))} · ${ageText(r.age_days)}</span></td>
      <td class="chains">${esc(r.chains.slice(0, 3).join(', '))}${r.chains.length > 3 ? ` +${r.chains.length - 3}` : ''}</td>
      <td class="num">${money(r.tvl_usd)}</td>
      <td class="num ${cls(r.change_7d)}">${pct(r.change_7d)}</td>
      <td class="num">${r.base_multiple.toFixed(3)}&times;</td>
      <td class="num implied">${money(r.implied_value_usd)}</td>
      <td><div class="score"><div class="bar"><i style="width:${r.launch_score}%"></i></div><span class="n">${r.launch_score}</span></div></td>
      <td class="num">${money(r.expected_value_usd)}</td>
    </tr>`).join('');
  for (const tr of document.querySelectorAll('#boardBody tr.row')) {
    tr.addEventListener('click', () => openDetail(tr.dataset.slug));
  }
  if (state.detail) openDetail(state.detail, true);
}

// ------------------------------------------------------------- detail view
function factor(label, mult, note, widthPct) {
  return `<div class="factor"><div class="fl"><span>${label}</span><b>${mult}</b></div>
    <div class="bar"><i style="width:${Math.max(2, Math.min(100, widthPct))}%"></i></div>
    <div class="note">${note}</div></div>`;
}

function openDetail(slug, keep) {
  const r = R.rows.find((x) => x.slug === slug);
  if (!r) return;
  state.detail = slug;
  const cat = R.categories.find((c) => c.category === (r.category ?? ''));
  const peers = R.live.filter((l) => (l.category ?? '') === (r.category ?? '')).slice(0, 3);
  const d = $('detail');
  d.hidden = false;
  d.innerHTML = `
    <h2>${esc(r.name)} <span class="badge ${r.on_watchlist ? 'wl' : 'early'}">${r.on_watchlist ? 'WATCHLIST' : 'EARLY RADAR'}</span></h2>
    <p class="sub">${esc(catOf(r))} · ${esc(r.chains.join(', ') || 'chain unrecorded')} · first tracked ${esc(r.listed_at ?? 'unknown')} (${ageText(r.age_days)}) · rank #${r.rank} of ${R.board_size}</p>
    <div class="detail-grid">
      <div>
        <h3>What a launch would be worth</h3>
        <dl class="kv">
          <dt>TVL</dt><dd>${money(r.tvl_usd)}</dd>
          <dt>Implied value</dt><dd>${money(r.implied_value_usd)}</dd>
          <dt>Launch score</dt><dd>${r.launch_score} / 100</dd>
          <dt>Expected value (score-weighted)</dt><dd>${money(r.expected_value_usd)}</dd>
          <dt>7-day TVL change</dt><dd>${pct(r.change_7d)}</dd>
        </dl>
        <h3 style="margin-top:20px">The price, factor by factor</h3>
        ${factor('Base multiple — its category\'s live median', `${r.base_multiple.toFixed(3)}&times;`,
          cat ? `from ${cat.live_count} live ${esc(cat.category)} protocols (median ${cat.median_multiple === null ? '—' : cat.median_multiple.toFixed(3) + '&times;'}, shrunk toward the global ${R.global_multiple.toFixed(3)}&times;)` : `no live protocol in this category: the global median ${R.global_multiple.toFixed(3)}&times; is used`,
          r.base_multiple * 100)}
        ${factor('Momentum — 7-day TVL change, damped', `${r.growth_multiplier.toFixed(2)}&times;`, `${pct(r.change_7d)} over 7 days, clamped and weighted at ${R.constants.growth_weight}`, (r.growth_multiplier - 0.5) * 100)}
        ${factor('Maturity — time run with no token', `${r.maturity_multiplier.toFixed(2)}&times;`, `${ageText(r.age_days)}; rises from ${R.constants.maturity_floor} at birth to ${R.constants.maturity_floor + R.constants.maturity_range} at ${R.constants.maturity_days} days`, (r.maturity_multiplier - 0.5) * 100)}
        ${factor('Breadth — chains it already runs on', `${r.breadth_multiplier.toFixed(2)}&times;`, `${r.chains.length} chain${r.chains.length === 1 ? '' : 's'}: +${(R.constants.breadth_per_chain * 100).toFixed(0)}% per extra chain, capped`, (r.breadth_multiplier - 1) * 400)}
        <p class="compact">Category token propensity: <b>${cat ? Math.round(cat.propensity * 100) + '%' : '—'}</b> of ${esc(catOf(r))} protocols in the snapshot already have a token — one of the launch score's five signals.</p>
        ${peers.length ? `<h3 style="margin-top:20px">Live comparables in ${esc(catOf(r))}</h3>
        <p class="compact">${peers.map((l) => `<b>${esc(l.name)}</b> (${esc(l.symbol ?? '')}) — mcap ${money(l.mcap_usd)} on TVL ${money(l.tvl_usd)}, ${l.multiple === null ? '—' : l.multiple.toFixed(2) + '&times;'}`).join('<br>')}</p>` : ''}
      </div>
      <div>
        <h3>How to farm it</h3>
        <ol class="plan">
          ${r.farm_plan.map((s) => `<li><span class="txt">${esc(s.text)}</span><span class="meta">Cost: ${esc(s.cost)} · Time: ${esc(s.time)}</span></li>`).join('')}
        </ol>
      </div>
    </div>`;
  for (const tr of document.querySelectorAll('#boardBody tr.row')) tr.classList.toggle('open', tr.dataset.slug === slug);
  if (!keep) d.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ------------------------------------------------------------- comparables view
function renderLive() {
  $('liveBody').innerHTML = R.live.map((l) => `
    <tr>
      <td><span class="pname">${esc(l.name)}</span> <span class="pcat">${esc(l.symbol ?? '')}</span></td>
      <td>${esc(l.category ?? '—')}</td>
      <td class="chains">${esc(l.chains.slice(0, 3).join(', '))}</td>
      <td class="num">${money(l.tvl_usd)}</td>
      <td class="num">${money(l.mcap_usd)}</td>
      <td class="num ${cls(l.change_7d)}">${pct(l.change_7d)}</td>
      <td class="num">${l.multiple === null ? '—' : l.multiple.toFixed(3) + '&times;'}</td>
    </tr>`).join('');
}

// ------------------------------------------------------------- method view
function renderMethod() {
  const c = R.constants;
  $('methodText').innerHTML = `
    <div class="formula">implied = TVL &times; base_multiple(category) &times; momentum(7d change) &times; maturity(age) &times; breadth(chains)</div>
    <ul>
      <li><b>Base multiple.</b> Every live-token protocol in the snapshot (CEX excluded) contributes its market cap / TVL, winsorized to [0.02, 3]. A category's base is its median, shrunk toward the global median ${R.global_multiple.toFixed(3)}&times; with weight n/(n+${c.shrink_k}): a category with 3 live protocols mostly inherits the global figure, one with 30 mostly speaks for itself. A category with no live protocol uses the global median.</li>
      <li><b>Momentum.</b> The 7-day TVL change, clamped to [${c.growth_floor}%, +${c.growth_cap}%], weighted at ${c.growth_weight}: a protocol doubling in a week is priced up to ${(1 + c.growth_weight).toFixed(1)}&times; its base, one halving down to ${(1 - c.growth_weight / 2).toFixed(2)}&times;.</li>
      <li><b>Maturity.</b> ${c.maturity_floor} at first tracking, rising linearly to ${c.maturity_floor + c.maturity_range} at ${c.maturity_days} days (unknown age counts as 365 days): a protocol that has run for years with no token has proved the product a token would claim a share of.</li>
      <li><b>Breadth.</b> +${(c.breadth_per_chain * 100).toFixed(0)}% per chain past the first, up to ${5} extra chains: distribution a launch reaches on day one.</li>
      <li><b>Launch score (0–100).</b> Scale (log TVL, up to 35), category token propensity (up to 25), age band (up to 15: the 6-month to 4-year band scores highest), momentum (up to 15) and chain breadth (up to 10). Expected value = implied &times; score / 100. The board ranks by implied value; the score is the farmer's lens, not the ranking.</li>
      <li><b>Coverage.</b> Every watchlist protocol is on the board (TVL at or above ${money(R.floor_usd)}, no token recorded, not a wrapped, staked or bridged product of one that trades). Below the floor the radar adds the ${R.early_size} strongest rankable pre-token protocols by implied value; above the floor it does not second-guess the watchlist's exclusions, whose reasons (a parent protocol) the snapshot does not carry.</li>
      <li><b>What the model cannot see.</b> The snapshot has no revenue, no users, no points program and no team information. A protocol that has announced it will never issue a token is priced like any other; the farm plan's own checks (the protocol's points page, its announcements) are the reader's correction.</li>
    </ul>`;
  $('catBody').innerHTML = R.categories.map((s) => `
    <tr>
      <td>${esc(s.category)}</td>
      <td class="num">${s.live_count}</td>
      <td class="num">${s.pre_count}</td>
      <td class="num">${s.median_multiple === null ? '—' : s.median_multiple.toFixed(3) + '&times;'}</td>
      <td class="num">${s.base_multiple.toFixed(3)}&times;</td>
      <td class="num">${Math.round(s.propensity * 100)}%</td>
    </tr>`).join('');
}

// ------------------------------------------------------------- wiring
function show(view) {
  state.view = view;
  for (const b of document.querySelectorAll('.tab')) b.classList.toggle('active', b.dataset.view === view);
  $('view-board').hidden = view !== 'board';
  $('view-live').hidden = view !== 'live';
  $('view-method').hidden = view !== 'method';
}
for (const b of document.querySelectorAll('.tab')) b.addEventListener('click', () => show(b.dataset.view));
for (const [id, key] of [['q', 'q'], ['fCategory', 'cat'], ['fChain', 'chain'], ['fSet', 'set'], ['fSort', 'sort']]) {
  $(id).addEventListener('input', (e) => { state[key] = e.target.value; renderBoard(); });
}
renderBoard();
renderLive();
renderMethod();
show(state.view);
