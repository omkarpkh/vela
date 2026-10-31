// @page Dropdown List
// @set  Dropdown List item
// @component Dropdown List
// @uses icon
// Dropdown List item — 8 variants: Highlighted × Current × Locked (false / true each), the three
// states the markup carries (data-highlighted, aria-checked, aria-disabled), plus a "Meta" boolean
// and "Label" / "Meta text" properties. One row of the list. The row is popover/width wide and its
// name wraps (dropdown-list.md: never truncated). Every variant keeps the check's slot, an
// icon/size box one body line tall, so the names line up; only Current draws the check, ONE union
// shape in text/link (a 3:1 mark — the name stays text/default). Highlighted is surface/raised-hover,
// also when Locked (keyboard focus on a locked item still shows where you are). The name sits in a
// "Name" row with a space/5 gap; Locked puts an Icon instance, Glyph=lock in icon/strong, in a slot
// one body line tall before it, greys the name to text/inactive, and the meta, which holds the
// reason, stays text/default, because it says why. Current=true with Locked=true can't happen in
// code (dropdown-list-locked-not-chosen); the variants stay because the 0.14.0 set published them. The meta is
// Body/Strong. Every variant writes the same words in the layers the TEXT properties bind (the
// text-property-collapse lint); the designer overrides them on the instance.
// Dropdown List — one size: the popup, a component (not a frame) on Popover's surface — raised, a
// border/default edge, radius/4, space/5 on every side and no shadow, because no elevation token
// exists — holding four item instances: a plain one, the current one with meta, a locked one with
// its reason in meta, and a highlighted one.
// Placement, flipping, focus, typeahead and the highlight following the keys exist only in code.

const BOOL = ['false', 'true'];
const px = (name) => { const v = num(name); return v.valuesByMode[Object.keys(v.valuesByMode)[0]]; };

const variants = [];
for (const highlighted of BOOL) for (const current of BOOL) for (const locked of BOOL) {
  const c = figma.createComponent();
  c.name = 'Highlighted=' + highlighted + ', Current=' + current + ', Locked=' + locked;
  c.layoutMode = 'HORIZONTAL'; c.counterAxisAlignItems = 'MIN';
  c.layoutSizingHorizontal = 'FIXED'; c.layoutSizingVertical = 'HUG';
  c.setBoundVariable('width', num('popover/width'));
  c.setBoundVariable('itemSpacing', num('space/10'));
  c.setBoundVariable('paddingTop', num('space/5')); c.setBoundVariable('paddingBottom', num('space/5'));
  c.setBoundVariable('paddingLeft', num('space/10')); c.setBoundVariable('paddingRight', num('space/15'));
  c.fills = [paint(highlighted === 'true' ? 'surface/raised-hover' : 'surface/raised')];

  // The check's slot: as wide as an icon, as tall as one body line, kept by every variant.
  const slot = figma.createFrame(); slot.name = 'Check'; slot.fills = []; slot.clipsContent = false;
  slot.layoutMode = 'HORIZONTAL'; slot.primaryAxisAlignItems = 'CENTER'; slot.counterAxisAlignItems = 'CENTER';
  c.appendChild(slot);
  slot.layoutSizingHorizontal = 'FIXED'; slot.layoutSizingVertical = 'FIXED';
  slot.setBoundVariable('width', num('icon/size')); slot.setBoundVariable('height', num('line-height/body'));

  if (current === 'true') {
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

  // The name row: space/5 between the lock and the name, which the row's space/10 gap can't give.
  const nameRow = figma.createFrame(); nameRow.name = 'Name'; nameRow.fills = []; nameRow.clipsContent = false;
  nameRow.layoutMode = 'HORIZONTAL'; nameRow.counterAxisAlignItems = 'MIN';
  nameRow.setBoundVariable('itemSpacing', num('space/5'));
  c.appendChild(nameRow);
  nameRow.layoutSizingHorizontal = 'FILL'; nameRow.layoutSizingVertical = 'HUG';

  if (locked === 'true') {
    // Icon's lock, centred on the first line of the name, as the code's vertical-align does.
    const lockSlot = figma.createFrame(); lockSlot.name = 'Lock'; lockSlot.fills = []; lockSlot.clipsContent = false;
    lockSlot.layoutMode = 'HORIZONTAL'; lockSlot.primaryAxisAlignItems = 'CENTER'; lockSlot.counterAxisAlignItems = 'CENTER';
    nameRow.appendChild(lockSlot);
    lockSlot.layoutSizingHorizontal = 'FIXED'; lockSlot.layoutSizingVertical = 'FIXED';
    lockSlot.setBoundVariable('width', num('icon/size')); lockSlot.setBoundVariable('height', num('line-height/body'));
    const lock = await instanceOf('Icon', 'Glyph=lock'); lock.name = 'Icon / lock';
    lockSlot.appendChild(lock);
  }

  const label = figma.createText(); label.name = 'Label'; label.characters = 'Firewall';
  await label.setTextStyleIdAsync(style('Body/Default').id);
  label.fills = [paint(locked === 'true' ? 'text/inactive' : 'text/default')];
  nameRow.appendChild(label); label.textAutoResize = 'HEIGHT'; label.layoutSizingHorizontal = 'FILL';

  const meta = figma.createText(); meta.name = 'Meta'; meta.characters = '1 new';
  await meta.setTextStyleIdAsync(style('Body/Strong').id); meta.fills = [paint('text/default')];
  c.appendChild(meta); meta.layoutSizingHorizontal = 'HUG';
  variants.push(c);
}

const set = figma.combineAsVariants(variants, page);
set.name = SET; set.x = 0; set.y = 0;
// Columns: Highlighted. Rows: Current, then Locked.
grid(set, p => [BOOL.indexOf(p.Highlighted), BOOL.indexOf(p.Current) * 2 + BOOL.indexOf(p.Locked)], 320, 48, 32);
set.resize(32 * 2 + 320 * 2, 32 * 2 + 48 * 4);

const labelProp = set.addComponentProperty('Label', 'TEXT', 'Firewall');
const metaTextProp = set.addComponentProperty('Meta text', 'TEXT', '1 new');
const metaProp = set.addComponentProperty('Meta', 'BOOLEAN', false);
for (const v of set.children) {
  const l = v.findOne(n => n.name === 'Label'); if (l) l.componentPropertyReferences = { characters: labelProp };
  const m = v.findOne(n => n.name === 'Meta'); if (m) { m.componentPropertyReferences = { characters: metaTextProp, visible: metaProp }; m.visible = false; }
}

// The popup: one size, Popover's surface, four item instances.
const popup = figma.createComponent();
popup.name = SETS[1];
popup.layoutMode = 'VERTICAL';
popup.layoutSizingHorizontal = 'FIXED'; popup.layoutSizingVertical = 'HUG';
popup.setBoundVariable('width', num('popover/width'));
for (const p of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']) popup.setBoundVariable(p, num('space/5'));
popup.fills = [paint('surface/raised')];
popup.strokes = [paint('border/default')]; popup.strokeWeight = 1; popup.strokeAlign = 'INSIDE';
bindRadius(popup, 'radius/4');
page.appendChild(popup);
popup.x = set.x + set.width + 64; popup.y = 0;

const ROWS = [
  { name: 'Item / Alerts', label: 'Alerts', variant: { Highlighted: 'false', Current: 'false', Locked: 'false' } },
  { name: 'Item / Firewall', label: 'Firewall', meta: '1 new', variant: { Highlighted: 'false', Current: 'true', Locked: 'false' } },
  { name: 'Item / Archive', label: 'Archive', meta: 'Needs retention on', variant: { Highlighted: 'false', Current: 'false', Locked: 'true' } },
  { name: 'Item / Reports', label: 'Reports', meta: '3 open', variant: { Highlighted: 'true', Current: 'false', Locked: 'false' } },
];
const base = set.children.find(v => v.name === 'Highlighted=false, Current=false, Locked=false');
for (const row of ROWS) {
  const inst = base.createInstance();
  inst.name = row.name;
  popup.appendChild(inst);
  inst.setProperties({ ...row.variant, [labelProp]: row.label, [metaProp]: Boolean(row.meta), [metaTextProp]: row.meta || '1 new' });
  inst.layoutSizingHorizontal = 'FILL'; inst.layoutSizingVertical = 'HUG';
}

return { created: SET, variants: variants.length, setId: set.id, popup: popup.id, items: ROWS.length };
