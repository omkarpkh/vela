// @page Dropdown List
// @set  Dropdown List item
// Dropdown List item — 4 variants (State) + a "Meta" boolean and "Label" / "Meta text" properties.
// One row of the list. The popup is composed from instances stacked inside a surface/raised frame
// with a border/default edge, radius/4 and space/5 above and below — Popover's surface, and no
// shadow, because no elevation token exists — as the tablist is composed from Tab instances.
// The row is popover/width wide and its name wraps (dropdown-list.md: never truncated). Every
// variant keeps the check's slot, an icon/size box one body line tall, so the names line up; only
// `current` draws the check, ONE union shape in text/link (a 3:1 mark — the name stays
// text/default). `highlighted` is surface/raised-hover; `disabled` greys the name and the meta to
// text/inactive. Every variant writes the same words in the layers the TEXT properties bind (the
// text-property-collapse lint); the designer overrides them on the instance.
// Placement, flipping, focus, typeahead and the highlight following the keys exist only in code.

const STATES = {
  default: { fill: 'surface/raised', text: 'text/default', check: false },
  highlighted: { fill: 'surface/raised-hover', text: 'text/default', check: false },
  current: { fill: 'surface/raised', text: 'text/default', check: true },
  disabled: { fill: 'surface/raised', text: 'text/inactive', check: false },
};
const STATE_ORDER = Object.keys(STATES);
const px = (name) => { const v = num(name); return v.valuesByMode[Object.keys(v.valuesByMode)[0]]; };

const variants = [];
for (const state of STATE_ORDER) {
  const st = STATES[state];
  const c = figma.createComponent();
  c.name = 'State=' + state;
  c.layoutMode = 'HORIZONTAL'; c.counterAxisAlignItems = 'MIN';
  c.layoutSizingHorizontal = 'FIXED'; c.layoutSizingVertical = 'HUG';
  c.setBoundVariable('width', num('popover/width'));
  c.setBoundVariable('itemSpacing', num('space/10'));
  c.setBoundVariable('paddingTop', num('space/5')); c.setBoundVariable('paddingBottom', num('space/5'));
  c.setBoundVariable('paddingLeft', num('space/10')); c.setBoundVariable('paddingRight', num('space/15'));
  c.fills = [paint(st.fill)];

  // The check's slot: as wide as an icon, as tall as one body line, kept by every variant.
  const slot = figma.createFrame(); slot.name = 'Check'; slot.fills = []; slot.clipsContent = false;
  slot.layoutMode = 'HORIZONTAL'; slot.primaryAxisAlignItems = 'CENTER'; slot.counterAxisAlignItems = 'CENTER';
  c.appendChild(slot);
  slot.layoutSizingHorizontal = 'FIXED'; slot.layoutSizingVertical = 'FIXED';
  slot.setBoundVariable('width', num('icon/size')); slot.setBoundVariable('height', num('line-height/body'));

  if (st.check) {
    // ┘ — the long arm on the right, the short one along the bottom; turned 45° it is a tick.
    const k = px('icon/size') / 16, bar = 1.5 * k;
    const long = figma.createRectangle(); long.name = 'arm-long'; long.resize(bar, 9 * k); long.x = 3.5 * k; long.y = 0;
    const short = figma.createRectangle(); short.name = 'arm-short'; short.resize(5 * k, bar); short.x = 0; short.y = 9 * k - bar;
    for (const b of [long, short]) b.fills = [paint('text/link')];
    const glyph = figma.union([long, short], slot); glyph.name = 'Glyph / check';
    glyph.fills = [paint('text/link')];
    glyph.rotation = -45;
    glyph.layoutSizingHorizontal = 'FIXED'; glyph.layoutSizingVertical = 'FIXED';
  }

  const label = figma.createText(); label.name = 'Label'; label.characters = 'Firewall';
  await label.setTextStyleIdAsync(style('Body/Default').id); label.fills = [paint(st.text)];
  c.appendChild(label); label.textAutoResize = 'HEIGHT'; label.layoutSizingHorizontal = 'FILL';

  // Semibold body: the same size and line as the name, the weight Body/Link carries.
  const meta = figma.createText(); meta.name = 'Meta'; meta.characters = '1 new';
  await meta.setTextStyleIdAsync(style('Body/Link').id); meta.fills = [paint(st.text)];
  c.appendChild(meta); meta.layoutSizingHorizontal = 'HUG';
  variants.push(c);
}

const set = figma.combineAsVariants(variants, page);
set.name = SET; set.x = 0; set.y = 0;
grid(set, p => [0, STATE_ORDER.indexOf(p.State)], 320, 48, 32);
set.resize(32 * 2 + 320, 32 * 2 + 48 * STATE_ORDER.length);

const labelProp = set.addComponentProperty('Label', 'TEXT', 'Firewall');
const metaTextProp = set.addComponentProperty('Meta text', 'TEXT', '1 new');
const metaProp = set.addComponentProperty('Meta', 'BOOLEAN', false);
for (const v of set.children) {
  const l = v.findOne(n => n.name === 'Label'); if (l) l.componentPropertyReferences = { characters: labelProp };
  const m = v.findOne(n => n.name === 'Meta'); if (m) { m.componentPropertyReferences = { characters: metaTextProp, visible: metaProp }; m.visible = false; }
}

return { created: SET, variants: variants.length, setId: set.id };
