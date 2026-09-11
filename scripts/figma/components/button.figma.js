// @page Button
// @set  Button
// Button — 24 variants (Variant × Appearance × Size) + Icon boolean.
// text-link is deliberately NOT here: it is its own component set, mirroring the
// discriminated union in ButtonProps. disabled is a state, not a variant axis.

const SIZES = {
  tiny:    { h: 'control-height/24', pad: 'space/10', icon: 'icon/12', style: 'Button/Tiny' },
  regular: { h: 'control-height/35', pad: 'space/15', icon: 'icon/16', style: 'Button/Regular' },
  large:   { h: 'control-height/40', pad: 'space/20', icon: 'icon/16', style: 'Button/Large' },
  huge:    { h: 'control-height/60', pad: 'space/30', icon: 'icon/16', style: 'Button/Huge' },
};
const COMBO = {
  'primary|filled':     { fill: 'button/primary-bg',     stroke: 'button/primary-border',        text: 'button/primary-text' },
  'primary|hollow':     { fill: null,                    stroke: 'button/hollow-primary-border', text: 'button/hollow-primary-text' },
  'standard|filled':    { fill: 'button/standard-bg',    stroke: 'button/standard-border',       text: 'button/standard-text' },
  'standard|hollow':    { fill: null,                    stroke: 'button/standard-border',       text: 'button/standard-text' },
  'destructive|filled': { fill: 'button/destructive-bg', stroke: 'button/destructive-bg',        text: 'button/destructive-text' },
  'destructive|hollow': { fill: null,                    stroke: 'button/destructive-hollow-text', text: 'button/destructive-hollow-text' },
};
const VARIANTS = ['primary', 'standard', 'destructive'], APPS = ['filled', 'hollow'], SIZE_ORDER = ['tiny', 'regular', 'large', 'huge'];

const variants = [];
for (const variant of VARIANTS) for (const appearance of APPS) for (const size of SIZE_ORDER) {
  const sz = SIZES[size], cb = COMBO[variant + '|' + appearance];
  const btn = figma.createComponent();
  btn.name = 'Variant=' + variant + ', Appearance=' + appearance + ', Size=' + size;
  btn.layoutMode = 'HORIZONTAL'; btn.primaryAxisAlignItems = 'CENTER'; btn.counterAxisAlignItems = 'CENTER';
  btn.layoutSizingHorizontal = 'HUG';
  btn.setBoundVariable('itemSpacing', num('space/5'));
  btn.setBoundVariable('paddingLeft', num(sz.pad)); btn.setBoundVariable('paddingRight', num(sz.pad));
  bindRadius(btn, 'radius/4');
  btn.fills = cb.fill ? [paint(cb.fill)] : []; btn.strokes = [paint(cb.stroke)]; btn.strokeWeight = 1;

  // Icon placeholder: a plus built from two bars, tinted with the label colour. Toggled by the Icon property.
  const icon = figma.createFrame(); icon.name = 'Icon'; icon.fills = []; icon.clipsContent = false;
  btn.appendChild(icon);
  icon.layoutSizingHorizontal = 'FIXED'; icon.layoutSizingVertical = 'FIXED';
  icon.setBoundVariable('width', num(sz.icon)); icon.setBoundVariable('height', num(sz.icon));
  const px = num(sz.icon).valuesByMode[Object.keys(num(sz.icon).valuesByMode)[0]];
  for (const horiz of [true, false]) {
    const bar = figma.createRectangle(); bar.name = horiz ? 'bar-h' : 'bar-v';
    bar.resize(horiz ? px * 0.75 : 1.5, horiz ? 1.5 : px * 0.75);
    bar.x = horiz ? px * 0.125 : (px - 1.5) / 2; bar.y = horiz ? (px - 1.5) / 2 : px * 0.125;
    bar.fills = [paint(cb.text)]; bar.cornerRadius = 1; icon.appendChild(bar);
  }

  const label = figma.createText(); label.name = 'Label'; label.characters = 'Button';
  await label.setTextStyleIdAsync(style(sz.style).id); label.fills = [paint(cb.text)];
  btn.appendChild(label); label.layoutSizingHorizontal = 'HUG';

  btn.layoutSizingVertical = 'FIXED'; btn.setBoundVariable('height', num(sz.h));
  variants.push(btn);
}

const set = figma.combineAsVariants(variants, page);
set.name = SET; set.x = 0; set.y = 0;
grid(set, p => [SIZE_ORDER.indexOf(p.Size), VARIANTS.indexOf(p.Variant) * APPS.length + APPS.indexOf(p.Appearance)], 190, 96, 32);
set.resize(32 * 2 + 190 * 4, 32 * 2 + 96 * 6);

const iconKey = set.addComponentProperty('Icon', 'BOOLEAN', false);
for (const v of set.children) { const i = v.findOne(n => n.name === 'Icon'); if (i) { i.componentPropertyReferences = { visible: iconKey }; i.visible = false; } }

return { created: SET, variants: variants.length, setId: set.id };
