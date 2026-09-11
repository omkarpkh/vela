// @page Status Indicator
// @set  Status Indicator
// Status Indicator — 10 variants (5 statuses × 2 sizes) + Label boolean.
// Dot fill binds the STATUS taxonomy only — never severity, never risk.
// Dot diameters are literal here and in the CSS: a known, recorded token gap.

const STATUS = ['unknown', 'healthy', 'warning', 'medium', 'unhealthy'];
const LABELS = { unknown: 'Status unknown', healthy: 'Healthy', warning: 'Warning', medium: 'Degraded', unhealthy: 'Unhealthy' };
const variants = [];
for (const status of STATUS) for (const size of ['regular', 'small']) {
  const dia = size === 'regular' ? 10 : 8;
  const c = figma.createComponent();
  c.name = 'Status=' + status + ', Size=' + size;
  c.layoutMode = 'HORIZONTAL'; c.counterAxisAlignItems = 'CENTER';
  c.layoutSizingHorizontal = 'HUG'; c.layoutSizingVertical = 'HUG';
  c.setBoundVariable('itemSpacing', num('space/5')); c.fills = [];

  const dot = figma.createEllipse(); dot.name = 'Dot'; dot.resize(dia, dia);
  dot.fills = [paint('status/' + status)];
  c.appendChild(dot); dot.layoutSizingHorizontal = 'FIXED'; dot.layoutSizingVertical = 'FIXED';

  const label = figma.createText(); label.name = 'Label'; label.characters = LABELS[status];
  await label.setTextStyleIdAsync(style('Body/Meta').id); label.fills = [paint('text/default')];
  c.appendChild(label); label.layoutSizingHorizontal = 'HUG';
  variants.push(c);
}

const set = figma.combineAsVariants(variants, page);
set.name = SET; set.x = 0; set.y = 0;
grid(set, p => [STATUS.indexOf(p.Status), p.Size === 'regular' ? 0 : 1], 170, 48, 32);
set.resize(32 * 2 + 170 * 5, 32 * 2 + 48 * 2);

const labelKey = set.addComponentProperty('Label', 'BOOLEAN', true);
for (const v of set.children) { const l = v.findOne(n => n.name === 'Label'); if (l) l.componentPropertyReferences = { visible: labelKey }; }

return { created: SET, variants: variants.length, setId: set.id };
