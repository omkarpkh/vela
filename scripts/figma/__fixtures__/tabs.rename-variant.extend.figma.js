// @extends tabs
// @adds Note / renamed
// A fixture, not an extension: it renames a variant the published Tab set has. Instances of
// "State=disabled, Size=large" in other files would lose their variant. The --extend snapshot must stop it.
// src/styles/figma-components.test.ts lints it and expects the run to fail.

const note = figma.createFrame(); note.name = 'Note / renamed'; note.fills = [];
page.appendChild(note);
set.children.find(v => v.name === 'State=disabled, Size=large').name = 'State=inactive, Size=large';
return {};
