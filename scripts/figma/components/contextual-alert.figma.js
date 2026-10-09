// @page Contextual Alert
// @set  Contextual Alert
// Contextual Alert — 6 severity variants + Dismissible boolean. Every fill, border, mark and
// text binds that severity's own token row; the taxonomies never cross.
//
// Layers, as the library has them. `Status mark / <severity>` is a centred auto-layout box,
// icon/20 wide by line-height/body tall so the mark sits on the first line of text, holding
// `Shape / <severity>` at icon/16: a circle (success, info), a triangle (warning, minor, major)
// or an octagon (critical). The simple shapes stay until Vela has an icon set; production uses
// lib/icons.tsx. `Content` stacks Title and Message space/5 apart. `Dismiss / Close` is an
// icon/20 × line-height/body text box in Body/Default that Dismissible shows or hides — except
// on critical, where it is hidden outright: a critical alert is never dismissible.

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
  c.layoutMode = 'HORIZONTAL'; c.primaryAxisAlignItems = 'MIN'; c.counterAxisAlignItems = 'MIN'; c.resize(440, 10);
  c.layoutSizingHorizontal = 'FIXED'; c.layoutSizingVertical = 'HUG';
  c.setBoundVariable('itemSpacing', num('space/10'));
  c.setBoundVariable('paddingLeft', num('space/15')); c.setBoundVariable('paddingRight', num('space/15'));
  c.setBoundVariable('paddingTop', num('space/10')); c.setBoundVariable('paddingBottom', num('space/10'));
  bindRadius(c, 'radius/4');
  c.fills = [paint('severity/' + sev + '/bg')]; c.strokes = [paint('severity/' + sev + '/border')]; c.strokeWeight = 1;

  const mark = figma.createFrame(); mark.name = 'Status mark / ' + sev; mark.fills = []; mark.clipsContent = false;
  mark.layoutMode = 'HORIZONTAL'; mark.primaryAxisAlignItems = 'CENTER'; mark.counterAxisAlignItems = 'CENTER';
  c.appendChild(mark);
  mark.layoutSizingHorizontal = 'FIXED'; mark.layoutSizingVertical = 'FIXED';
  mark.setBoundVariable('width', num('icon/20')); mark.setBoundVariable('height', num('line-height/body'));

  const kind = shapeFor(sev);
  const shape = kind === 'circle' ? figma.createEllipse() : figma.createPolygon();
  if (kind === 'triangle') shape.pointCount = 3; if (kind === 'octagon') shape.pointCount = 8;
  shape.name = 'Shape / ' + sev; shape.fills = [paint('severity/' + sev + '/icon')];
  mark.appendChild(shape); shape.layoutSizingHorizontal = 'FIXED'; shape.layoutSizingVertical = 'FIXED';
  shape.setBoundVariable('width', num('icon/16')); shape.setBoundVariable('height', num('icon/16'));

  const content = figma.createFrame(); content.name = 'Content'; content.fills = [];
  content.layoutMode = 'VERTICAL'; content.primaryAxisAlignItems = 'MIN'; content.counterAxisAlignItems = 'MIN';
  content.setBoundVariable('itemSpacing', num('space/5'));
  c.appendChild(content); content.layoutSizingHorizontal = 'FILL'; content.layoutSizingVertical = 'HUG';

  const [t, m] = COPY[sev];
  const title = figma.createText(); title.name = 'Title'; title.characters = t; title.textAutoResize = 'HEIGHT';
  await title.setTextStyleIdAsync(style('Heading/H5').id); title.fills = [paint('severity/' + sev + '/text')];
  content.appendChild(title); title.layoutSizingHorizontal = 'FILL';
  const msg = figma.createText(); msg.name = 'Message'; msg.characters = m; msg.textAutoResize = 'HEIGHT';
  await msg.setTextStyleIdAsync(style('Body/Default').id); msg.fills = [paint('severity/' + sev + '/text')];
  content.appendChild(msg); msg.layoutSizingHorizontal = 'FILL';

  const x = figma.createText(); x.name = 'Dismiss / Close'; x.characters = '×'; x.textAlignHorizontal = 'CENTER';
  await x.setTextStyleIdAsync(style('Body/Default').id); x.fills = [paint('severity/' + sev + '/text')];
  x.textAutoResize = 'NONE'; x.resize(20, 21);
  c.appendChild(x); x.layoutSizingHorizontal = 'FIXED'; x.layoutSizingVertical = 'FIXED';
  x.setBoundVariable('width', num('icon/20')); x.setBoundVariable('height', num('line-height/body'));
  if (sev === 'critical') x.visible = false;
  variants.push(c);
}

const set = figma.combineAsVariants(variants, page);
set.name = SET; set.x = 0; set.y = 0;
grid(set, p => [0, SEV.indexOf(p.Severity)], 440, 104, 32);
set.resize(32 * 2 + 440, 32 * 2 + 104 * SEV.length);

// Critical gets no reference on purpose: its dismiss is hidden whatever the property says.
const dKey = set.addComponentProperty('Dismissible', 'BOOLEAN', true);
for (const v of set.children) {
  if (v.name === 'Severity=critical') continue;
  const d = v.findOne(n => n.name === 'Dismiss / Close'); if (d) d.componentPropertyReferences = { visible: dKey };
}

return { created: SET, variants: variants.length, setId: set.id };
