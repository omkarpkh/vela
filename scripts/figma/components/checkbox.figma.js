// @page Checkbox
// @set  Checkbox
// Checkbox — 6 variants (State × Size) + a "Label text" property and a "Description" boolean.
// There is no Checkbox.Group set: a group is Checkbox instances stacked under a text label, as
// the tablist is composed from Tab instances. Disabled and error have no axis on purpose — they
// are states the markup carries (:disabled, aria-invalid), not variants (checkbox.md).
// The box sits in a "Control" slot one label line tall, so it centres on the first line and a
// two-line label never pulls it to the middle. The tick is an L of two bars turned 45°, the dash
// two bars end to end: each glyph is ONE union shape in control/check/mark.

const STATES = ['unchecked', 'checked', 'indeterminate'];
const SIZES = {
  regular: { box: 'control/checkbox/size', line: 'line-height/body', label: 'Body/Default' },
  tiny: { box: 'control/checkbox/size-tiny', line: 'line-height/meta', label: 'Body/Meta' },
};
const px = (name) => { const v = num(name); return v.valuesByMode[Object.keys(v.valuesByMode)[0]]; };

const variants = [];
for (const state of STATES) for (const size of Object.keys(SIZES)) {
  const sz = SIZES[size];
  const on = state !== 'unchecked';
  const c = figma.createComponent();
  c.name = 'State=' + state + ', Size=' + size;
  c.layoutMode = 'HORIZONTAL'; c.counterAxisAlignItems = 'MIN';
  c.layoutSizingHorizontal = 'HUG'; c.layoutSizingVertical = 'HUG';
  c.setBoundVariable('itemSpacing', num('space/10')); c.fills = [];

  // A slot as tall as one label line, the box centred in it.
  const slot = figma.createFrame(); slot.name = 'Control'; slot.fills = []; slot.clipsContent = false;
  slot.layoutMode = 'HORIZONTAL'; slot.primaryAxisAlignItems = 'CENTER'; slot.counterAxisAlignItems = 'CENTER';
  c.appendChild(slot);
  slot.layoutSizingHorizontal = 'FIXED'; slot.layoutSizingVertical = 'FIXED';
  slot.setBoundVariable('width', num(sz.box)); slot.setBoundVariable('height', num(sz.line));

  const box = figma.createFrame(); box.name = 'Box'; box.clipsContent = false;
  box.layoutMode = 'HORIZONTAL'; box.primaryAxisAlignItems = 'CENTER'; box.counterAxisAlignItems = 'CENTER';
  box.fills = [paint(on ? 'control/check/bg-checked' : 'control/bg')];
  box.strokes = [paint(on ? 'control/check/bg-checked' : 'control/border')]; box.strokeWeight = 1; box.strokeAlign = 'INSIDE';
  bindRadius(box, 'radius/3');
  slot.appendChild(box);
  box.layoutSizingHorizontal = 'FIXED'; box.layoutSizingVertical = 'FIXED';
  box.setBoundVariable('width', num(sz.box)); box.setBoundVariable('height', num(sz.box));

  if (on) {
    const k = px(sz.box) / 16, bar = 2 * k;
    const bars = [];
    if (state === 'checked') {
      // ┘ — the long arm on the right, the short one along the bottom; turned 45° it is a tick.
      const long = figma.createRectangle(); long.name = 'arm-long'; long.resize(bar, 9 * k); long.x = 3 * k; long.y = 0;
      const short = figma.createRectangle(); short.name = 'arm-short'; short.resize(5 * k, bar); short.x = 0; short.y = 9 * k - bar;
      bars.push(long, short);
    } else {
      const left = figma.createRectangle(); left.name = 'bar-left'; left.resize(4 * k, bar); left.x = 0; left.y = 0;
      const right = figma.createRectangle(); right.name = 'bar-right'; right.resize(4 * k, bar); right.x = 4 * k; right.y = 0;
      bars.push(left, right);
    }
    for (const b of bars) { b.fills = [paint('control/check/mark')]; }
    const glyph = figma.union(bars, box); glyph.name = state === 'checked' ? 'Glyph / check' : 'Glyph / dash';
    glyph.fills = [paint('control/check/mark')];
    if (state === 'checked') glyph.rotation = -45;
    glyph.layoutSizingHorizontal = 'FIXED'; glyph.layoutSizingVertical = 'FIXED';
  }

  const text = figma.createFrame(); text.name = 'Copy'; text.fills = [];
  text.layoutMode = 'VERTICAL';
  c.appendChild(text);
  text.layoutSizingHorizontal = 'HUG'; text.layoutSizingVertical = 'HUG';

  const label = figma.createText(); label.name = 'Label'; label.characters = 'Accept the terms';
  await label.setTextStyleIdAsync(style(sz.label).id); label.fills = [paint('text/default')];
  text.appendChild(label); label.layoutSizingHorizontal = 'HUG';

  const desc = figma.createText(); desc.name = 'Description'; desc.characters = 'Required to continue';
  await desc.setTextStyleIdAsync(style('Body/Meta').id); desc.fills = [paint('text/de-emphasized')];
  text.appendChild(desc); desc.layoutSizingHorizontal = 'HUG';
  variants.push(c);
}

const set = figma.combineAsVariants(variants, page);
set.name = SET; set.x = 0; set.y = 0;
grid(set, p => [STATES.indexOf(p.State), p.Size === 'regular' ? 0 : 1], 220, 64, 32);
set.resize(32 * 2 + 220 * 3, 32 * 2 + 64 * 2);

const labelProp = set.addComponentProperty('Label text', 'TEXT', 'Accept the terms');
const descProp = set.addComponentProperty('Description', 'BOOLEAN', false);
for (const v of set.children) {
  const l = v.findOne(n => n.name === 'Label'); if (l) l.componentPropertyReferences = { characters: labelProp };
  const d = v.findOne(n => n.name === 'Description'); if (d) { d.componentPropertyReferences = { visible: descProp }; d.visible = false; }
}

return { created: SET, variants: variants.length, setId: set.id };
