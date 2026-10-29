// @page Toast
// @set  Toast
// Toast — 3 variants (Severity: success / info / warning, the only three a toast may carry) +
// "Description" and "Action" booleans. Each variant keeps its own title in a text layer named
// "Title", overridden on the instance — no TEXT component property: Figma holds one default per TEXT
// property for the whole set, and the three variants are titled differently (the
// text-property-collapse lint fails a builder that binds differing texts). One toast only: the region, the
// placement, the stack, the timer, F6 and Escape are code (toast.md, Figma mapping). No shadow: no
// elevation token exists, so the border/default stroke is the edge, as on the Popover.
//
// Layers. `Status mark / <severity>` is the Contextual Alert's mark box — icon/20 wide by
// line-height/body tall, so the mark sits on the title's line — holding `Shape / <severity>` at
// icon/16 in severity/<severity>/icon: a circle for success and info, a triangle for warning. The
// simple shapes stay until Vela has an icon set; production uses lib/icons.tsx. `Content` stacks
// `Message` (Title and Description, space/5 apart) and the `Action`, space/10 apart. The action is
// drawn from the standard button tokens at control-height/24 (a builder cannot depend on the Button
// set existing). `Close` is the Dialog's close button: control-height/24 square, an icon/strong ×.

const SEV = ['success', 'info', 'warning'];
const COPY = {
  success: ['Policy saved', 'Block legacy TLS now applies to 14 tenants.'],
  info: ['Export started', 'Find it in Reports when it finishes.'],
  warning: ['Policy saved with 2 rules skipped', 'Both duplicated a rule already in the policy.'],
};
const frame = (name, mode) => { const f = figma.createFrame(); f.name = name; f.fills = []; f.layoutMode = mode; return f; };

const variants = [];
for (const sev of SEV) {
  const c = figma.createComponent();
  c.name = 'Severity=' + sev;
  c.layoutMode = 'HORIZONTAL'; c.primaryAxisAlignItems = 'MIN'; c.counterAxisAlignItems = 'MIN';
  c.layoutSizingHorizontal = 'FIXED'; c.layoutSizingVertical = 'HUG';
  c.setBoundVariable('width', num('toast/width'));
  c.setBoundVariable('itemSpacing', num('space/10'));
  for (const p of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']) c.setBoundVariable(p, num('space/15'));
  c.fills = [paint('surface/raised')];
  c.strokes = [paint('border/default')]; c.strokeWeight = 1; c.strokeAlign = 'INSIDE';
  bindRadius(c, 'radius/4');

  // The severity mark, on the title's line.
  const mark = frame('Status mark / ' + sev, 'HORIZONTAL'); mark.clipsContent = false;
  mark.primaryAxisAlignItems = 'CENTER'; mark.counterAxisAlignItems = 'CENTER';
  c.appendChild(mark);
  mark.layoutSizingHorizontal = 'FIXED'; mark.layoutSizingVertical = 'FIXED';
  mark.setBoundVariable('width', num('icon/20')); mark.setBoundVariable('height', num('line-height/body'));
  const shape = sev === 'warning' ? figma.createPolygon() : figma.createEllipse();
  if (sev === 'warning') shape.pointCount = 3;
  shape.name = 'Shape / ' + sev; shape.fills = [paint('severity/' + sev + '/icon')];
  mark.appendChild(shape); shape.layoutSizingHorizontal = 'FIXED'; shape.layoutSizingVertical = 'FIXED';
  shape.setBoundVariable('width', num('icon/16')); shape.setBoundVariable('height', num('icon/16'));

  // Content: the text, then the action.
  const content = frame('Content', 'VERTICAL');
  content.primaryAxisAlignItems = 'MIN'; content.counterAxisAlignItems = 'MIN';
  content.setBoundVariable('itemSpacing', num('space/10'));
  c.appendChild(content); content.layoutSizingHorizontal = 'FILL'; content.layoutSizingVertical = 'HUG';

  const text = frame('Message', 'VERTICAL');
  text.setBoundVariable('itemSpacing', num('space/5'));
  content.appendChild(text); text.layoutSizingHorizontal = 'FILL'; text.layoutSizingVertical = 'HUG';
  const [t, d] = COPY[sev];
  const title = figma.createText(); title.name = 'Title'; title.characters = t;
  await title.setTextStyleIdAsync(style('Heading/H5').id); title.fills = [paint('text/heading')];
  text.appendChild(title); title.textAutoResize = 'HEIGHT'; title.layoutSizingHorizontal = 'FILL';
  const desc = figma.createText(); desc.name = 'Description'; desc.characters = d;
  await desc.setTextStyleIdAsync(style('Body/Default').id); desc.fills = [paint('text/default')];
  text.appendChild(desc); desc.textAutoResize = 'HEIGHT'; desc.layoutSizingHorizontal = 'FILL';

  const action = frame('Action', 'HORIZONTAL');
  action.primaryAxisAlignItems = 'CENTER'; action.counterAxisAlignItems = 'CENTER';
  action.setBoundVariable('paddingLeft', num('space/10')); action.setBoundVariable('paddingRight', num('space/10'));
  action.fills = [paint('button/standard-bg')];
  action.strokes = [paint('button/standard-border')]; action.strokeWeight = 1; action.strokeAlign = 'INSIDE';
  bindRadius(action, 'radius/4');
  const label = figma.createText(); label.name = 'Label'; label.characters = sev === 'success' ? 'Undo' : 'View';
  await label.setTextStyleIdAsync(style('Button/Tiny').id); label.fills = [paint('button/standard-text')];
  action.appendChild(label);
  content.appendChild(action);
  action.layoutSizingHorizontal = 'HUG'; action.layoutSizingVertical = 'FIXED';
  action.setBoundVariable('height', num('control-height/24'));

  // The close button: control-height/24 square, radius/3, an × of two bars in icon/strong.
  const close = frame('Close', 'HORIZONTAL');
  close.primaryAxisAlignItems = 'CENTER'; close.counterAxisAlignItems = 'CENTER'; close.clipsContent = false;
  bindRadius(close, 'radius/3');
  c.appendChild(close);
  close.layoutSizingHorizontal = 'FIXED'; close.layoutSizingVertical = 'FIXED';
  close.setBoundVariable('width', num('control-height/24')); close.setBoundVariable('height', num('control-height/24'));
  const arm = 11, bar = 1.5;
  const h = figma.createRectangle(); h.name = 'bar-h'; h.resize(arm, bar); h.x = 0; h.y = (arm - bar) / 2; h.fills = [paint('icon/strong')];
  const v = figma.createRectangle(); v.name = 'bar-v'; v.resize(bar, arm); v.x = (arm - bar) / 2; v.y = 0; v.fills = [paint('icon/strong')];
  const glyph = figma.union([h, v], close); glyph.name = 'Glyph / close'; glyph.fills = [paint('icon/strong')];
  glyph.rotation = 45;
  glyph.layoutSizingHorizontal = 'FIXED'; glyph.layoutSizingVertical = 'FIXED';
  variants.push(c);
}

const set = figma.combineAsVariants(variants, page);
set.name = SET; set.x = 0; set.y = 0;
grid(set, p => [0, SEV.indexOf(p.Severity)], 360, 150, 32);
set.resize(32 * 2 + 360, 32 * 2 + 150 * SEV.length);

const descProp = set.addComponentProperty('Description', 'BOOLEAN', true);
const actionProp = set.addComponentProperty('Action', 'BOOLEAN', false);
for (const v of set.children) {
  const d = v.findOne(n => n.name === 'Description'); if (d) d.componentPropertyReferences = { visible: descProp };
  const a = v.findOne(n => n.name === 'Action'); if (a) a.componentPropertyReferences = { visible: actionProp };
}

return { created: SET, variants: variants.length, setId: set.id };
