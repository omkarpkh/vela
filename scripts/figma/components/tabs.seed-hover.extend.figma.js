// @extends tabs
// @adds State=hover, Size=default
// @adds State=hover, Size=large
// @allow raw-size the Seed is a third of its tab's width, which no variable can hold: its width is measured from the tab when the script runs, as the code measures it (tabs.md, "The Seed's size"), and floored by tab/preview-width-min, bound as its minWidth; the Soft ends mask is the Seed's own size
// Tab, State=hover — the hover preview, the Seed, as two variants (Size default and large), added to
// the published Tab set in place (R18, asked for by the Figma thread). Built in code since 0.14.0:
// guidelines/components/tabs.md (Hover, the Seed) and src/components/Tabs/Tabs.css.
//
// The tab is the default tab with the label and count in text/default, the colour Tabs.css gives a
// hovered, enabled, unselected trigger, and no underline. The Seed lies in the underline's slot, the
// 2px at the bottom edge where the border lies: an absolute frame stroke/2 tall, at the
// opacity/preview layer opacity, a third of the tab wide, never under tab/preview-width-min and never
// wider than the tab, centred. Its width is measured once, here; it scales with the tab after that
// (constraints SCALE), so it stays a third and centred when a label is overridden. Inside it, a
// "Soft ends" alpha mask (a black gradient, transparent at both ends, solid from 30% to 70%, as the
// CSS mask-image) over a "Bar" in border/active.
//
// The delay (delay/preview), the fade and the press exist only in code. The six existing variants
// do not move: appendVariant places the two below them and grows the set.

const SIZES = { default: 'Tab/Default', large: 'Tab/Large' };
const COUNT = { default: 'Tab/Count', large: 'Tab/Count Large' };
const px = (name) => { const v = num(name); return v.valuesByMode[Object.keys(v.valuesByMode)[0]]; };
const countKey = propKey(set, 'Count');
const stroke = px('stroke/2'), floor = px('tab/preview-width-min');
const out = [];

for (const size of Object.keys(SIZES)) {
  const t = figma.createComponent();
  t.name = 'State=hover, Size=' + size;
  t.layoutMode = 'HORIZONTAL'; t.counterAxisAlignItems = 'CENTER'; t.fills = [];
  t.setBoundVariable('itemSpacing', num('space/5'));
  t.setBoundVariable('paddingTop', num('space/10')); t.setBoundVariable('paddingBottom', num('space/10'));
  t.strokes = []; t.strokeAlign = 'INSIDE';
  t.strokeTopWeight = 0; t.strokeLeftWeight = 0; t.strokeRightWeight = 0; t.strokeBottomWeight = 2;

  const label = figma.createText(); label.name = 'Label'; label.characters = 'Alerts';
  await label.setTextStyleIdAsync(style(SIZES[size]).id); label.fills = [paint('text/default')];
  t.appendChild(label); label.layoutSizingHorizontal = 'HUG';

  const count = figma.createText(); count.name = 'Count'; count.characters = '12';
  await count.setTextStyleIdAsync(style(COUNT[size]).id); count.fills = [paint('text/default')];
  t.appendChild(count); count.layoutSizingHorizontal = 'HUG';

  t.layoutSizingHorizontal = 'HUG'; t.layoutSizingVertical = 'HUG';
  appendVariant(set, t);
  count.componentPropertyReferences = { visible: countKey };

  // The Seed: a third of the tab, never under the floor, never wider than the tab; centred, on the bottom edge.
  const width = Math.min(t.width, Math.max(t.width / 3, floor));
  const seed = figma.createFrame(); seed.name = 'Seed'; seed.fills = []; seed.clipsContent = true;
  seed.layoutMode = 'HORIZONTAL';
  t.appendChild(seed);
  seed.layoutPositioning = 'ABSOLUTE';
  seed.resize(width, stroke);
  seed.setBoundVariable('height', num('stroke/2'));
  seed.setBoundVariable('minWidth', num('tab/preview-width-min'));
  seed.setBoundVariable('opacity', num('opacity/preview'));
  seed.x = (t.width - width) / 2; seed.y = t.height - stroke;
  seed.constraints = { horizontal: 'SCALE', vertical: 'MAX' };

  // Soft ends: an alpha mask in the Seed's own box. Only its alpha is drawn, so its stops are black.
  const ends = figma.createRectangle(); ends.name = 'Soft ends'; ends.isMask = true;
  seed.appendChild(ends);
  ends.layoutPositioning = 'ABSOLUTE';
  ends.resize(width, stroke); ends.setBoundVariable('height', num('stroke/2'));
  ends.x = 0; ends.y = 0; ends.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' };
  const black = (position, a) => ({ position, color: { r: 0, g: 0, b: 0, a } });
  ends.fills = [{ type: 'GRADIENT_LINEAR', gradientTransform: [[1, 0, 0], [0, 1, 0]], gradientStops: [black(0, 0), black(0.3, 1), black(0.7, 1), black(1, 0)] }];

  // The bar the mask softens: the underline's colour, the Seed's full width.
  const bar = figma.createRectangle(); bar.name = 'Bar';
  seed.appendChild(bar);
  bar.layoutSizingHorizontal = 'FILL'; bar.layoutSizingVertical = 'FIXED';
  bar.setBoundVariable('height', num('stroke/2'));
  bar.fills = [paint('border/active')];
  out.push(t.id);
}

return { hover: out };
