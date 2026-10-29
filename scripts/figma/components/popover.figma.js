// @page Popover
// @set  Popover
// Popover — 2 variants (Size) + a "Title text" property. The popup only: placement, flipping,
// focus and dismissal are code (popover.md, Figma mapping), and there is no arrow — Vela overlays
// are flat. No shadow either: no elevation token exists, so the border/default stroke is the edge.
// Width binds popover/width or popover/width-wide; the height hugs the title and the body.

const SIZES = { regular: 'popover/width', wide: 'popover/width-wide' };

const variants = [];
for (const size of Object.keys(SIZES)) {
  const c = figma.createComponent();
  c.name = 'Size=' + size;
  c.layoutMode = 'VERTICAL';
  c.layoutSizingHorizontal = 'FIXED'; c.layoutSizingVertical = 'HUG';
  c.setBoundVariable('width', num(SIZES[size]));
  c.setBoundVariable('itemSpacing', num('space/10'));
  for (const p of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']) c.setBoundVariable(p, num('space/15'));
  c.fills = [paint('surface/raised')];
  c.strokes = [paint('border/default')]; c.strokeWeight = 1; c.strokeAlign = 'INSIDE';
  bindRadius(c, 'radius/4');

  const title = figma.createText(); title.name = 'Title'; title.characters = 'Filter alerts';
  await title.setTextStyleIdAsync(style('Heading/H5').id); title.fills = [paint('text/heading')];
  c.appendChild(title); title.textAutoResize = 'HEIGHT'; title.layoutSizingHorizontal = 'FILL';

  const body = figma.createText(); body.name = 'Body'; body.characters = 'Show alerts from the last 24 hours, critical and major only.';
  await body.setTextStyleIdAsync(style('Body/Default').id); body.fills = [paint('text/default')];
  c.appendChild(body); body.textAutoResize = 'HEIGHT'; body.layoutSizingHorizontal = 'FILL';
  variants.push(c);
}

const set = figma.combineAsVariants(variants, page);
set.name = SET; set.x = 0; set.y = 0;
grid(set, p => [p.Size === 'regular' ? 0 : 1, 0], 440, 140, 32);
set.resize(32 * 2 + 440 * 2, 32 * 2 + 140);

const titleProp = set.addComponentProperty('Title text', 'TEXT', 'Filter alerts');
for (const v of set.children) {
  const t = v.findOne(n => n.name === 'Title'); if (t) t.componentPropertyReferences = { characters: titleProp };
}

return { created: SET, variants: variants.length, setId: set.id };
