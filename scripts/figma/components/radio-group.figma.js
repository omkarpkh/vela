// @page Radio Group
// @set  Radio
// Radio — a single radio, 2 variants (State) + a "Label text" property and a "Description"
// boolean. The group is composed from instances stacked under a text label, as the tablist is
// composed from Tab instances. Disabled and error have no axis on purpose — they are states the
// markup carries (:disabled, aria-invalid on the group), not variants (radio-group.md).
// The circle is an ellipse, not a frame with a corner radius: a circle's own geometry, so
// radius/full keeps its scope (the status dot and the toggle track). It sits in a "Control" slot
// one label line tall; the dot is centred on it, absolutely positioned inside the slot.
// The roving tabindex, the arrow keys and the skipping of disabled radios exist only in code.

const STATES = ['unselected', 'selected'];
const px = (name) => { const v = num(name); return v.valuesByMode[Object.keys(v.valuesByMode)[0]]; };

const variants = [];
for (const state of STATES) {
  const on = state === 'selected';
  const c = figma.createComponent();
  c.name = 'State=' + state;
  c.layoutMode = 'HORIZONTAL'; c.counterAxisAlignItems = 'MIN';
  c.layoutSizingHorizontal = 'HUG'; c.layoutSizingVertical = 'HUG';
  c.setBoundVariable('itemSpacing', num('space/10')); c.fills = [];

  const slot = figma.createFrame(); slot.name = 'Control'; slot.fills = []; slot.clipsContent = false;
  slot.layoutMode = 'HORIZONTAL'; slot.primaryAxisAlignItems = 'CENTER'; slot.counterAxisAlignItems = 'CENTER';
  c.appendChild(slot);
  slot.layoutSizingHorizontal = 'FIXED'; slot.layoutSizingVertical = 'FIXED';
  slot.setBoundVariable('width', num('control/radio/size')); slot.setBoundVariable('height', num('line-height/body'));

  const circle = figma.createEllipse(); circle.name = 'Circle';
  circle.fills = [paint(on ? 'control/check/bg-checked' : 'control/bg')];
  circle.strokes = [paint(on ? 'control/check/bg-checked' : 'control/border')]; circle.strokeWeight = 1; circle.strokeAlign = 'INSIDE';
  slot.appendChild(circle);
  circle.layoutSizingHorizontal = 'FIXED'; circle.layoutSizingVertical = 'FIXED';
  circle.setBoundVariable('width', num('control/radio/size')); circle.setBoundVariable('height', num('control/radio/size'));

  if (on) {
    const dot = figma.createEllipse(); dot.name = 'Dot';
    dot.fills = [paint('control/check/mark')];
    slot.appendChild(dot);
    dot.layoutPositioning = 'ABSOLUTE';
    dot.layoutSizingHorizontal = 'FIXED'; dot.layoutSizingVertical = 'FIXED';
    dot.setBoundVariable('width', num('control/radio/dot')); dot.setBoundVariable('height', num('control/radio/dot'));
    dot.x = (px('control/radio/size') - px('control/radio/dot')) / 2;
    dot.y = (px('line-height/body') - px('control/radio/dot')) / 2;
    dot.constraints = { horizontal: 'CENTER', vertical: 'CENTER' };
  }

  const text = figma.createFrame(); text.name = 'Copy'; text.fills = [];
  text.layoutMode = 'VERTICAL';
  c.appendChild(text);
  text.layoutSizingHorizontal = 'HUG'; text.layoutSizingVertical = 'HUG';

  const label = figma.createText(); label.name = 'Label'; label.characters = 'Monitor';
  await label.setTextStyleIdAsync(style('Body/Default').id); label.fills = [paint('text/default')];
  text.appendChild(label); label.layoutSizingHorizontal = 'HUG';

  const desc = figma.createText(); desc.name = 'Description'; desc.characters = 'Log the match, allow the traffic';
  await desc.setTextStyleIdAsync(style('Body/Meta').id); desc.fills = [paint('text/de-emphasized')];
  text.appendChild(desc); desc.layoutSizingHorizontal = 'HUG';
  variants.push(c);
}

const set = figma.combineAsVariants(variants, page);
set.name = SET; set.x = 0; set.y = 0;
grid(set, p => [STATES.indexOf(p.State), 0], 260, 64, 32);
set.resize(32 * 2 + 260 * 2, 32 * 2 + 64);

const labelProp = set.addComponentProperty('Label text', 'TEXT', 'Monitor');
const descProp = set.addComponentProperty('Description', 'BOOLEAN', false);
for (const v of set.children) {
  const l = v.findOne(n => n.name === 'Label'); if (l) l.componentPropertyReferences = { characters: labelProp };
  const d = v.findOne(n => n.name === 'Description'); if (d) { d.componentPropertyReferences = { visible: descProp }; d.visible = false; }
}

return { created: SET, variants: variants.length, setId: set.id };
