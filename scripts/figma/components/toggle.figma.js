// @page Toggle
// @set  Toggle
// Toggle — 4 variants (State × Size) + a required "Label text" property.
// Track/knob geometry is literal here and in the CSS: a known, recorded token gap.

const GEO = { regular: { w: 34, h: 20, knob: 16 }, tiny: { w: 26, h: 15, knob: 11 } };
const variants = [];
for (const state of ['off', 'on']) for (const size of ['regular', 'tiny']) {
  const g = GEO[size];
  const c = figma.createComponent();
  c.name = 'State=' + state + ', Size=' + size;
  c.layoutMode = 'HORIZONTAL'; c.counterAxisAlignItems = 'CENTER';
  c.layoutSizingHorizontal = 'HUG'; c.layoutSizingVertical = 'HUG';
  c.setBoundVariable('itemSpacing', num('space/10')); c.fills = [];

  const track = figma.createFrame(); track.name = 'Track'; track.resize(g.w, g.h); track.clipsContent = false;
  track.fills = [paint(state === 'on' ? 'control/toggle-on-bg' : 'control/toggle-off-bg')];
  bindRadius(track, 'radius/full');
  c.appendChild(track); track.layoutSizingHorizontal = 'FIXED'; track.layoutSizingVertical = 'FIXED';

  const knob = figma.createEllipse(); knob.name = 'Knob'; knob.resize(g.knob, g.knob);
  knob.fills = [paint('control/toggle-knob')];
  knob.x = state === 'on' ? g.w - g.knob - 2 : 2; knob.y = (g.h - g.knob) / 2;
  track.appendChild(knob);

  const label = figma.createText(); label.name = 'Label'; label.characters = 'Email alerts';
  await label.setTextStyleIdAsync(style('Body/Default').id); label.fills = [paint('text/default')];
  c.appendChild(label); label.layoutSizingHorizontal = 'HUG';
  variants.push(c);
}

const set = figma.combineAsVariants(variants, page);
set.name = SET; set.x = 0; set.y = 0;
grid(set, p => [p.Size === 'regular' ? 0 : 1, p.State === 'off' ? 0 : 1], 200, 56, 32);
set.resize(32 * 2 + 200 * 2, 32 * 2 + 56 * 2);

const labelProp = set.addComponentProperty('Label text', 'TEXT', 'Email alerts');
for (const v of set.children) { const l = v.findOne(n => n.name === 'Label'); if (l) l.componentPropertyReferences = { characters: labelProp }; }

return { created: SET, variants: variants.length, setId: set.id };
