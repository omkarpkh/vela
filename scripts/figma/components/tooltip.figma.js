// @page Tooltip
// @set  Tooltip
// Tooltip — 2 variants (Lines) + a "Content" text property. `Lines` is not a prop: it shows the
// cap. A one-line tooltip hugs its text; a two-line one is tooltip/width-max wide and wraps, which
// is the only way the width token is visible in the file. No arrow and no placement axis: without an
// arrow the four placements look the same, and placement is code (tooltip.md, Figma mapping).

const LINES = {
  one: { text: 'Download the last 24 hours as CSV', fixed: false },
  two: { text: 'Download the last 24 hours of alerts, every tenant, as one CSV file', fixed: true },
};

const variants = [];
for (const lines of Object.keys(LINES)) {
  const l = LINES[lines];
  const c = figma.createComponent();
  c.name = 'Lines=' + lines;
  c.layoutMode = 'HORIZONTAL';
  c.layoutSizingHorizontal = l.fixed ? 'FIXED' : 'HUG'; c.layoutSizingVertical = 'HUG';
  if (l.fixed) c.setBoundVariable('width', num('tooltip/width-max'));
  c.setBoundVariable('paddingTop', num('space/5')); c.setBoundVariable('paddingBottom', num('space/5'));
  c.setBoundVariable('paddingLeft', num('space/10')); c.setBoundVariable('paddingRight', num('space/10'));
  c.fills = [paint('surface/tooltip')];
  bindRadius(c, 'radius/4');

  const text = figma.createText(); text.name = 'Content'; text.characters = l.text;
  await text.setTextStyleIdAsync(style('Body/Meta').id); text.fills = [paint('text/tooltip')];
  c.appendChild(text);
  if (l.fixed) { text.textAutoResize = 'HEIGHT'; text.layoutSizingHorizontal = 'FILL'; }
  variants.push(c);
}

const set = figma.combineAsVariants(variants, page);
set.name = SET; set.x = 0; set.y = 0;
grid(set, p => [p.Lines === 'one' ? 0 : 1, 0], 300, 64, 32);
set.resize(32 * 2 + 300 * 2, 32 * 2 + 64);

const contentProp = set.addComponentProperty('Content', 'TEXT', 'Download the last 24 hours as CSV');
for (const v of set.children) {
  const t = v.findOne(n => n.name === 'Content'); if (t) t.componentPropertyReferences = { characters: contentProp };
}

return { created: SET, variants: variants.length, setId: set.id };
