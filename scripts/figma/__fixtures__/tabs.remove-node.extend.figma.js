// @extends tabs
// @adds Note / removed
// A fixture, not an extension: it removes the Count layer from a published Tab variant. Instances
// that override it would lose the override. The --extend snapshot must stop it.
// src/styles/figma-components.test.ts lints it and expects the run to fail.

const note = figma.createFrame(); note.name = 'Note / removed'; note.fills = [];
page.appendChild(note);
set.children.find(v => v.name === 'State=selected, Size=default').findOne(n => n.name === 'Count').remove();
return {};
