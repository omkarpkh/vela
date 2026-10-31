// @extends tabs
// @adds State=loading, Size=default
// A fixture, not an extension: it appends a variant, then puts it top-left, which makes it the set's
// default variant: every Tab dragged in from the library would arrive as "loading". The --extend
// snapshot must stop it. src/styles/figma-components.test.ts lints it and expects the run to fail.

const t = figma.createComponent();
t.name = 'State=loading, Size=default';
t.layoutMode = 'HORIZONTAL'; t.counterAxisAlignItems = 'CENTER'; t.fills = [];
t.setBoundVariable('itemSpacing', num('space/5'));
const label = figma.createText(); label.name = 'Label'; label.characters = 'Alerts';
await label.setTextStyleIdAsync(style('Tab/Default').id); label.fills = [paint('text/inactive')];
t.appendChild(label); label.layoutSizingHorizontal = 'HUG';
appendVariant(set, t);
t.x = 0; t.y = 0;
return {};
