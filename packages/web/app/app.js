(function () {
  'use strict'
  var D = window.A11Y_DATA
  var ORDER = { A: 1, AA: 2, AAA: 3 }
  var scLevel = {}
  Object.keys(D.scs).forEach(function (id) { scLevel[id] = D.scs[id].level })

  var state = { tab: 'apg', level: 'AA', apgRole: null, htmlRole: null, scId: null, actId: null }
  var main = document.getElementById('main')

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }
  function nl(s) { return esc(s).replace(/\n/g, '<br>') }

  // Client mirror of core.searchAct: substring over name+applicability, level-gated.
  function searchAct(query, level) {
    var q = String(query).toLowerCase().trim()
    if (!q) return []
    var max = ORDER[level]
    return D.act
      .filter(function (r) {
        return r.name.toLowerCase().indexOf(q) >= 0 || r.applicability_text.toLowerCase().indexOf(q) >= 0
      })
      .map(function (r) {
        return {
          id: r.id, name: r.name, url: r.url,
          wcag_sc_ids: r.wcag_sc_ids.filter(function (id) { return scLevel[id] && ORDER[scLevel[id]] <= max })
        }
      })
      .filter(function (r) { return r.wcag_sc_ids.length > 0 })
      .sort(function (a, b) { return a.id.localeCompare(b.id) })
  }

  // --- shared detail fragments ---
  function contractHtml(c) {
    var roles = Object.keys(c.aria_contract)
    if (!roles.length) return ''
    var out = '<h3>ARIA contract</h3>'
    roles.forEach(function (role) {
      var k = c.aria_contract[role]
      out += '<details><summary><code>' + esc(role) + '</code></summary><dl class="contract">'
        + '<dt>Name required</dt><dd>' + (k.accessible_name_required ? 'Yes' : 'No') + '</dd>'
        + '<dt>Name from</dt><dd>' + esc((k.name_from || []).join(', ')) + '</dd>'
        + (k.required_props && k.required_props.length ? '<dt>Required</dt><dd>' + k.required_props.map(function (p) { return '<code>' + esc(p) + '</code>' }).join(' ') + '</dd>' : '')
        + (k.supported_props && k.supported_props.length ? '<dt>Supported</dt><dd>' + k.supported_props.length + ' properties</dd>' : '')
        + '</dl></details>'
    })
    return out
  }
  function nativeHtml(c) {
    if (!c.native_elements.length) return ''
    return '<h3>Native HTML elements</h3><p>' + c.native_elements.map(function (e) {
      return '<code>&lt;' + esc(e.canonical_id) + '&gt;</code>'
    }).join(' ') + '</p>'
  }
  function kbdHtml(list) {
    return '<table><thead><tr><th>Key</th><th>Action</th></tr></thead><tbody>'
      + list.map(function (k) { return '<tr><td><code>' + esc(k.key) + '</code></td><td>' + esc(k.description) + '</td></tr>' }).join('')
      + '</tbody></table>'
  }
  // Client mirror of core.searchWcag: substring over id+title+statement, level-gated.
  function searchWcag(query, level) {
    var q = String(query).toLowerCase().trim()
    if (!q) return []
    var max = ORDER[level]
    return Object.keys(D.scs).map(function (id) { return D.scs[id] })
      .filter(function (sc) {
        return ORDER[sc.level] <= max && (
          sc.id.indexOf(q) >= 0 ||
          sc.title.toLowerCase().indexOf(q) >= 0 ||
          (sc.short_text || '').toLowerCase().indexOf(q) >= 0
        )
      })
      .sort(function (a, b) { return a.id.localeCompare(b.id, undefined, { numeric: true }) })
  }

  function chipsHtml(c) {
    var act = c.suggested_queries.filter(function (q) { return q.tool === 'search_act' })
    var wcag = c.suggested_queries.filter(function (q) { return q.tool === 'search_wcag' })
    function group(label, items) {
      if (!items.length) return ''
      return '<p class="chips-label">' + esc(label) + '</p><div class="chips">' + items.map(function (q) {
        return '<button class="chip" data-tool="' + esc(q.tool) + '" data-q="' + esc(q.query) + '" title="' + esc(q.why) + '">' + esc(q.query) + '</button>'
      }).join('') + '</div>'
    }
    return group('Search ACT rules', act) + group('Search WCAG criteria', wcag)
  }

  // Wraps a detail body in Human / Agent sub-tabs. Agent tab shows the exact
  // composed JSON the MCP tools return.
  function detailShell(header, humanHtml, obj) {
    return header
      + '<div class="dtabs" role="tablist" aria-label="View">'
      + '<button class="dtab" role="tab" data-d="human" aria-selected="true">Human</button>'
      + '<button class="dtab" role="tab" data-d="agent" aria-selected="false">Agent (JSON)</button>'
      + '</div>'
      + '<div class="dpanel" data-panel="human">' + humanHtml + '</div>'
      + '<div class="dpanel" data-panel="agent" hidden>'
      + '<p class="note">Exactly what <code>get_apg_pattern</code> / <code>get_aria_role</code> returns to the agent.</p>'
      + '<pre class="agent-json"><code>' + esc(JSON.stringify(obj, null, 2)) + '</code></pre></div>'
  }

  function wireDetail(d) {
    d.querySelectorAll('.dtab').forEach(function (b) {
      b.addEventListener('click', function () {
        d.querySelectorAll('.dtab').forEach(function (x) { x.setAttribute('aria-selected', String(x === b)) })
        d.querySelectorAll('.dpanel').forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== b.getAttribute('data-d') })
      })
    })
    d.querySelectorAll('.chip').forEach(function (ch) {
      ch.addEventListener('click', function () { drill(ch.getAttribute('data-tool') || 'search_act', ch.getAttribute('data-q')) })
    })
  }

  function drill(tool, query) {
    var el = document.getElementById('drill')
    if (!el) return
    el.innerHTML = (tool === 'search_wcag' ? drillWcagHtml(query) : drillActHtml(query))
    el.querySelectorAll('.sc-chip').forEach(function (b) {
      b.addEventListener('click', function () { showSC(b.getAttribute('data-sc')) })
    })
  }

  function drillActHtml(query) {
    var rules = searchAct(query, state.level)
    var html = '<h3>ACT rules for &ldquo;' + esc(query) + '&rdquo; &middot; level ' + esc(state.level) + ' (' + rules.length + ')</h3>'
    if (!rules.length) {
      html += '<p class="note">No ACT rules match at this level &mdash; try the WCAG criteria above, or check the Verify tab (contrast, target size are not covered by ACT).</p>'
    } else {
      html += '<ul class="rules">' + rules.map(function (r) {
        return '<li><strong>' + esc(r.id) + '</strong> ' + esc(r.name) + ' <a href="' + esc(r.url) + '" target="_blank" rel="noreferrer">&#8599;</a><br>'
          + r.wcag_sc_ids.map(function (id) { return '<button class="sc-chip" data-sc="' + esc(id) + '">' + esc(id) + '</button>' }).join(' ')
          + '</li>'
      }).join('') + '</ul>'
    }
    return html
  }

  function drillWcagHtml(query) {
    var scs = searchWcag(query, state.level)
    var html = '<h3>WCAG criteria matching &ldquo;' + esc(query) + '&rdquo; &middot; level ' + esc(state.level) + ' (' + scs.length + ')</h3>'
    if (!scs.length) {
      html += '<p class="note">No WCAG criteria match this term at the selected level.</p>'
    } else {
      html += '<ul class="rules">' + scs.map(function (sc) {
        return '<li><button class="sc-chip" data-sc="' + esc(sc.id) + '">' + esc(sc.id) + '</button> '
          + esc(sc.title) + ' <span class="role">' + esc(sc.level) + '</span></li>'
      }).join('') + '</ul>'
    }
    return html
  }

  function scDetailHtml(sc) {
    var html = '<h2>' + esc(sc.id) + ' ' + esc(sc.title) + ' <span class="role">' + esc(sc.level) + '</span></h2>'
      + '<blockquote>' + esc(sc.short_text) + '</blockquote>'
      + '<p><a href="' + esc(sc.understanding_url) + '" target="_blank" rel="noreferrer">Understanding ' + esc(sc.id) + ' &#8599;</a></p>'
    if (sc.techniques.length) {
      html += '<h3>Sufficient techniques</h3><ul>' + sc.techniques.map(function (t) {
        return '<li><a href="' + esc(t.url) + '" target="_blank" rel="noreferrer"><code>' + esc(t.id) + '</code> ' + esc(t.title) + '</a></li>'
      }).join('') + '</ul>'
    }
    if (sc.failures.length) {
      html += '<h3>Documented failures</h3><ul>' + sc.failures.map(function (f) {
        return '<li><a href="' + esc(f.url) + '" target="_blank" rel="noreferrer"><code>' + esc(f.id) + '</code> ' + esc(f.title) + '</a></li>'
      }).join('') + '</ul>'
    }
    // Related ACT rules — the mechanical SC→rule cross-link, not level-gated.
    var rules = D.act.filter(function (r) { return r.wcag_sc_ids.indexOf(sc.id) >= 0 })
      .sort(function (a, b) { return a.id.localeCompare(b.id) })
    if (rules.length) {
      html += '<h3>ACT rules covering this criterion (' + rules.length + ')</h3><div class="chips">'
        + rules.map(function (r) {
          return '<button class="act-chip" data-act="' + esc(r.id) + '" title="' + esc(r.name) + '">' + esc(r.id) + ' ' + esc(r.name) + '</button>'
        }).join('') + '</div>'
    }
    return html
  }
  // Wire ACT-rule pills inside any container: jump to the ACT browser on that rule.
  function wireActChips(container) {
    container.querySelectorAll('.act-chip').forEach(function (b) {
      b.addEventListener('click', function () { openAct(b.getAttribute('data-act')) })
    })
  }
  function openAct(id) {
    modal.hidden = true
    state.tab = 'act'
    state.actId = id
    syncTabs()
    render()
  }
  function showSC(id) {
    var sc = D.scs[id]
    if (!sc) return
    openModal(scDetailHtml(sc))
    wireActChips(modalBody)
  }

  // --- list/detail tabs ---
  function renderList(items, key, detailFn, intro) {
    main.innerHTML = (intro || '')
      + '<div class="split"><div class="list-col">'
      + '<input class="filter" type="search" placeholder="Filter…" aria-label="Filter">'
      + '<p class="list-count"></p>'
      + '<ul class="list"></ul></div>'
      + '<div class="detail" id="detail"><p class="note">Select an item from the list.</p></div></div>'
    var ul = main.querySelector('.list')
    var filter = main.querySelector('.filter')
    var count = main.querySelector('.list-count')
    function paint(q) {
      var query = (q || '').toLowerCase()
      ul.innerHTML = ''
      var shown = 0
      items.forEach(function (it) {
        var name = it.apg ? it.apg.name : it.role
        if (query && (it.role + ' ' + name).toLowerCase().indexOf(query) < 0) return
        shown++
        var li = document.createElement('li')
        li.innerHTML = '<button class="link"><code>' + esc(it.role) + '</code> ' + esc(name) + '</button>'
        li.querySelector('button').addEventListener('click', function () { state[key] = it.role; detailFn(it) })
        ul.appendChild(li)
      })
      count.textContent = query ? (shown + ' of ' + items.length + ' (scroll for more)') : (items.length + ' total — scroll the list')
    }
    filter.addEventListener('input', function () { paint(filter.value) })
    paint('')
    if (state[key]) {
      var cur = items.filter(function (i) { return i.role === state[key] })[0]
      if (cur) detailFn(cur)
    }
  }

  function renderApgDetail(c) {
    var d = document.getElementById('detail')
    var header = '<h2>' + esc(c.apg.name) + ' <span class="role">' + esc(c.role) + '</span></h2>'
      + '<p><a href="' + esc(c.apg.apg_url) + '" target="_blank" rel="noreferrer">APG reference &#8599;</a></p>'
    var human = '<details open><summary>About</summary><p>' + nl(c.apg.about_this_pattern) + '</p></details>'
      + (c.apg.keyboard_interactions.length ? '<details><summary>Keyboard interactions (' + c.apg.keyboard_interactions.length + ')</summary>' + kbdHtml(c.apg.keyboard_interactions) + '</details>' : '')
      + contractHtml(c) + nativeHtml(c)
      + '<h3>Suggested searches</h3>' + chipsHtml(c)
      + '<div id="drill"></div>'
    d.innerHTML = detailShell(header, human, c)
    wireDetail(d)
  }

  function renderPrimitiveDetail(c) {
    var d = document.getElementById('detail')
    var header = '<h2><span class="role">' + esc(c.role) + '</span> native primitive</h2>'
    var human = contractHtml(c) + nativeHtml(c)
      + '<h3>Suggested searches</h3>' + chipsHtml(c)
      + '<div id="drill"></div>'
    d.innerHTML = detailShell(header, human, c)
    wireDetail(d)
  }

  // --- knowledge-base browsers ---
  // Generic list/detail browser, mirroring renderList but corpus-agnostic.
  function renderBrowser(intro, items, cfg) {
    main.innerHTML = (intro || '')
      + '<div class="split"><div class="list-col">'
      + '<input class="filter" type="search" placeholder="Filter…" aria-label="Filter">'
      + '<p class="list-count"></p><ul class="list"></ul></div>'
      + '<div class="detail" id="detail"><p class="note">Select an item from the list.</p></div></div>'
    var ul = main.querySelector('.list')
    var filter = main.querySelector('.filter')
    var count = main.querySelector('.list-count')
    function select(it) {
      state[cfg.selectedKey] = cfg.idOf(it)
      var d = document.getElementById('detail')
      d.innerHTML = cfg.detailHtml(it)
      if (cfg.onWire) cfg.onWire(d)
    }
    function paint(q) {
      var query = (q || '').toLowerCase()
      ul.innerHTML = ''
      var shown = 0
      items.forEach(function (it) {
        if (query && !cfg.matches(it, query)) return
        shown++
        var li = document.createElement('li')
        li.innerHTML = '<button class="link">' + cfg.labelHtml(it) + '</button>'
        li.querySelector('button').addEventListener('click', function () { select(it) })
        ul.appendChild(li)
      })
      count.textContent = query ? (shown + ' of ' + items.length) : (items.length + ' total — scroll the list')
    }
    filter.addEventListener('input', function () { paint(filter.value) })
    paint('')
    if (state[cfg.selectedKey]) {
      var cur = items.filter(function (i) { return cfg.idOf(i) === state[cfg.selectedKey] })[0]
      if (cur) select(cur)
    }
  }

  function renderWcagBrowser() {
    var items = Object.keys(D.scs).map(function (id) { return D.scs[id] })
      .filter(function (sc) { return ORDER[sc.level] <= ORDER[state.level] })
      .sort(function (a, b) { return a.id.localeCompare(b.id, undefined, { numeric: true }) })
    renderBrowser(INTRO.wcag.replace('{n}', items.length), items, {
      selectedKey: 'scId',
      idOf: function (sc) { return sc.id },
      labelHtml: function (sc) { return '<code>' + esc(sc.id) + '</code> ' + esc(sc.title) + ' <span class="role">' + esc(sc.level) + '</span>' },
      matches: function (sc, q) { return (sc.id + ' ' + sc.title + ' ' + (sc.short_text || '')).toLowerCase().indexOf(q) >= 0 },
      detailHtml: function (sc) { return scDetailHtml(sc) },
      onWire: function (d) { wireActChips(d) },
    })
  }

  function actCoveredScs(r) {
    return r.wcag_sc_ids.filter(function (id) { return scLevel[id] && ORDER[scLevel[id]] <= ORDER[state.level] })
  }
  function renderActBrowser() {
    var items = D.act.slice()
      .filter(function (r) { return actCoveredScs(r).length > 0 })
      .sort(function (a, b) { return a.id.localeCompare(b.id) })
    renderBrowser(INTRO.act.replace('{n}', items.length), items, {
      selectedKey: 'actId',
      idOf: function (r) { return r.id },
      labelHtml: function (r) { return '<code>' + esc(r.id) + '</code> ' + esc(r.name) },
      matches: function (r, q) { return (r.id + ' ' + r.name + ' ' + (r.applicability_text || '')).toLowerCase().indexOf(q) >= 0 },
      detailHtml: function (r) {
        var scs = actCoveredScs(r)
        return '<h2>' + esc(r.name) + ' <span class="role">' + esc(r.id) + '</span></h2>'
          + '<p><a href="' + esc(r.url) + '" target="_blank" rel="noreferrer">ACT rule reference &#8599;</a></p>'
          + '<h3>Applicability</h3><p>' + nl(r.applicability_text) + '</p>'
          + '<h3>Covered WCAG criteria &middot; level ' + esc(state.level) + ' (' + scs.length + ')</h3>'
          + '<ul class="rules">' + scs.map(function (id) {
            var sc = D.scs[id]
            return '<li><button class="sc-chip" data-sc="' + esc(id) + '">' + esc(id) + '</button> ' + esc(sc ? sc.title : '') + '</li>'
          }).join('') + '</ul>'
      },
      onWire: function (d) {
        d.querySelectorAll('.sc-chip').forEach(function (b) {
          b.addEventListener('click', function () { showSC(b.getAttribute('data-sc')) })
        })
      },
    })
  }

  // --- verify tab ---
  function levelTags(level) {
    var t = ['wcag2a', 'wcag21a']
    if (level === 'AA' || level === 'AAA') t.push('wcag2aa', 'wcag21aa')
    if (level === 'AAA') t.push('wcag2aaa')
    return t
  }
  function renderVerify() {
    main.innerHTML = '<section class="tab-intro"><h2>Verify</h2>'
      + '<p>Paste an HTML snippet and run <a href="https://github.com/dequelabs/axe-core" target="_blank" rel="noreferrer">axe-core</a> in your browser to check it against WCAG at the selected level. This covers the structurally testable criteria — roughly half of WCAG. Qualitative criteria (screen-reader output, focus visibility, meaningful labels) and dynamic behaviour require human review.</p></section>'
      + '<div class="pane">'
      + '<textarea id="vhtml" rows="8" placeholder="&lt;button&gt;&lt;/button&gt;"></textarea>'
      + '<p><button id="vrun" class="primary">Run axe (WCAG ' + esc(state.level) + ')</button></p>'
      + '<div id="vout"></div></div>'
    document.getElementById('vrun').addEventListener('click', runVerify)
  }
  async function runVerify() {
    var out = document.getElementById('vout')
    var html = document.getElementById('vhtml').value
    out.innerHTML = '<p class="note">Running…</p>'
    var host = document.createElement('div')
    host.style.position = 'absolute'
    host.style.left = '-9999px'
    host.innerHTML = html
    document.body.appendChild(host)
    try {
      var res = await window.axe.run(host, { runOnly: { type: 'tag', values: levelTags(state.level) } })
      var vs = res.violations
      out.innerHTML = (vs.length === 0
        ? '<p class="pass">No automated violations found.</p>'
        : '<p class="fail">' + vs.length + ' violation' + (vs.length > 1 ? 's' : '') + '</p>')
        + vs.map(function (v) {
          var targets = (v.nodes || []).map(function (n) { return (n.target || []).join(' ') }).filter(Boolean)
          return '<article class="violation"><h3><code>' + esc(v.id) + '</code> ' + esc(v.impact || '') + '</h3>'
            + '<p>' + esc(v.help) + '</p>'
            + (targets.length ? '<pre>' + esc(targets.join('\n')) + '</pre>' : '')
            + '<p><a href="' + esc(v.helpUrl) + '" target="_blank" rel="noreferrer">Learn more &#8599;</a></p></article>'
        }).join('')
        + '<p class="note">axe covers ~50% of WCAG. Manual screen-reader, keyboard, and cognitive review still required.</p>'
    } catch (e) {
      out.innerHTML = '<p class="fail">Audit error: ' + esc(e && e.message ? e.message : e) + '</p>'
    } finally {
      host.remove()
    }
  }

  // --- modal ---
  var modal = document.getElementById('modal')
  var modalBody = document.getElementById('modal-body')
  function openModal(html) { modalBody.innerHTML = html; modal.hidden = false }
  document.getElementById('modal-close').addEventListener('click', function () { modal.hidden = true })
  modal.addEventListener('click', function (e) { if (e.target === modal) modal.hidden = true })
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') modal.hidden = true })

  // --- shell wiring ---
  function syncTabs() {
    document.querySelectorAll('.tab').forEach(function (b) {
      b.setAttribute('aria-selected', String(b.getAttribute('data-tab') === state.tab))
    })
  }
  var INTRO = {
    apg: '<section class="tab-intro"><h2>APG patterns</h2>'
      + '<p>The <a href="https://www.w3.org/WAI/ARIA/apg/" target="_blank" rel="noreferrer">ARIA Authoring Practices Guide</a> is a W3C collection of recipes for building common composite components — dialogs, tabs, comboboxes, menus, and so on — accessibly with ARIA. Browse or filter the patterns below, then open one to see its ARIA contract, the native HTML elements that carry its roles, and suggested queries for drilling down to the applicable ACT rules and WCAG Success Criteria.</p></section>',
    html: '<section class="tab-intro"><h2>Native primitives</h2>'
      + '<p>Native HTML elements carry implicit ARIA roles, defined by <a href="https://www.w3.org/TR/html-aria/" target="_blank" rel="noreferrer">ARIA in HTML</a> and <a href="https://www.w3.org/TR/wai-aria-1.2/" target="_blank" rel="noreferrer">WAI-ARIA</a>. These primitives — text inputs, links, images, buttons, and so on — are the building blocks to prefer before adding custom ARIA. Browse or filter the roles below, then open one to see its ARIA contract, the native elements that provide it, and drill down to the applicable ACT rules and WCAG Success Criteria.</p></section>',
    wcag: '<section class="tab-intro"><h2>WCAG Success Criteria</h2>'
      + '<p>The complete set of <a href="https://www.w3.org/TR/WCAG22/" target="_blank" rel="noreferrer">WCAG 2.2</a> Success Criteria — the testable requirements behind every check in this tool — sourced verbatim from the W3C. The list is gated to the selected conformance level ({n} at this level); open a criterion for its normative statement, sufficient techniques, and documented failures. This is reference, not the guided flow: the APG and HTML tabs reach these same criteria from a component.</p></section>',
    act: '<section class="tab-intro"><h2>ACT rules</h2>'
      + '<p>The <a href="https://www.w3.org/WAI/standards-guidelines/act/rules/" target="_blank" rel="noreferrer">ACT rules</a> are W3C-maintained, machine-testable procedures, each mapped to the WCAG criteria it covers. The list is limited to rules touching criteria within the selected level ({n} at this level); open a rule for its applicability text and the criteria it covers. This is reference, not the guided flow: the APG and HTML tabs reach these rules from a component.</p></section>',
  }

  function render() {
    if (state.tab === 'apg') renderList(D.apg, 'apgRole', renderApgDetail, INTRO.apg)
    else if (state.tab === 'html') renderList(D.primitives, 'htmlRole', renderPrimitiveDetail, INTRO.html)
    else if (state.tab === 'rn') main.innerHTML = '<section class="tab-intro"><h2>React Native</h2>'
      + '<p>Not implemented yet. a11y-assist currently covers the web. React Native is a planned future surface — a peer to the APG recipes, sourced from React Native documentation.</p></section>'
    else if (state.tab === 'verify') renderVerify()
    else if (state.tab === 'wcag') renderWcagBrowser()
    else if (state.tab === 'act') renderActBrowser()
  }
  document.querySelectorAll('.tab').forEach(function (b) {
    b.addEventListener('click', function () { state.tab = b.getAttribute('data-tab'); syncTabs(); render() })
  })
  document.querySelectorAll('input[name=level]').forEach(function (r) {
    r.addEventListener('change', function () { state.level = r.value; render() })
  })

  syncTabs()
  render()
})()
