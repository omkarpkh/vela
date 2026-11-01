// @page Tabs
// @set  Tabs overflow control
// @uses icon
// Tabs overflow control: the "N more" control the headless Tabs draws at the end of its row when
// tabs are hidden (guidelines/components/tabs.md, Overflow; decided 30 Oct 2026). Headless only, and
// a part, not an export: Tabs draws it, no one imports it (SETS kind: 'part' in
// scripts/sync-figma-descriptions.mjs). Written 1 Nov 2026 and not yet run: the Figma thread builds
// it later, from this file, on the Tabs page beside the Tab set.
//
// 3 variants, State default / hover / open. It looks like an unselected Tab: the same Tab/Default
// type and the same box, space/10 above and below and a clear 2px bottom stroke, so its words sit on
// the tabs' baseline; then space/5 and Icon's chevron-down, which never turns. Default is
// text/de-emphasized; hover and open are text/default (hover has no Seed: it opens a list, not a
// tab). The chevron's strokes follow the words. The news, "· 1 new", is Tab/Count (semibold) in
// text/default, behind the News boolean; Count text and News text carry the words, the same in every
// variant (the text-property-collapse lint). The count and the news are measured in code; here they
// are words the designer writes. The list it opens is an instance of the Dropdown List set. Pressed
// (scale 0.97) and the forced-colours treatment exist only in code.

const STATES = { default: 'text/de-emphasized', hover: 'text/default', open: 'text/default' };
const ORDER = Object.keys(STATES);

const variants = [];
for (const state of ORDER) {
  const ink = STATES[state];
  const c = figma.createComponent();
  c.name = 'State=' + state;
  c.layoutMode = 'HORIZONTAL'; c.counterAxisAlignItems = 'CENTER'; c.fills = [];
  c.setBoundVariable('itemSpacing', num('space/5'));
  c.setBoundVariable('paddingTop', num('space/10')); c.setBoundVariable('paddingBottom', num('space/10'));
  // The clear bottom border of an unselected tab: no paint, the same 2px weight.
  c.strokes = []; c.strokeAlign = 'INSIDE';
  c.strokeTopWeight = 0; c.strokeLeftWeight = 0; c.strokeRightWeight = 0; c.strokeBottomWeight = 2;

  // The words: the count, then the news inline, as one line.
  const words = figma.createFrame(); words.name = 'Words'; words.fills = []; words.clipsContent = false;
  words.layoutMode = 'HORIZONTAL'; words.counterAxisAlignItems = 'BASELINE';
  c.appendChild(words);
  words.layoutSizingHorizontal = 'HUG'; words.layoutSizingVertical = 'HUG';

  const count = figma.createText(); count.name = 'Count'; count.characters = '6 more';
  await count.setTextStyleIdAsync(style('Tab/Default').id); count.fills = [paint(ink)];
  words.appendChild(count); count.layoutSizingHorizontal = 'HUG';

  const news = figma.createText(); news.name = 'News'; news.characters = ' · 1 new';
  await news.setTextStyleIdAsync(style('Tab/Count').id); news.fills = [paint('text/default')];
  words.appendChild(news); news.layoutSizingHorizontal = 'HUG';

  const chevron = await instanceOf('Icon', 'Glyph=chevron-down'); chevron.name = 'Chevron';
  c.appendChild(chevron);
  for (const v of chevron.findAll(n => n.type === 'VECTOR')) v.strokes = [paint(ink)];

  c.layoutSizingHorizontal = 'HUG'; c.layoutSizingVertical = 'HUG';
  variants.push(c);
}

const set = figma.combineAsVariants(variants, page);
set.name = SET; set.x = 0;
// Below the Tab set on the same page, when it is there.
const tabSet = page.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Tab');
set.y = tabSet ? tabSet.y + tabSet.height + 96 : 0;
grid(set, p => [ORDER.indexOf(p.State), 0], 200, 72, 32);
set.resize(32 * 2 + 200 * 3, 32 * 2 + 72);

const countProp = set.addComponentProperty('Count text', 'TEXT', '6 more');
const newsTextProp = set.addComponentProperty('News text', 'TEXT', ' · 1 new');
const newsProp = set.addComponentProperty('News', 'BOOLEAN', false);
for (const v of set.children) {
  v.findOne(n => n.name === 'Count').componentPropertyReferences = { characters: countProp };
  const n = v.findOne(n => n.name === 'News');
  n.componentPropertyReferences = { characters: newsTextProp, visible: newsProp };
  n.visible = false;
}

return { created: SET, variants: variants.length, setId: set.id };
