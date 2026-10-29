// @page Dialog
// @set  Dialog
// Dialog — 4 variants (Variant × Size) + a "Description" boolean. Each variant keeps its own title
// in a text layer named "Title", overridden on the instance — no TEXT component property: Figma
// holds one default per TEXT property for the whole set, and a standard dialog and an alert are
// titled differently (the text-property-collapse lint fails a builder that binds differing texts).
// The popup only: the scrim is a surface/scrim rectangle at the opacity/scrim layer opacity placed
// under an instance, and focus trapping, inertness, scroll locking and Escape are code (dialog.md).
// Header (title, description, and on `standard` the close button), Body (`standard` only), Footer.
// The footer's buttons are drawn from the Button tokens, not Button instances: a builder cannot
// depend on another set existing. `alert` fixes them — a standard cancel, a destructive confirm —
// and drops the close button and the footer rule, as the component does.

const SIZES = { regular: 'dialog/width', wide: 'dialog/width-wide' };
const BUTTONS = {
  standard: { fill: 'button/standard-bg', stroke: 'button/standard-border', text: 'button/standard-text' },
  primary: { fill: 'button/primary-bg', stroke: 'button/primary-border', text: 'button/primary-text' },
  destructive: { fill: 'button/destructive-bg', stroke: 'button/destructive-bg', text: 'button/destructive-text' },
};
const ACTIONS = {
  standard: [['Cancel', 'standard'], ['Save Changes', 'primary']],
  alert: [['Keep Policy', 'standard'], ['Delete Policy', 'destructive']],
};
const pad = (node, t, r, b, l) => {
  node.setBoundVariable('paddingTop', num(t)); node.setBoundVariable('paddingRight', num(r));
  node.setBoundVariable('paddingBottom', num(b)); node.setBoundVariable('paddingLeft', num(l));
};
const frame = (name, mode) => { const f = figma.createFrame(); f.name = name; f.fills = []; f.layoutMode = mode; return f; };

async function button(label, kind) {
  const k = BUTTONS[kind];
  const b = frame('Action / ' + label, 'HORIZONTAL');
  b.primaryAxisAlignItems = 'CENTER'; b.counterAxisAlignItems = 'CENTER';
  b.setBoundVariable('paddingLeft', num('space/15')); b.setBoundVariable('paddingRight', num('space/15'));
  b.fills = [paint(k.fill)]; b.strokes = [paint(k.stroke)]; b.strokeWeight = 1; b.strokeAlign = 'INSIDE';
  bindRadius(b, 'radius/4');
  const t = figma.createText(); t.name = 'Label'; t.characters = label;
  await t.setTextStyleIdAsync(style('Button/Regular').id); t.fills = [paint(k.text)];
  b.appendChild(t);
  return b;
}

const variants = [];
for (const variant of ['standard', 'alert']) for (const size of Object.keys(SIZES)) {
  const alert = variant === 'alert';
  const c = figma.createComponent();
  c.name = 'Variant=' + variant + ', Size=' + size;
  c.layoutMode = 'VERTICAL';
  c.layoutSizingHorizontal = 'FIXED'; c.layoutSizingVertical = 'HUG';
  c.setBoundVariable('width', num(SIZES[size]));
  c.fills = [paint('surface/raised')];
  bindRadius(c, 'radius/8');

  // Header: the heading column, and on standard the close button.
  const header = frame('Header', 'HORIZONTAL');
  header.counterAxisAlignItems = 'MIN';
  header.setBoundVariable('itemSpacing', num('space/15'));
  pad(header, 'space/20', 'space/20', 'space/10', 'space/20');
  c.appendChild(header); header.layoutSizingHorizontal = 'FILL'; header.layoutSizingVertical = 'HUG';

  const heading = frame('Heading', 'VERTICAL');
  heading.setBoundVariable('itemSpacing', num('space/5'));
  header.appendChild(heading); heading.layoutSizingHorizontal = 'FILL'; heading.layoutSizingVertical = 'HUG';
  const title = figma.createText(); title.name = 'Title';
  title.characters = alert ? 'Delete “Block legacy TLS”?' : 'Edit policy';
  await title.setTextStyleIdAsync(style('Heading/H4').id); title.fills = [paint('text/heading')];
  heading.appendChild(title); title.textAutoResize = 'HEIGHT'; title.layoutSizingHorizontal = 'FILL';
  const desc = figma.createText(); desc.name = 'Description';
  desc.characters = alert ? 'Its 14 rules stop applying at once. This cannot be undone.' : 'Changes apply to every tenant on save.';
  await desc.setTextStyleIdAsync(style('Body/Default').id); desc.fills = [paint('text/default')];
  heading.appendChild(desc); desc.textAutoResize = 'HEIGHT'; desc.layoutSizingHorizontal = 'FILL';

  if (!alert) {
    // The close button: control-height/24 square, radius/3, an × of two bars in icon/strong.
    const close = frame('Close', 'HORIZONTAL');
    close.primaryAxisAlignItems = 'CENTER'; close.counterAxisAlignItems = 'CENTER'; close.clipsContent = false;
    bindRadius(close, 'radius/3');
    header.appendChild(close);
    close.layoutSizingHorizontal = 'FIXED'; close.layoutSizingVertical = 'FIXED';
    close.setBoundVariable('width', num('control-height/24')); close.setBoundVariable('height', num('control-height/24'));
    const arm = 11, bar = 1.5;
    const h = figma.createRectangle(); h.name = 'bar-h'; h.resize(arm, bar); h.x = 0; h.y = (arm - bar) / 2; h.fills = [paint('icon/strong')];
    const v = figma.createRectangle(); v.name = 'bar-v'; v.resize(bar, arm); v.x = (arm - bar) / 2; v.y = 0; v.fills = [paint('icon/strong')];
    const glyph = figma.union([h, v], close); glyph.name = 'Glyph / close'; glyph.fills = [paint('icon/strong')];
    glyph.rotation = 45;
    glyph.layoutSizingHorizontal = 'FIXED'; glyph.layoutSizingVertical = 'FIXED';

    const body = frame('Body', 'VERTICAL');
    pad(body, 'space/10', 'space/20', 'space/10', 'space/20');
    c.appendChild(body); body.layoutSizingHorizontal = 'FILL'; body.layoutSizingVertical = 'HUG';
    const copy = figma.createText(); copy.name = 'Body text'; copy.characters = 'The body scrolls inside the dialog; the header and the footer stay.';
    await copy.setTextStyleIdAsync(style('Body/Default').id); copy.fills = [paint('text/default')];
    body.appendChild(copy); copy.textAutoResize = 'HEIGHT'; copy.layoutSizingHorizontal = 'FILL';
  }

  // Footer: the actions, right-aligned; on standard a border/subtle rule along the top only.
  const footer = frame('Footer', 'HORIZONTAL');
  footer.primaryAxisAlignItems = 'MAX'; footer.counterAxisAlignItems = 'CENTER';
  footer.setBoundVariable('itemSpacing', num('space/10'));
  pad(footer, alert ? 'space/10' : 'space/15', 'space/20', 'space/20', 'space/20');
  if (!alert) {
    footer.strokes = [paint('border/subtle')]; footer.strokeAlign = 'INSIDE';
    footer.strokeTopWeight = 1; footer.strokeRightWeight = 0; footer.strokeBottomWeight = 0; footer.strokeLeftWeight = 0;
  }
  c.appendChild(footer); footer.layoutSizingHorizontal = 'FILL'; footer.layoutSizingVertical = 'HUG';
  for (const [label, kind] of ACTIONS[variant]) {
    const b = await button(label, kind);
    footer.appendChild(b);
    b.layoutSizingHorizontal = 'HUG'; b.layoutSizingVertical = 'FIXED';
    b.setBoundVariable('height', num('control-height/35'));
  }
  variants.push(c);
}

const set = figma.combineAsVariants(variants, page);
set.name = SET; set.x = 0; set.y = 0;
grid(set, p => [p.Size === 'regular' ? 0 : 1, p.Variant === 'standard' ? 0 : 1], 780, 260, 40);
set.resize(40 * 2 + 780 * 2, 40 * 2 + 260 * 2);

const descProp = set.addComponentProperty('Description', 'BOOLEAN', true);
for (const v of set.children) {
  const d = v.findOne(n => n.name === 'Description'); if (d) d.componentPropertyReferences = { visible: descProp };
}

return { created: SET, variants: variants.length, setId: set.id };
