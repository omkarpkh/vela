// @page Input
// @set  Input
// Input — 12 variants (Size × State). Label, field and message rows travel together
// because the code component renders all three. Note the order: resize() BEFORE
// the HUG sizing mode — resize resets sizing to FIXED, which collapsed the first build.

const SIZES = { tiny: { h: 'control-height/25', pad: 'space/5' }, regular: { h: 'control-height/26', pad: 'space/10' }, large: { h: 'control-height/35', pad: 'space/10' } };
const STATES = {
  default:  { border: 'control/border',        bg: 'control/bg',          value: 'control/placeholder', msg: 'Lowercase letters only',      msgColor: 'text/de-emphasized' },
  focus:    { border: 'control/border-active', bg: 'control/bg',          value: 'text/default',        msg: 'Lowercase letters only',      msgColor: 'text/de-emphasized' },
  error:    { border: 'control/border-error',  bg: 'control/bg',          value: 'text/default',        msg: 'This tenant already exists',  msgColor: 'text/error' },
  disabled: { border: 'border/inactive',       bg: 'control/bg-disabled', value: 'text/inactive',       msg: 'Lowercase letters only',      msgColor: 'text/inactive' },
};
const SIZE_ORDER = ['tiny', 'regular', 'large'], STATE_ORDER = ['default', 'focus', 'error', 'disabled'];

const variants = [];
for (const size of SIZE_ORDER) for (const state of STATE_ORDER) {
  const sz = SIZES[size], st = STATES[state];
  const c = figma.createComponent();
  c.name = 'Size=' + size + ', State=' + state;
  c.layoutMode = 'VERTICAL'; c.resize(240, 10);
  c.layoutSizingHorizontal = 'FIXED'; c.layoutSizingVertical = 'HUG';
  c.setBoundVariable('itemSpacing', num('space/5')); c.fills = [];

  const label = figma.createText(); label.name = 'Label'; label.characters = 'Tenant name';
  await label.setTextStyleIdAsync(style('Heading/H6').id);
  label.fills = [paint(state === 'disabled' ? 'text/inactive' : 'text/default')];
  c.appendChild(label); label.layoutSizingHorizontal = 'FILL';

  const field = figma.createFrame(); field.name = 'Field'; field.layoutMode = 'HORIZONTAL'; field.counterAxisAlignItems = 'CENTER';
  field.fills = [paint(st.bg)]; field.strokes = [paint(st.border)]; field.strokeWeight = 1;
  field.setBoundVariable('paddingLeft', num(sz.pad)); field.setBoundVariable('paddingRight', num(sz.pad));
  bindRadius(field, 'radius/4');
  c.appendChild(field); field.layoutSizingHorizontal = 'FILL'; field.layoutSizingVertical = 'FIXED';
  field.setBoundVariable('height', num(sz.h));

  const value = figma.createText(); value.name = 'Value'; value.characters = state === 'disabled' ? '—' : 'acme-prod';
  await value.setTextStyleIdAsync(style(size === 'tiny' ? 'Body/Meta' : 'Body/Default').id); value.fills = [paint(st.value)];
  field.appendChild(value); value.layoutSizingHorizontal = 'FILL';

  const msg = figma.createText(); msg.name = 'Message'; msg.characters = st.msg;
  await msg.setTextStyleIdAsync(style('Body/Meta').id); msg.fills = [paint(st.msgColor)];
  c.appendChild(msg); msg.layoutSizingHorizontal = 'FILL';
  variants.push(c);
}

const set = figma.combineAsVariants(variants, page);
set.name = SET; set.x = 0; set.y = 0;
grid(set, p => [STATE_ORDER.indexOf(p.State), SIZE_ORDER.indexOf(p.Size)], 280, 120, 32);
set.resize(32 * 2 + 280 * 4, 32 * 2 + 120 * 3);

return { created: SET, variants: variants.length, setId: set.id };
