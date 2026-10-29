// @page Changelog
// Changelog — one card per released version, newest first, compiled from CHANGELOG.md by
// build-pages.mjs (DATA). No card for Unreleased. Each card: the version (H3), a Meta line with
// the date and whether the version is on npm, then per Keep-a-Changelog section an H6 heading
// and its bullets — each bullet's bold lead-in, word for word — and a link to the full entry.
// The stamp at the bottom says which commit the page was read from.
//
// Idempotent: pageFrame() finds the "Changelog" frame (live id 115:2) and rebuilds its children
// in place, so the frame and its id survive; it creates the frame only when there is none.
// Every text binds a text style and every fill and stroke a colour variable; every gap, padding
// and radius binds a token. No components on a doc page.

const W = pageFrame('Changelog');
await txt(W, 'Changelog', 'Heading/H1', 'text/heading');
await txt(W, DATA.intro, 'Body/Default', 'text/de-emphasized');

for (const r of DATA.releases) {
  const card = box(W, r.version, { fill: 'surface/container', stroke: 'border/subtle', r: 'radius/4', padY: 'space/20', padX: 'space/20', gap: 'space/15' });
  const head = box(card, 'Header', { gap: 'space/5' });
  await txt(head, r.version, 'Heading/H3', 'text/heading');
  await txt(head, r.date + ' · ' + (r.onNpm ? 'On npm' : 'Not on npm'), 'Body/Meta', 'text/de-emphasized');
  for (const s of r.sections) {
    const sec = box(card, s.name, { gap: 'space/5' });
    await txt(sec, s.name, 'Heading/H6', 'text/heading');
    await txt(sec, s.leads.join('\n'), 'Body/Default', 'text/default', { list: true });
  }
  await txt(card, 'Full entry: CHANGELOG.md', 'Body/Link', 'text/link', { hug: true, link: r.link });
}

await txt(W, DATA.stamp, 'Body/Meta', 'text/de-emphasized');
return { frameId: W.id, reused: REUSED, releases: DATA.releases.length, height: Math.round(W.height) };
