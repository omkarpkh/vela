// @page Risk Pill
// @set  Risk Pill
// Risk Pill — 6 variants (3 risks × 2 sizes) + a "Label text" property.
// Fill, stroke and text bind the RISK taxonomy only — never severity, never status.
// Nothing here is literal: the regular height binds control-height/24, the small size hugs
// its text, padding binds space/10 and space/5, the radius binds radius/3 (an inline chip —
// never radius/full, which belongs to the status dot and the toggle track).

const RISK = ['low', 'medium', 'high'];
const LABELS = { low: 'Low', medium: 'Medium', high: 'High' };
const variants = [];
for (const risk of RISK) for (const size of ['regular', 'small']) {
  const c = figma.createComponent();
  c.name = 'Risk=' + risk + ', Size=' + size;
  c.layoutMode = 'HORIZONTAL'; c.primaryAxisAlignItems = 'CENTER'; c.counterAxisAlignItems = 'CENTER';
  c.layoutSizingHorizontal = 'HUG';
  if (size === 'regular') {
    c.layoutSizingVertical = 'FIXED'; c.setBoundVariable('height', num('control-height/24'));
    c.setBoundVariable('paddingLeft', num('space/10')); c.setBoundVariable('paddingRight', num('space/10'));
  } else {
    c.layoutSizingVertical = 'HUG';
    c.setBoundVariable('paddingLeft', num('space/5')); c.setBoundVariable('paddingRight', num('space/5'));
  }
  bindRadius(c, 'radius/3');
  c.fills = [paint('risk/' + risk + '/bg')]; c.strokes = [paint('risk/' + risk + '/border')]; c.strokeWeight = 1;

  const label = figma.createText(); label.name = 'Label'; label.characters = LABELS[risk];
  await label.setTextStyleIdAsync(style('Body/Meta').id); label.fills = [paint('risk/' + risk + '/text')];
  c.appendChild(label); label.layoutSizingHorizontal = 'HUG';
  variants.push(c);
}

const set = figma.combineAsVariants(variants, page);
set.name = SET; set.x = 0; set.y = 0;
grid(set, p => [RISK.indexOf(p.Risk), p.Size === 'regular' ? 0 : 1], 120, 48, 32);
set.resize(32 * 2 + 120 * 3, 32 * 2 + 48 * 2);

const labelProp = set.addComponentProperty('Label text', 'TEXT', 'Low');
for (const v of set.children) { const l = v.findOne(n => n.name === 'Label'); if (l) l.componentPropertyReferences = { characters: labelProp }; }

return { created: SET, variants: variants.length, setId: set.id };
