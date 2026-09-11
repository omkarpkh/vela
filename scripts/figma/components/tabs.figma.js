// @page Tabs
// @set  Tab
// Tab — a single tab, 6 variants (State × Size) + Count boolean. The tablist is
// composed from instances. The selected indicator is a 2px bottom stroke, never a fill.
// Keyboard behaviour (roving tabindex, arrows, Home/End) has no Figma expression.

const STATES = { default: { text: 'text/de-emphasized', border: null }, selected: { text: 'text/link', border: 'border/active' }, disabled: { text: 'text/inactive', border: null } };
const SIZES = { default: 'Tab/Default', large: 'Tab/Large' };
const STATE_ORDER = ['default', 'selected', 'disabled'];

const variants = [];
for (const state of STATE_ORDER) for (const size of Object.keys(SIZES)) {
  const st = STATES[state];
  const t = figma.createComponent();
  t.name = 'State=' + state + ', Size=' + size;
  t.layoutMode = 'HORIZONTAL'; t.counterAxisAlignItems = 'CENTER'; t.fills = [];
  t.setBoundVariable('itemSpacing', num('space/5'));
  t.setBoundVariable('paddingTop', num('space/10')); t.setBoundVariable('paddingBottom', num('space/10'));
  t.strokes = st.border ? [paint(st.border)] : []; t.strokeAlign = 'INSIDE';
  t.strokeTopWeight = 0; t.strokeLeftWeight = 0; t.strokeRightWeight = 0; t.strokeBottomWeight = 2;

  const label = figma.createText(); label.name = 'Label'; label.characters = 'Alerts';
  await label.setTextStyleIdAsync(style(SIZES[size]).id); label.fills = [paint(st.text)];
  t.appendChild(label); label.layoutSizingHorizontal = 'HUG';

  const count = figma.createText(); count.name = 'Count'; count.characters = '12';
  await count.setTextStyleIdAsync(style(SIZES[size]).id); count.fontName = { family: 'Open Sans', style: 'SemiBold' };
  count.fills = [paint(st.text)];
  t.appendChild(count); count.layoutSizingHorizontal = 'HUG';

  t.layoutSizingHorizontal = 'HUG'; t.layoutSizingVertical = 'HUG';
  variants.push(t);
}

const set = figma.combineAsVariants(variants, page);
set.name = SET; set.x = 0; set.y = 0;
grid(set, p => [STATE_ORDER.indexOf(p.State), p.Size === 'default' ? 0 : 1], 160, 72, 32);
set.resize(32 * 2 + 160 * 3, 32 * 2 + 72 * 2);

const countKey = set.addComponentProperty('Count', 'BOOLEAN', true);
for (const v of set.children) { const c = v.findOne(n => n.name === 'Count'); if (c) c.componentPropertyReferences = { visible: countKey }; }

return { created: SET, variants: variants.length, setId: set.id };
