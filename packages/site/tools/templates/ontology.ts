import { nodesByType, patternNeighborhood, getGraph } from 'a11y-graph'
import { baseLayout, esc } from '../render.js'

/**
 * The schema-level graph: 8 node types, 8 edge types. Useful as "what is the
 * data model?" view — readable, fits on one screen.
 */
function schemaElements(): unknown[] {
  return [
    // Node-type prototypes
    { data: { id: 'Pattern',   label: 'Pattern',   type: 'pattern',   note: 'APG patterns + role-bindings' } },
    { data: { id: 'Role',      label: 'ARIA Role', type: 'role',      note: 'WAI-ARIA via aria-query' } },
    { data: { id: 'SC',        label: 'WCAG SC',   type: 'sc',        note: 'WCAG 2.2 Success Criteria' } },
    { data: { id: 'Technique', label: 'Technique', type: 'technique', note: 'WCAG sufficient techniques' } },
    { data: { id: 'Failure',   label: 'Failure',   type: 'failure',   note: 'WCAG documented failures' } },
    { data: { id: 'ACTRule',   label: 'ACT Rule',  type: 'act',       note: 'ACT Rules (W3C)' } },
    { data: { id: 'Element',   label: 'HTML Element', type: 'element', note: 'Native element via aria-query' } },
    { data: { id: 'Primitive', label: 'RN Primitive', type: 'primitive', note: 'React Native component (editorial)' } },
    { data: { id: 'Platform',  label: 'Platform',  type: 'platform',  note: 'web | react-native' } },

    // Edge-type prototypes
    { data: { source: 'Pattern',   target: 'Role',      label: 'uses_role'         } },
    { data: { source: 'Pattern',   target: 'SC',        label: 'applies_sc'        } },
    { data: { source: 'Pattern',   target: 'ACTRule',   label: 'validated_by'      } },
    { data: { source: 'Pattern',   target: 'Element',   label: 'binds_to'          } },
    { data: { source: 'Pattern',   target: 'Primitive', label: 'binds_to'          } },
    { data: { source: 'Element',   target: 'Role',      label: 'has_implicit_role' } },
    { data: { source: 'ACTRule',   target: 'SC',        label: 'covers_sc'         } },
    { data: { source: 'SC',        target: 'Technique', label: 'has_technique'     } },
    { data: { source: 'SC',        target: 'Failure',   label: 'has_failure'       } },
    { data: { source: 'Element',   target: 'Platform',  label: 'available_on'      } },
    { data: { source: 'Primitive', target: 'Platform',  label: 'available_on'      } },
  ]
}

/**
 * Per-pattern subgraph in Cytoscape-element shape. Built from the
 * `a11y-graph` projection: pattern + 1-hop neighbours, plus 2-hop edges
 * through ACT rules (→ SC) and primitives (→ platform). Techniques/failures
 * are intentionally excluded — too dense.
 */
function patternSubgraphElements(role: string): unknown[] {
  const sub = patternNeighborhood(role)
  const elements: unknown[] = []
  sub.forEachNode((id, attrs) => {
    elements.push({ data: { id, label: attrs.label, type: attrs.type, note: attrs.note } })
  })
  sub.forEachEdge((_e, attrs, source, target) => {
    elements.push({ data: { source, target, label: attrs.label } })
  })
  return elements
}

export interface OntologyData {
  schema: unknown[]
  patternSubgraphs: Record<string, unknown[]>
  patternList: { role: string; name: string }[]
}

export function buildOntologyData(): OntologyData {
  const g = getGraph()
  const subgraphs: Record<string, unknown[]> = {}
  const list: { role: string; name: string }[] = []
  for (const id of nodesByType('pattern')) {
    const role = id.replace(/^pattern:/, '')
    subgraphs[role] = patternSubgraphElements(role)
    list.push({ role, name: g.getNodeAttribute(id, 'label') })
  }
  return {
    schema: schemaElements(),
    patternSubgraphs: subgraphs,
    patternList: list.sort((a, b) => a.role.localeCompare(b.role)),
  }
}

function ontologyBody(data: OntologyData): string {
  const dataJson = JSON.stringify(data)

  return `
<article class="card ontology-card">
  <header>
    <p class="kicker">the data model</p>
    <h1>Ontology</h1>
    <p>The a11ycat dataset is a knowledge graph: 8 node types, 8 edge types, sourced from four W3C documents. This page lets you reason about it visually.</p>
  </header>

  <section>
    <h2>Node types &amp; edge types</h2>
    <p>Nine node types, each from a single authoritative source. Nine edge types — only <code>applies_sc</code> and the React Native side of <code>binds_to</code> involve editorial judgement; the rest are derived from upstream data.</p>
  </section>

  <section>
    <div class="ontology-tabs" role="tablist">
      <button id="tab-schema" role="tab" aria-selected="true" aria-controls="view-schema" type="button">Schema</button>
      <button id="tab-instance" role="tab" aria-selected="false" aria-controls="view-instance" type="button">Pattern explorer</button>
    </div>

    <div id="view-schema" role="tabpanel" aria-labelledby="tab-schema">
      <p class="hint">The classes and relationships of the ontology, as a small diagram.</p>
      <div id="cy-schema" class="cy-canvas" aria-label="Schema graph"></div>
    </div>

    <div id="view-instance" role="tabpanel" aria-labelledby="tab-instance" hidden>
      <p class="hint">Pick a pattern to see its actual neighbourhood — roles it uses, SCs that apply, ACT rules that validate it, primitives it binds to.</p>
      <label for="pattern-picker" class="ontology-label">Pattern:</label>
      <select id="pattern-picker">
        ${data.patternList.map((p) => `<option value="${esc(p.role)}">${esc(p.role)} — ${esc(p.name)}</option>`).join('')}
      </select>
      <div id="cy-instance" class="cy-canvas" aria-label="Pattern instance graph"></div>
    </div>
  </section>

  <section>
    <h2>Legend</h2>
    <ul class="legend">
      <li><span class="dot type-pattern"></span> Pattern</li>
      <li><span class="dot type-role"></span> ARIA role</li>
      <li><span class="dot type-sc"></span> WCAG SC</li>
      <li><span class="dot type-technique"></span> Technique</li>
      <li><span class="dot type-failure"></span> Failure</li>
      <li><span class="dot type-act"></span> ACT rule</li>
      <li><span class="dot type-element"></span> HTML element</li>
      <li><span class="dot type-primitive"></span> RN primitive</li>
      <li><span class="dot type-platform"></span> Platform</li>
    </ul>
  </section>

  <section class="agent-view">
    <h2>What's behind this</h2>
    <p>See <a href="https://github.com/" rel="noreferrer"><code>ontology.md</code></a> for the conceptual outline and <a href="provenance.html">provenance</a> for source attribution. The full instance graph (~650 nodes) is too dense for a single useful view; we render per-pattern subgraphs instead.</p>
  </section>
</article>

<script src="https://unpkg.com/cytoscape@3.30.4/dist/cytoscape.min.js"></script>
<script>
(function () {
  var data = ${dataJson};

  var nodeColors = {
    pattern:   '#d4621f',
    role:      '#1a5cb0',
    sc:        '#156d2c',
    technique: '#aa9d2e',
    failure:   '#a72020',
    act:       '#6b3fa0',
    element:   '#0f7a86',
    primitive: '#3a8d8a',
    platform:  '#555'
  };

  function styles() {
    return [
      { selector: 'node', style: {
        'background-color': function (ele) { return nodeColors[ele.data('type')] || '#888' },
        'label': 'data(label)',
        'color': '#fff',
        'text-outline-color': function (ele) { return nodeColors[ele.data('type')] || '#888' },
        'text-outline-width': 1,
        'font-size': '11px',
        'text-valign': 'center',
        'text-halign': 'center',
        'width': '60', 'height': '60',
        'border-width': 1,
        'border-color': '#333',
        'overlay-padding': '6px'
      } },
      { selector: 'edge', style: {
        'width': 2,
        'line-color': '#888',
        'target-arrow-color': '#888',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'label': 'data(label)',
        'font-size': '9px',
        'text-rotation': 'autorotate',
        'text-background-color': '#fff',
        'text-background-opacity': 0.8,
        'text-background-padding': 2,
        'color': '#555'
      } }
    ];
  }

  function makeGraph(containerId, elements) {
    var el = document.getElementById(containerId);
    if (!el) return null;
    var cy = cytoscape({
      container: el,
      elements: elements,
      style: styles(),
      layout: { name: 'cose', animate: false, padding: 30, nodeRepulsion: 4500 },
      wheelSensitivity: 0.2
    });
    return cy;
  }

  // Schema graph
  var cySchema = makeGraph('cy-schema', data.schema);

  // Instance graph + picker
  var cyInstance = null;
  function loadPattern(role) {
    var elems = data.patternSubgraphs[role] || [];
    if (cyInstance) {
      cyInstance.elements().remove();
      cyInstance.add(elems);
      cyInstance.layout({ name: 'cose', animate: false, padding: 30, nodeRepulsion: 4500 }).run();
    } else {
      cyInstance = makeGraph('cy-instance', elems);
    }
  }
  var picker = document.getElementById('pattern-picker');
  if (picker) {
    picker.addEventListener('change', function () { loadPattern(picker.value) });
  }

  // Tab handling
  var tabSchema = document.getElementById('tab-schema');
  var tabInstance = document.getElementById('tab-instance');
  var viewSchema = document.getElementById('view-schema');
  var viewInstance = document.getElementById('view-instance');
  function activate(which) {
    if (which === 'schema') {
      tabSchema.setAttribute('aria-selected', 'true');
      tabInstance.setAttribute('aria-selected', 'false');
      viewSchema.removeAttribute('hidden');
      viewInstance.setAttribute('hidden', '');
      if (cySchema) cySchema.resize();
    } else {
      tabSchema.setAttribute('aria-selected', 'false');
      tabInstance.setAttribute('aria-selected', 'true');
      viewSchema.setAttribute('hidden', '');
      viewInstance.removeAttribute('hidden');
      if (!cyInstance && picker) loadPattern(picker.value);
      if (cyInstance) cyInstance.resize();
    }
  }
  tabSchema.addEventListener('click', function () { activate('schema') });
  tabInstance.addEventListener('click', function () { activate('instance') });
})();
</script>
`
}

export function renderOntologyPage(data: OntologyData): string {
  return baseLayout({
    title: 'Ontology',
    description: 'a11ycat ontology — node types, edge types, and an interactive view of the relationships in the consolidated a11y dataset.',
    rootHref: '.',
    bodyClass: 'page-ontology',
    content: ontologyBody(data),
  })
}
