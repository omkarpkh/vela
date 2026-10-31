// @extends dropdown-list
// @adds Usage / Locked
// Usage / Locked — a documentation frame beside the popup: one locked item with its reason in Meta,
// captioned. A Figma property has one default for the whole set, so the set can't make Meta default
// on for locked variants alone (tested by the Figma thread on a copy, 31 Oct 2026); this frame shows
// the rule on the canvas instead. It is documentation, not part of the set: no key or property
// changes. The first extension (R18): it was in the builder, and moved here unchanged.

const popup = setsByName['Dropdown List'];
const usage = figma.createFrame(); usage.name = 'Usage / Locked';
usage.layoutMode = 'VERTICAL'; usage.layoutSizingHorizontal = 'FIXED'; usage.layoutSizingVertical = 'HUG';
usage.setBoundVariable('width', num('popover/width'));
usage.setBoundVariable('itemSpacing', num('space/5'));
for (const p of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']) usage.setBoundVariable(p, num('space/5'));
usage.fills = [];
page.appendChild(usage);
usage.x = popup.x; usage.y = popup.y + popup.height + 48;
const usageItem = set.children.find(v => v.name === 'Highlighted=false, Current=false, Locked=true').createInstance();
usageItem.name = 'Item / Archive, locked';
usage.appendChild(usageItem);
usageItem.setProperties({ [propKey(set, 'Label')]: 'Archive', [propKey(set, 'Meta')]: true, [propKey(set, 'Meta text')]: 'Needs retention on' });
usageItem.layoutSizingHorizontal = 'FILL'; usageItem.layoutSizingVertical = 'HUG';
const caption = figma.createText(); caption.name = 'Caption'; caption.characters = 'Locked: always with its reason in Meta. The lock never appears without it.';
await caption.setTextStyleIdAsync(style('Body/Default').id); caption.fills = [paint('text/default')];
usage.appendChild(caption); caption.textAutoResize = 'HEIGHT'; caption.layoutSizingHorizontal = 'FILL';

return { usage: usage.id };
