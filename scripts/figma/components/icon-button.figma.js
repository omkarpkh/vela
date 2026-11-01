// @page Icon Button
// @set  Icon Button
// @uses icon
// Icon Button — 8 variants: State (Rest, Hover, Pressed, Disabled) × Size (Tiny, Regular)
// (guidelines/components/icon-button.md). Written 1 Nov 2026 and not yet run: the library has no Icon
// Button set until the Figma thread builds it from this file.
//
// Each variant is a box bound to control-height/24 (Tiny, which is control/target-min) or
// control-height/35 (Regular), rounded at radius/3 or radius/4, holding one Icon instance (Glyph=x)
// centred and bound to icon/size or icon/size-large. Rest and Disabled have no fill; Hover and
// Pressed fill button/standard-hover-bg. The glyph strokes icon/strong, and icon/disabled when
// Disabled. Pressed's 88% glyph scale is motion, so it is code only: in the file Pressed looks like
// Hover. The `Icon` instance-swap property swaps the glyph; the `Label` text property carries the
// name, on a hidden layer, because the canvas never shows it (the tooltip and the name are code).
// The brand-mark and word glyphs, the link form and the tooltip exist only in code.

const SIZES = {
  Tiny: { box: 'control-height/24', glyph: 'icon/size', radius: 'radius/3' },
  Regular: { box: 'control-height/35', glyph: 'icon/size-large', radius: 'radius/4' },
};
const STATES = ['Rest', 'Hover', 'Pressed', 'Disabled'];

const variants = [];
for (const state of STATES) for (const size of Object.keys(SIZES)) {
  const s = SIZES[size];
  const c = figma.createComponent();
  c.name = 'State=' + state + ', Size=' + size;
  c.layoutMode = 'HORIZONTAL';
  c.primaryAxisAlignItems = 'CENTER'; c.counterAxisAlignItems = 'CENTER';
  c.layoutSizingHorizontal = 'FIXED'; c.layoutSizingVertical = 'FIXED';
  c.setBoundVariable('width', num(s.box)); c.setBoundVariable('height', num(s.box));
  c.fills = state === 'Hover' || state === 'Pressed' ? [paint('button/standard-hover-bg')] : [];
  bindRadius(c, s.radius);

  const glyph = await instanceOf('Icon', 'Glyph=x'); glyph.name = 'Icon';
  c.appendChild(glyph);
  glyph.setBoundVariable('width', num(s.glyph)); glyph.setBoundVariable('height', num(s.glyph));
  if (state === 'Disabled') for (const v of glyph.findAll(n => n.type === 'VECTOR')) v.strokes = [paint('icon/disabled')];

  // The name: never drawn on the canvas, so the layer is hidden. In code it is `label`.
  const label = figma.createText(); label.name = 'Label'; label.characters = 'Close';
  await label.setTextStyleIdAsync(style('Body/Meta').id); label.fills = [paint('text/default')];
  c.appendChild(label); label.layoutPositioning = 'ABSOLUTE'; label.visible = false;
  variants.push(c);
}

const set = figma.combineAsVariants(variants, page);
set.name = SET; set.x = 0; set.y = 0;
grid(set, p => [STATES.indexOf(p.State), p.Size === 'Tiny' ? 0 : 1], 64, 64, 32);
set.resize(32 * 2 + 64 * 4, 32 * 2 + 64 * 2);

const labelProp = set.addComponentProperty('Label', 'TEXT', 'Close');
const iconMain = set.children[0].findOne(n => n.name === 'Icon').mainComponent;
const iconProp = set.addComponentProperty('Icon', 'INSTANCE_SWAP', iconMain.id);
for (const v of set.children) {
  v.findOne(n => n.name === 'Label').componentPropertyReferences = { characters: labelProp };
  v.findOne(n => n.name === 'Icon').componentPropertyReferences = { mainComponent: iconProp };
}

return { created: SET, variants: variants.length, setId: set.id };
