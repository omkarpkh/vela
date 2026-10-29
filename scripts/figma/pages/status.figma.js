// @page Status
// @allow raw-size the Label column's cell is the table's 120 column width; columns have no token (the thread's COLS)
// Status — the component lifecycle table, compiled by build-pages.mjs (DATA) from the specs,
// GOVERNANCE.md, the playground registry, src/index.ts and CHANGELOG.md. The legend states the
// four GOVERNANCE.md labels in its own words. A label is a neutral outlined chip — border/default
// on no fill, radius/3, Body/Meta — never a taxonomy colour: a lifecycle label is not a severity,
// a risk or a status. One table row per component, in registry order: Component, Label (the
// spec's **Status:** line, Approved when absent), Figma set, React export, Since, Spec.
// The stamp at the bottom says which commit the page was read from.
//
// Idempotent: pageFrame() finds the "Status" frame (live id 115:114) and rebuilds its children
// in place, so the frame and its id survive; it creates the frame only when there is none.
// Every text binds a text style and every fill and stroke a colour variable; every gap, padding
// and radius binds a token. The column widths are the thread's (they sum, with the gaps, to the
// frame's 960 inner width). No components on a doc page.

const COLS = [['Component', 150], ['Label', 120], ['Figma set', 220], ['React export', 200], ['Since', 80], ['Spec', 140]];
const chip = async (parent, label) => {
  const cell = box(parent, 'label', { dir: 'HORIZONTAL', gap: 'space/5', fillW: false });
  cell.resize(120, cell.height); cell.layoutSizingHorizontal = 'FIXED'; cell.layoutSizingVertical = 'HUG';
  const c = box(cell, 'chip', { dir: 'HORIZONTAL', stroke: 'border/default', r: 'radius/3', padY: 'space/5', padX: 'space/10', gap: 'space/5', fillW: false });
  await txt(c, label, 'Body/Meta', 'text/default', { hug: true });
  return cell;
};

const W = pageFrame('Status');
await txt(W, 'Status', 'Heading/H1', 'text/heading');
await txt(W, DATA.intro, 'Body/Default', 'text/de-emphasized');

const legend = box(W, 'Legend', { fill: 'surface/container', stroke: 'border/subtle', r: 'radius/4', padY: 'space/20', padX: 'space/20', gap: 'space/15' });
await txt(legend, 'The four labels', 'Heading/H5', 'text/heading');
for (const l of DATA.legend) {
  const row = box(legend, l.label, { dir: 'HORIZONTAL', gap: 'space/20' }); row.counterAxisAlignItems = 'MIN';
  await chip(row, l.label);
  await txt(row, l.text, 'Body/Default', 'text/default');
}
await txt(legend, DATA.legendNote, 'Body/Meta', 'text/de-emphasized');

const table = box(W, 'Table', { gap: 0 });
const line = (name) => {
  const r = box(table, name, { dir: 'HORIZONTAL', gap: 'space/10', padY: 'space/10', stroke: 'border/subtle' });
  r.strokeTopWeight = 0; r.strokeLeftWeight = 0; r.strokeRightWeight = 0; r.strokeBottomWeight = 1; r.counterAxisAlignItems = 'CENTER';
  return r;
};
const head = line('Header');
// Named, because a text layer named after its characters would be called "Component".
for (const [h, w] of COLS) (await txt(head, h, 'Heading/H6', 'text/heading', { w })).name = 'Column / ' + h;
for (const r of DATA.rows) {
  const row = line(r.name);
  await txt(row, r.name, 'Body/Default', 'text/heading', { w: COLS[0][1] });
  await chip(row, r.label);
  await txt(row, r.figmaSet, 'Body/Default', 'text/default', { w: COLS[2][1] });
  await txt(row, r.reactExport, 'Body/Default', 'text/default', { w: COLS[3][1] });
  await txt(row, r.since, 'Body/Default', 'text/default', { w: COLS[4][1] });
  await txt(row, r.spec.text, 'Body/Link', 'text/link', { w: COLS[5][1], link: r.spec.url });
}

await txt(W, DATA.stamp, 'Body/Meta', 'text/de-emphasized');
await txt(W, 'GOVERNANCE.md', 'Body/Link', 'text/link', { hug: true, link: DATA.governance });
return { frameId: W.id, reused: REUSED, rows: DATA.rows.length, height: Math.round(W.height) };
