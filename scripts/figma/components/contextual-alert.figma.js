// @page Contextual Alert
// @set  Contextual Alert
// Contextual Alert — 6 severity variants + Dismissible boolean. Every fill, border,
// icon and text binds that severity's own token row; the taxonomies never cross.
// Icons are placeholder glyphs (circle / triangle / octagon); production uses lib/icons.tsx.

const SEV = ['success', 'info', 'warning', 'minor', 'major', 'critical'];
const COPY = {
  success:  ['Success', 'Policy applied to 42 assets.'],
  info:     ['Info', 'Scan scheduled for 02:00 UTC.'],
  warning:  ['Warning', 'Two connectors need reauthentication.'],
  minor:    ['Minor', 'Three assets are responding slowly.'],
  major:    ['Major', 'Scan failed. Three assets could not be reached.'],
  critical: ['Critical', 'Data loss detected. Cannot be dismissed.'],
};
const shapeFor = s => s === 'critical' ? 'octagon' : (['warning', 'minor', 'major'].includes(s) ? 'triangle' : 'circle');

const variants = [];
for (const sev of SEV) {
  const c = figma.createComponent();
  c.name = 'Severity=' + sev;
  c.layoutMode = 'HORIZONTAL'; c.counterAxisAlignItems = 'MIN'; c.resize(440, 10);
  c.layoutSizingHorizontal = 'FIXED'; c.layoutSizingVertical = 'HUG';
  c.setBoundVariable('itemSpacing', num('space/10'));
  c.setBoundVariable('paddingLeft', num('space/15')); c.setBoundVariable('paddingRight', num('space/15'));
  c.setBoundVariable('paddingTop', num('space/10')); c.setBoundVariable('paddingBottom', num('space/10'));
  bindRadius(c, 'radius/4');
  c.fills = [paint('severity/' + sev + '/bg')]; c.strokes = [paint('severity/' + sev + '/border')]; c.strokeWeight = 1;

  const kind = shapeFor(sev);
  const icon = kind === 'circle' ? figma.createEllipse() : figma.createPolygon();
  if (kind === 'triangle') icon.pointCount = 3; if (kind === 'octagon') icon.pointCount = 8;
  icon.name = 'Icon'; icon.resize(16, 16); icon.fills = [paint('severity/' + sev + '/icon')];
  c.appendChild(icon); icon.layoutSizingHorizontal = 'FIXED'; icon.layoutSizingVertical = 'FIXED'; icon.y = 2;

  const body = figma.createFrame(); body.name = 'Body'; body.layoutMode = 'VERTICAL'; body.fills = []; body.itemSpacing = 2;
  c.appendChild(body); body.layoutSizingHorizontal = 'FILL'; body.layoutSizingVertical = 'HUG';

  const [t, m] = COPY[sev];
  const title = figma.createText(); title.name = 'Title'; title.characters = t;
  await title.setTextStyleIdAsync(style('Heading/H5').id); title.fills = [paint('severity/' + sev + '/text')];
  body.appendChild(title); title.layoutSizingHorizontal = 'FILL';
  const msg = figma.createText(); msg.name = 'Message'; msg.characters = m;
  await msg.setTextStyleIdAsync(style('Body/Default').id); msg.fills = [paint('severity/' + sev + '/text')];
  body.appendChild(msg); msg.layoutSizingHorizontal = 'FILL';

  const x = figma.createText(); x.name = 'Dismiss'; x.characters = '×';
  x.fontName = { family: 'Open Sans', style: 'Regular' }; x.fontSize = 18; x.textAlignHorizontal = 'CENTER';
  x.fills = [paint('severity/' + sev + '/text')];
  c.appendChild(x); x.layoutSizingHorizontal = 'HUG'; x.layoutSizingVertical = 'HUG';
  variants.push(c);
}

const set = figma.combineAsVariants(variants, page);
set.name = SET; set.x = 0; set.y = 0;
grid(set, p => [0, SEV.indexOf(p.Severity)], 440, 104, 32);
set.resize(32 * 2 + 440, 32 * 2 + 104 * SEV.length);

const dKey = set.addComponentProperty('Dismissible', 'BOOLEAN', true);
for (const v of set.children) { const d = v.findOne(n => n.name === 'Dismiss'); if (d) d.componentPropertyReferences = { visible: dKey }; }

return { created: SET, variants: variants.length, setId: set.id };
