/**
 * A small fake of the Figma Plugin API — enough to run scripts/figma/components/*.figma.js in
 * Node. It records the tree a builder WOULD create (nodes, auto layout, variable bindings, text
 * styles, component properties) so the builders can be linted in CI and diffed against the live
 * library without opening Figma. It models the rules the builders depend on: resize() fixes both
 * axes, a typography property set on a styled text detaches the style, a union takes the bounding
 * box of its parts, HUG and FILL set the sizing modes. It knows nothing about pixels it is not
 * told: text and hugging frames keep placeholder sizes, so only bound or resized sizes mean anything.
 */
const MIXED = Symbol('figma.mixed')
let seq = 0
const nid = (t) => `${t.toLowerCase()}:${++seq}`
const DEFAULT_NAME = { FRAME: 'Frame', COMPONENT: 'Component', COMPONENT_SET: 'Component', TEXT: 'Text', RECTANGLE: 'Rectangle', ELLIPSE: 'Ellipse', POLYGON: 'Polygon', BOOLEAN_OPERATION: 'Union' }

class SceneNode {
  constructor(type, figma) {
    this.id = nid(type); this.type = type; this.name = DEFAULT_NAME[type]; this.visible = true
    this.parent = null; this.x = 0; this.y = 0; this.width = 100; this.height = 100
    this.fills = []; this.strokes = []; this.strokeAlign = 'INSIDE'
    this._sw = { top: 1, right: 1, bottom: 1, left: 1 }
    this.boundVariables = {}; this.componentPropertyReferences = {}
    this._ls = { h: null, v: null }
    Object.defineProperty(this, '_figma', { value: figma, enumerable: false })
  }
  get strokeWeight() { const s = this._sw; return s.top === s.right && s.top === s.bottom && s.top === s.left ? s.top : MIXED }
  set strokeWeight(v) { this._sw = { top: v, right: v, bottom: v, left: v } }
  get strokeTopWeight() { return this._sw.top } set strokeTopWeight(v) { this._sw.top = v }
  get strokeRightWeight() { return this._sw.right } set strokeRightWeight(v) { this._sw.right = v }
  get strokeBottomWeight() { return this._sw.bottom } set strokeBottomWeight(v) { this._sw.bottom = v }
  get strokeLeftWeight() { return this._sw.left } set strokeLeftWeight(v) { this._sw.left = v }
  _defaultLs() { return 'FIXED' }
  get layoutSizingHorizontal() { return this._ls.h ?? this._defaultLs('h') }
  set layoutSizingHorizontal(v) { this._ls.h = v; this._applySizing() }
  get layoutSizingVertical() { return this._ls.v ?? this._defaultLs('v') }
  set layoutSizingVertical(v) { this._ls.v = v; this._applySizing() }
  _applySizing() {}
  resize(w, h) { this.width = w; this.height = h; this._ls.h = 'FIXED'; this._ls.v = 'FIXED'; this._applySizing() }
  setBoundVariable(field, variable) {
    if (!variable || !variable.id) throw new Error(`setBoundVariable(${field}) on "${this.name}": not a variable`)
    this.boundVariables[field] = { type: 'VARIABLE_ALIAS', id: variable.id }
    const v = variable.valuesByMode[Object.keys(variable.valuesByMode)[0]]
    if (typeof v === 'number') this[field] = v
  }
  remove() { if (this.parent) { const c = this.parent.children; c.splice(c.indexOf(this), 1); this.parent = null } }
}

class ContainerNode extends SceneNode {
  constructor(type, figma) { super(type, figma); this.children = [] }
  appendChild(child) {
    if (child.parent) { const c = child.parent.children; c.splice(c.indexOf(child), 1) }
    child.parent = this; this.children.push(child)
  }
  findOne(fn) { for (const c of this.children) { if (fn(c)) return c; if (c.findOne) { const r = c.findOne(fn); if (r) return r } } return null }
  findAll(fn = () => true) { const out = []; for (const c of this.children) { if (fn(c)) out.push(c); if (c.findAll) out.push(...c.findAll(fn)) } return out }
}

class FrameNode extends ContainerNode {
  constructor(type, figma) {
    super(type, figma)
    this._lm = 'NONE'; this.primaryAxisAlignItems = 'MIN'; this.counterAxisAlignItems = 'MIN'
    this.primaryAxisSizingMode = 'FIXED'; this.counterAxisSizingMode = 'FIXED'
    this.itemSpacing = 0; this.paddingTop = 0; this.paddingRight = 0; this.paddingBottom = 0; this.paddingLeft = 0
    this.clipsContent = true
    this._r = { tl: 0, tr: 0, bl: 0, br: 0 }
  }
  get layoutMode() { return this._lm }
  set layoutMode(v) { const was = this._lm; this._lm = v; if (v !== 'NONE' && was === 'NONE') { if (this._ls.h == null) this._ls.h = 'HUG'; if (this._ls.v == null) this._ls.v = 'HUG' } this._applySizing() }
  _defaultLs() { return 'FIXED' }
  _applySizing() {
    if (this._lm === 'NONE') return
    const m = (s) => (s === 'HUG' ? 'AUTO' : 'FIXED')
    const h = this.layoutSizingHorizontal, v = this.layoutSizingVertical
    if (this._lm === 'HORIZONTAL') { this.primaryAxisSizingMode = m(h); this.counterAxisSizingMode = m(v) }
    else { this.primaryAxisSizingMode = m(v); this.counterAxisSizingMode = m(h) }
  }
  get topLeftRadius() { return this._r.tl } set topLeftRadius(v) { this._r.tl = v }
  get topRightRadius() { return this._r.tr } set topRightRadius(v) { this._r.tr = v }
  get bottomLeftRadius() { return this._r.bl } set bottomLeftRadius(v) { this._r.bl = v }
  get bottomRightRadius() { return this._r.br } set bottomRightRadius(v) { this._r.br = v }
  get cornerRadius() { const r = this._r; return r.tl === r.tr && r.tl === r.bl && r.tl === r.br ? r.tl : MIXED }
  set cornerRadius(v) { this._r = { tl: v, tr: v, bl: v, br: v } }
}

class ComponentSetNode extends FrameNode {
  constructor(figma) { super('COMPONENT_SET', figma); this.componentPropertyDefinitions = {}; this.description = '' }
  addComponentProperty(name, type, defaultValue) {
    const key = type === 'VARIANT' ? name : `${name}#${this.id}`
    this.componentPropertyDefinitions[key] = { type, defaultValue }
    return key
  }
  _variantDefs() {
    for (const c of this.children) for (const pair of c.name.split(', ')) {
      const [k, v] = pair.split('=')
      const d = (this.componentPropertyDefinitions[k] ??= { type: 'VARIANT', defaultValue: v, variantOptions: [] })
      if (!d.variantOptions.includes(v)) d.variantOptions.push(v)
    }
  }
}

class TextNode extends SceneNode {
  constructor(figma) {
    super('TEXT', figma)
    this._f = { fontName: { family: 'Inter', style: 'Regular' }, fontSize: 12, lineHeight: { unit: 'AUTO' }, letterSpacing: { unit: 'PERCENT', value: 0 } }
    this.textStyleId = ''; this.textAutoResize = 'WIDTH_AND_HEIGHT'; this.textAlignHorizontal = 'LEFT'; this.characters = ''
  }
  _defaultLs(axis) { return this.textAutoResize === 'WIDTH_AND_HEIGHT' ? 'HUG' : this.textAutoResize === 'HEIGHT' && axis === 'v' ? 'HUG' : 'FIXED' }
  // Setting a typography property on a styled node detaches the style — exactly what Figma does.
  get fontName() { return this._f.fontName } set fontName(v) { this._f.fontName = v; this.textStyleId = '' }
  get fontSize() { return this._f.fontSize } set fontSize(v) { this._f.fontSize = v; this.textStyleId = '' }
  get lineHeight() { return this._f.lineHeight } set lineHeight(v) { this._f.lineHeight = v; this.textStyleId = '' }
  get letterSpacing() { return this._f.letterSpacing } set letterSpacing(v) { this._f.letterSpacing = v; this.textStyleId = '' }
  async setTextStyleIdAsync(id) {
    const s = this._figma._styles[id]
    if (!s) throw new Error(`setTextStyleIdAsync: no text style ${id}`)
    this.textStyleId = id
    this._f = { fontName: { ...s.fontName }, fontSize: s.fontSize, lineHeight: { ...s.lineHeight }, letterSpacing: { ...s.letterSpacing } }
  }
}

class RectangleNode extends SceneNode {
  constructor(figma) { super('RECTANGLE', figma); this._r = { tl: 0, tr: 0, bl: 0, br: 0 } }
  get topLeftRadius() { return this._r.tl } set topLeftRadius(v) { this._r.tl = v }
  get topRightRadius() { return this._r.tr } set topRightRadius(v) { this._r.tr = v }
  get bottomLeftRadius() { return this._r.bl } set bottomLeftRadius(v) { this._r.bl = v }
  get bottomRightRadius() { return this._r.br } set bottomRightRadius(v) { this._r.br = v }
  get cornerRadius() { const r = this._r; return r.tl === r.tr && r.tl === r.bl && r.tl === r.br ? r.tl : MIXED }
  set cornerRadius(v) { this._r = { tl: v, tr: v, bl: v, br: v } }
}
class EllipseNode extends SceneNode { constructor(figma) { super('ELLIPSE', figma) } }
class PolygonNode extends SceneNode { constructor(figma) { super('POLYGON', figma); this.pointCount = 3; this.cornerRadius = 0 } }
class BooleanOperationNode extends ContainerNode {
  constructor(figma) { super('BOOLEAN_OPERATION', figma); this.booleanOperation = 'UNION'; this.cornerRadius = 0 }
}
class PageNode {
  constructor(name) { this.id = nid('PAGE'); this.type = 'PAGE'; this.name = name; this.children = []; this.parent = null }
  async loadAsync() {}
  appendChild(child) { if (child.parent) { const c = child.parent.children; c.splice(c.indexOf(child), 1) } child.parent = this; this.children.push(child) }
  findOne(fn) { return ContainerNode.prototype.findOne.call(this, fn) }
  findAll(fn) { return ContainerNode.prototype.findAll.call(this, fn) }
}

/**
 * @param variables  [{ name, resolvedType, value, collection }]  — from scripts/sync-figma.mjs ENTRIES
 * @param styles     [{ name, fontName, fontSize, lineHeight, letterSpacing, description }]
 * @param pages      ['Button', …]
 */
export function createMockFigma({ variables, styles, pages }) {
  const vars = variables.map((v, i) => ({
    id: `VariableID:${i}`, name: v.name, resolvedType: v.resolvedType, variableCollectionId: `VariableCollectionId:${v.collection}`,
    valuesByMode: { 'mode:0': v.value },
  }))
  const byId = Object.fromEntries(vars.map((v) => [v.id, v]))
  const styleList = styles.map((s, i) => ({ id: `S:${i},`, type: 'TEXT', name: s.name, fontName: s.fontName, fontSize: s.fontSize, lineHeight: s.lineHeight, letterSpacing: s.letterSpacing, description: s.description ?? '' }))
  const figma = {
    mixed: MIXED,
    root: { children: pages.map((n) => new PageNode(n)) },
    currentPage: null,
    _styles: Object.fromEntries(styleList.map((s) => [s.id, s])),
    async setCurrentPageAsync(p) { figma.currentPage = p },
    async loadFontAsync() {},
    createFrame() { const n = new FrameNode('FRAME', figma); figma.currentPage.appendChild(n); return n },
    createComponent() { const n = new FrameNode('COMPONENT', figma); figma.currentPage.appendChild(n); return n },
    createText() { const n = new TextNode(figma); figma.currentPage.appendChild(n); return n },
    createRectangle() { const n = new RectangleNode(figma); figma.currentPage.appendChild(n); return n },
    createEllipse() { const n = new EllipseNode(figma); figma.currentPage.appendChild(n); return n },
    createPolygon() { const n = new PolygonNode(figma); figma.currentPage.appendChild(n); return n },
    combineAsVariants(nodes, parent) { const set = new ComponentSetNode(figma); for (const n of nodes) set.appendChild(n); parent.appendChild(set); set._variantDefs(); return set },
    union(nodes, parent) {
      const bo = new BooleanOperationNode(figma)
      const xs = nodes.map((n) => n.x), ys = nodes.map((n) => n.y)
      const x0 = Math.min(...xs), y0 = Math.min(...ys)
      bo.width = Math.max(...nodes.map((n) => n.x + n.width)) - x0; bo.height = Math.max(...nodes.map((n) => n.y + n.height)) - y0
      for (const n of nodes) { bo.appendChild(n); n.x -= x0; n.y -= y0 }
      parent.appendChild(bo); return bo
    },
    variables: {
      async getLocalVariablesAsync(type) { return type ? vars.filter((v) => v.resolvedType === type) : vars },
      async getVariableByIdAsync(id) { return byId[id] ?? null },
      setBoundVariableForPaint(paint, field, variable) {
        if (!variable || !variable.id) throw new Error('setBoundVariableForPaint: not a variable')
        return { ...paint, boundVariables: { ...(paint.boundVariables || {}), [field]: { type: 'VARIABLE_ALIAS', id: variable.id } } }
      },
    },
    async getLocalTextStylesAsync() { return styleList },
    async getStyleByIdAsync(id) { return figma._styles[id] ?? null },
  }
  figma.currentPage = figma.root.children[0]
  return figma
}
