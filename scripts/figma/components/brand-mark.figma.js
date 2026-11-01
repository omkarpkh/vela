// @page Brand Mark
// @set  Brand Mark
// Brand Mark — 3 variants: Name (GitHub, Figma) × Size (Regular, Large), Figma at Large only
// (guidelines/components/brand-mark.md). Written 1 Nov 2026 and not yet run: the library has no
// Brand Mark set until the Figma thread builds it from this file.
//
// Each variant is a box bound to icon/size (16, `size="regular"`) or icon/size-large (20,
// `size="large"`) holding one flattened vector, `Mark / <Name>`, drawn from the owner's own file and
// scaled into the box (constraints SCALE). The fill binds brand-mark/fill — the owner's own black
// in light and white in dark — and there is no stroke. Nothing in a variant moves or carries an effect.
//
// The path data is the owners', unchanged (src/brand-marks/<name>/, with each file's source note):
//   GitHub: Primer Octicons 19.42.0 build/svg/mark-github-16.svg, MIT, Copyright (c) 2026 GitHub Inc.
//           (see NOTICE), in its own 16-unit viewBox. Used under GitHub's logo policy, to link to GitHub.
//   Figma:  Figma's own mono-line icon (figma-mono-line-black.svg); canvas cropped to the mark, viewBox
//           212 340 600 600; path and its evenodd fill rule unchanged. Used under Figma's trademark
//           guidelines, to link to Figma.
// src/styles/figma-components.test.ts fails if either path here differs from its owner file.
// @allow absolute-children a mark box holds the owner's drawn geometry; there is nothing to lay out
// @allow raw-size the mark vector's box is the owner's geometry, scaled with the icon/size box by constraints

const MARKS = {
  GitHub: { viewBox: '0 0 16 16', path: '<path d="M6.766 11.328c-2.063-.25-3.516-1.734-3.516-3.656 0-.781.281-1.625.75-2.188-.203-.515-.172-1.609.063-2.062.625-.078 1.468.25 1.968.703.594-.187 1.219-.281 1.985-.281.765 0 1.39.094 1.953.265.484-.437 1.344-.765 1.969-.687.218.422.25 1.515.046 2.047.5.593.766 1.39.766 2.203 0 1.922-1.453 3.375-3.547 3.64.531.344.89 1.094.89 1.954v1.625c0 .468.391.734.86.547C13.781 14.359 16 11.53 16 8.03 16 3.61 12.406 0 7.984 0 3.563 0 0 3.61 0 8.031a7.88 7.88 0 0 0 5.172 7.422c.422.156.828-.125.828-.547v-1.25c-.219.094-.5.156-.75.156-1.031 0-1.64-.562-2.078-1.609-.172-.422-.36-.672-.719-.719-.187-.015-.25-.093-.25-.187 0-.188.313-.328.625-.328.453 0 .844.281 1.25.86.313.452.64.655 1.031.655s.641-.14 1-.5c.266-.265.47-.5.657-.656"/>' },
  Figma: { viewBox: '212 340 600 600', path: '<path fill-rule="evenodd" d="M354.969 546.036C324.285 526.042 304 491.426 304 452.071C304 390.176 354.176 340 416.071 340H608.085C669.98 340 720.156 390.176 720.156 452.071C720.156 491.426 699.872 526.042 669.187 546.036C699.872 566.03 720.156 600.647 720.156 640.001C720.156 701.896 669.98 752.072 608.085 752.072H606.042C576.784 752.072 550.144 740.86 530.185 722.498V826.907C530.185 889.494 478.911 940 416.579 940C354.811 940 304 889.951 304 827.929C304 788.575 324.284 753.959 354.967 733.965C324.284 713.971 304 679.355 304 640.001C304 600.647 324.285 566.03 354.969 546.036ZM530.185 640.001C530.185 681.896 564.148 715.858 606.042 715.858H608.085C649.98 715.858 683.942 681.896 683.942 640.001C683.942 598.106 649.98 564.144 608.085 564.144H606.042C564.148 564.144 530.185 598.106 530.185 640.001ZM493.971 564.144H416.071C374.176 564.144 340.214 598.106 340.214 640.001C340.214 681.811 374.039 715.72 415.816 715.858L415.935 715.858L493.971 715.858V564.144ZM416.071 752.072C415.986 752.072 415.901 752.072 415.816 752.072C374.039 752.209 340.214 786.119 340.214 827.929C340.214 869.697 374.557 903.786 416.579 903.786C459.165 903.786 493.971 869.24 493.971 826.907V752.072H416.071ZM493.971 527.928H416.071C374.176 527.928 340.214 493.966 340.214 452.071C340.214 410.176 374.176 376.214 416.071 376.214H493.971V527.928ZM608.085 527.928H530.185V376.214H608.085C649.98 376.214 683.942 410.176 683.942 452.071C683.942 493.966 649.98 527.928 608.085 527.928Z"/>' },
};
const VARIANTS = [['GitHub', 'Regular', 'icon/size'], ['GitHub', 'Large', 'icon/size-large'], ['Figma', 'Large', 'icon/size-large']];
const value = v => v.valuesByMode[Object.keys(v.valuesByMode)[0]];
const variants = [];
for (const [name, size, token] of VARIANTS) {
  const box = num(token), px = value(box);
  const m = MARKS[name];
  const svg = figma.createNodeFromSvg('<svg xmlns="http://www.w3.org/2000/svg" width="' + px + '" height="' + px + '" viewBox="' + m.viewBox + '" fill="black">' + m.path + '</svg>');
  const c = figma.createComponent();
  c.name = 'Name=' + name + ', Size=' + size; c.fills = []; c.clipsContent = false; c.resize(px, px);
  c.appendChild(svg); svg.x = 0; svg.y = 0;
  const mark = figma.flatten(svg.children, c);
  svg.remove();
  mark.name = 'Mark / ' + name;
  mark.strokes = []; mark.fills = [paint('brand-mark/fill')];
  mark.constraints = { horizontal: 'SCALE', vertical: 'SCALE' };
  c.setBoundVariable('width', box); c.setBoundVariable('height', box);
  variants.push(c);
}

const set = figma.combineAsVariants(variants, page);
set.name = SET; set.x = 0; set.y = 0;
grid(set, p => [p.Name === 'GitHub' ? 0 : 1, p.Size === 'Regular' ? 0 : 1], 48, 48, 32);
set.resize(32 * 2 + 48 * 2, 32 * 2 + 48 * 2);

return { created: SET, variants: variants.length, setId: set.id };
