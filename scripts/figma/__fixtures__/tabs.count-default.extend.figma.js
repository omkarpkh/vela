// @extends tabs
// @adds Note / count off
// A fixture, not an extension: it turns the published Tab set's Count default off. Every Tab
// instance that never set Count would lose its count. The --extend snapshot must stop it.
// src/styles/figma-components.test.ts lints it and expects the run to fail.

const note = figma.createFrame(); note.name = 'Note / count off'; note.fills = [];
page.appendChild(note);
set.editComponentProperty(propKey(set, 'Count'), { defaultValue: false });
return {};
