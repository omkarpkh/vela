// @page Table
// @set  Table Header Cell
// @set  Table Cell
// @set  Table Row
// Table — three sets, composed by the designer the way the code composes its parts:
//   Table Header Cell  16 variants, Density (2) × Sort (4) × Align (2), plus "Label text".
//   Table Cell          4 variants, Density (2) × Align (2), plus "Value text".
//   Table Row           8 variants, Density (2) × State (4): default, hover, selected, current.
// Density changes the vertical padding only (space/10 → space/5); type never changes. The header
// sits on surface/global with a border/default rule; cells carry a border/subtle rule. A selected
// row is surface/row-selected AND a 2px border/active start stroke; a current row is the stroke
// alone — never colour alone. No row binds a severity, status or risk variable: those live in
// cells, as components. Tabular numerals, the scroll region and the sticky header have no Figma
// expression.

const DENSITY = { comfortable: 'space/10', compact: 'space/5' };
const DENSITIES = Object.keys(DENSITY);
const ALIGNS = ['start', 'end'];
const SORTS = ['unsortable', 'none', 'ascending', 'descending'];
const STATES = { default: 'surface/global', hover: 'surface/row-hover', selected: 'surface/row-selected', current: 'surface/global' };
const STATE_ORDER = Object.keys(STATES);

const pad = (node, density) => {
  node.setBoundVariable('paddingLeft', num('space/10')); node.setBoundVariable('paddingRight', num('space/10'));
  node.setBoundVariable('paddingTop', num(DENSITY[density])); node.setBoundVariable('paddingBottom', num(DENSITY[density]));
};
// A bottom rule only: the cell's own hairline, so the row it sits in needs no stroke of its own.
const rule = (node, colour) => {
  node.strokes = [paint(colour)]; node.strokeAlign = 'INSIDE';
  node.strokeTopWeight = 0; node.strokeLeftWeight = 0; node.strokeRightWeight = 0; node.strokeBottomWeight = 1;
};

// ---- the sort glyph: one union shape at icon/12, as SortNoneIcon / SortAscendingIcon / SortDescendingIcon draw it
function sortIcon(direction) {
  const colour = direction === 'none' ? 'icon/default' : 'text/default';
  const icon = figma.createFrame(); icon.name = 'Sort icon'; icon.fills = []; icon.clipsContent = false;
  icon.layoutMode = 'HORIZONTAL'; icon.primaryAxisAlignItems = 'CENTER'; icon.counterAxisAlignItems = 'CENTER';
  // A polygon points up; the down head is the same triangle turned 180°. Figma turns a node about
  // its top-left corner, so the turned head is placed by its far corner to land in the same box.
  const head = (name, y, down) => {
    const t = figma.createPolygon(); t.name = name; t.pointCount = 3; t.resize(7, 3.5);
    if (down) { t.rotation = 180; t.x = 7; t.y = y + 3.5; } else { t.x = 0; t.y = y; }
    t.fills = [paint(colour)]; return t;
  };
  const stem = (y) => { const r = figma.createRectangle(); r.name = 'stem'; r.resize(1.5, 6); r.x = 2.75; r.y = y; r.fills = [paint(colour)]; return r; };
  const parts = direction === 'none' ? [head('head-up', 0, false), head('head-down', 5.5, true)]
    : direction === 'ascending' ? [head('head-up', 0, false), stem(3)]
    : [stem(0), head('head-down', 5.5, true)];
  const glyph = figma.union(parts, icon); glyph.name = 'Glyph / sort ' + direction; glyph.fills = [paint(colour)];
  return { icon, glyph };
}

// ---- Table Header Cell ----
const headerVariants = [];
for (const density of DENSITIES) for (const sort of SORTS) for (const align of ALIGNS) {
  const c = figma.createComponent();
  c.name = 'Density=' + density + ', Sort=' + sort + ', Align=' + align;
  c.layoutMode = 'HORIZONTAL'; c.counterAxisAlignItems = 'CENTER';
  c.primaryAxisAlignItems = align === 'end' ? 'MAX' : 'MIN';
  c.setBoundVariable('itemSpacing', num('space/5'));
  pad(c, density);
  c.fills = [paint('surface/global')];
  rule(c, 'border/default');

  const label = figma.createText(); label.name = 'Label'; label.characters = align === 'end' ? 'Open findings' : 'Last seen';
  await label.setTextStyleIdAsync(style('Heading/H6').id); label.fills = [paint('text/default')];

  let icon = null;
  if (sort !== 'unsortable') {
    const s = sortIcon(sort); icon = s.icon;
  }
  // End-aligned columns put the glyph first, so the label lines up with the numbers below it.
  const order = align === 'end' ? [icon, label] : [label, icon];
  for (const n of order) if (n) c.appendChild(n);
  label.layoutSizingHorizontal = 'HUG';
  if (icon) {
    icon.layoutSizingHorizontal = 'FIXED'; icon.layoutSizingVertical = 'FIXED';
    icon.setBoundVariable('width', num('icon/12')); icon.setBoundVariable('height', num('icon/12'));
    const g = icon.children[0]; g.layoutSizingHorizontal = 'FIXED'; g.layoutSizingVertical = 'FIXED';
  }
  c.layoutSizingHorizontal = 'HUG'; c.layoutSizingVertical = 'HUG';
  // A sortable header is a button: its content never drops under the 24px target, at either density.
  if (sort !== 'unsortable') c.setBoundVariable('minHeight', num('control-height/24'));
  headerVariants.push(c);
}
const headerSet = figma.combineAsVariants(headerVariants, page);
headerSet.name = SETS[0]; headerSet.x = 0; headerSet.y = 0;
grid(headerSet, (p) => [SORTS.indexOf(p.Sort) * 2 + ALIGNS.indexOf(p.Align), DENSITIES.indexOf(p.Density)], 170, 64, 32);
headerSet.resize(32 * 2 + 170 * 8, 32 * 2 + 64 * 2);
const headerLabel = headerSet.addComponentProperty('Label text', 'TEXT', 'Last seen');
for (const v of headerSet.children) { const l = v.findOne((n) => n.name === 'Label'); if (l) l.componentPropertyReferences = { characters: headerLabel }; }

// ---- Table Cell ----
const cellVariants = [];
for (const density of DENSITIES) for (const align of ALIGNS) {
  const c = figma.createComponent();
  c.name = 'Density=' + density + ', Align=' + align;
  c.layoutMode = 'HORIZONTAL'; c.counterAxisAlignItems = 'CENTER';
  c.primaryAxisAlignItems = align === 'end' ? 'MAX' : 'MIN';
  pad(c, density);
  c.fills = [];
  rule(c, 'border/subtle');
  const value = figma.createText(); value.name = 'Value'; value.characters = align === 'end' ? '1,204' : 'api-gateway-01';
  await value.setTextStyleIdAsync(style('Body/Default').id); value.fills = [paint('text/default')];
  if (align === 'end') value.textAlignHorizontal = 'RIGHT';
  c.appendChild(value); value.layoutSizingHorizontal = 'HUG';
  c.layoutSizingHorizontal = 'HUG'; c.layoutSizingVertical = 'HUG';
  cellVariants.push(c);
}
const cellSet = figma.combineAsVariants(cellVariants, page);
cellSet.name = SETS[1]; cellSet.x = 0; cellSet.y = headerSet.height + 48;
grid(cellSet, (p) => [ALIGNS.indexOf(p.Align), DENSITIES.indexOf(p.Density)], 200, 64, 32);
cellSet.resize(32 * 2 + 200 * 2, 32 * 2 + 64 * 2);
const cellValue = cellSet.addComponentProperty('Value text', 'TEXT', 'api-gateway-01');
for (const v of cellSet.children) { const l = v.findOne((n) => n.name === 'Value'); if (l) l.componentPropertyReferences = { characters: cellValue }; }

// ---- Table Row ----
// The row's cells are drawn as frames with the Table Cell structure, not instances, so a rebuild
// in the mock and in the file make the same tree; a designer swaps in Table Cell instances.
const ROW_CELLS = [
  { name: 'Cell / asset', text: 'api-gateway-01', align: 'start', fill: true },
  { name: 'Cell / status', text: 'Healthy', align: 'start', fill: false },
  { name: 'Cell / findings', text: '1,204', align: 'end', fill: false },
];
const rowVariants = [];
for (const density of DENSITIES) for (const state of STATE_ORDER) {
  const r = figma.createComponent();
  r.name = 'Density=' + density + ', State=' + state;
  r.layoutMode = 'HORIZONTAL'; r.counterAxisAlignItems = 'CENTER';
  r.fills = [paint(STATES[state])];
  if (state === 'selected' || state === 'current') {
    // The marker: a start-edge stroke, the code's inset box-shadow on the first cell.
    r.strokes = [paint('border/active')]; r.strokeAlign = 'INSIDE';
    r.strokeTopWeight = 0; r.strokeRightWeight = 0; r.strokeBottomWeight = 0;
    r.setBoundVariable('strokeLeftWeight', num('stroke/2'));
  } else r.strokes = [];
  for (const spec of ROW_CELLS) {
    const c = figma.createFrame(); c.name = spec.name;
    c.layoutMode = 'HORIZONTAL'; c.counterAxisAlignItems = 'CENTER';
    c.primaryAxisAlignItems = spec.align === 'end' ? 'MAX' : 'MIN';
    pad(c, density);
    c.fills = [];
    rule(c, 'border/subtle');
    const t = figma.createText(); t.name = 'Value'; t.characters = spec.text;
    await t.setTextStyleIdAsync(style('Body/Default').id); t.fills = [paint('text/default')];
    if (spec.align === 'end') t.textAlignHorizontal = 'RIGHT';
    c.appendChild(t); t.layoutSizingHorizontal = 'HUG';
    r.appendChild(c);
    c.layoutSizingHorizontal = spec.fill ? 'FILL' : 'HUG'; c.layoutSizingVertical = 'HUG';
  }
  r.resize(480, 42); r.layoutSizingVertical = 'HUG';
  rowVariants.push(r);
}
const rowSet = figma.combineAsVariants(rowVariants, page);
rowSet.name = SETS[2]; rowSet.x = 0; rowSet.y = cellSet.y + cellSet.height + 48;
grid(rowSet, (p) => [STATE_ORDER.indexOf(p.State), DENSITIES.indexOf(p.Density)], 512, 72, 32);
rowSet.resize(32 * 2 + 512 * 4, 32 * 2 + 72 * 2);

return { created: SETS, variants: [headerVariants.length, cellVariants.length, rowVariants.length], setIds: [headerSet.id, cellSet.id, rowSet.id] };
