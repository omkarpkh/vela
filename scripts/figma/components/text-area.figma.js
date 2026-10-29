// @page Text Area
// @set  Text Area
// Text Area — 12 variants (Size × State), Input's grid. Label, field, the hint row with the
// count, and (error) the message travel together because the code component renders them
// together. The field HUGS three lines of text — rows=3, the default — so nothing in it is a
// fixed size: padding binds space/*, the radius binds radius/4, every colour is Input's.
// As in Input: resize() BEFORE the HUG sizing mode, which resize would otherwise reset.

const SIZES = {
  tiny:    { padY: 'space/5',  padX: 'space/5',  text: 'Body/Meta' },
  regular: { padY: 'space/5',  padX: 'space/10', text: 'Body/Default' },
  large:   { padY: 'space/10', padX: 'space/10', text: 'Body/Default' },
};
const VALUE = 'Blocking the transfer: the\ndestination bucket is public\nand holds customer records.';
const STATES = {
  default:  { border: 'control/border',        bg: 'control/bg',          value: 'control/placeholder', chars: 'Why is this action needed?\n\n', count: '0 / 280',  meta: 'text/de-emphasized', label: 'text/default' },
  focus:    { border: 'control/border-active', bg: 'control/bg',          value: 'text/default',        chars: VALUE,                           count: '82 / 280', meta: 'text/de-emphasized', label: 'text/default' },
  error:    { border: 'control/border-error',  bg: 'control/bg',          value: 'text/default',        chars: VALUE,                           count: '82 / 280', meta: 'text/de-emphasized', label: 'text/default', error: 'Name the policy this transfer breaks' },
  disabled: { border: 'border/inactive',       bg: 'control/bg-disabled', value: 'text/inactive',       chars: VALUE,                           count: '82 / 280', meta: 'text/inactive',      label: 'text/inactive' },
};
const SIZE_ORDER = ['tiny', 'regular', 'large'], STATE_ORDER = ['default', 'focus', 'error', 'disabled'];

const text = async (name, chars, styleName, colour) => {
  const t = figma.createText(); t.name = name; t.characters = chars;
  await t.setTextStyleIdAsync(style(styleName).id); t.fills = [paint(colour)];
  return t;
};

const variants = [];
for (const size of SIZE_ORDER) for (const state of STATE_ORDER) {
  const sz = SIZES[size], st = STATES[state];
  const c = figma.createComponent();
  c.name = 'Size=' + size + ', State=' + state;
  c.layoutMode = 'VERTICAL'; c.resize(240, 10);
  c.layoutSizingHorizontal = 'FIXED'; c.layoutSizingVertical = 'HUG';
  c.setBoundVariable('itemSpacing', num('space/5')); c.fills = [];

  const label = await text('Label', 'Justification', 'Heading/H6', st.label);
  c.appendChild(label); label.layoutSizingHorizontal = 'FILL';

  const field = figma.createFrame(); field.name = 'Field'; field.layoutMode = 'VERTICAL';
  field.fills = [paint(st.bg)]; field.strokes = [paint(st.border)]; field.strokeWeight = 1;
  for (const side of ['paddingTop', 'paddingBottom']) field.setBoundVariable(side, num(sz.padY));
  for (const side of ['paddingLeft', 'paddingRight']) field.setBoundVariable(side, num(sz.padX));
  bindRadius(field, 'radius/4');
  c.appendChild(field); field.layoutSizingHorizontal = 'FILL'; field.layoutSizingVertical = 'HUG';

  const value = await text('Value', st.chars, sz.text, st.value);
  field.appendChild(value); value.layoutSizingHorizontal = 'FILL';

  const footer = figma.createFrame(); footer.name = 'Hint row'; footer.layoutMode = 'HORIZONTAL';
  footer.setBoundVariable('itemSpacing', num('space/10')); footer.fills = [];
  c.appendChild(footer); footer.layoutSizingHorizontal = 'FILL'; footer.layoutSizingVertical = 'HUG';
  const hint = await text('Hint', 'Shown to the approver', 'Body/Meta', st.meta);
  footer.appendChild(hint); hint.layoutSizingHorizontal = 'FILL';
  const count = await text('Count', st.count, 'Body/Meta', st.meta);
  footer.appendChild(count); count.textAlignHorizontal = 'RIGHT';

  if (st.error) {
    const msg = await text('Error', st.error, 'Body/Meta', 'text/error');
    c.appendChild(msg); msg.layoutSizingHorizontal = 'FILL';
  }
  variants.push(c);
}

const set = figma.combineAsVariants(variants, page);
set.name = SET; set.x = 0; set.y = 0;
grid(set, p => [STATE_ORDER.indexOf(p.State), SIZE_ORDER.indexOf(p.Size)], 280, 180, 32);
set.resize(32 * 2 + 280 * 4, 32 * 2 + 180 * 3);

return { created: SET, variants: variants.length, setId: set.id };
