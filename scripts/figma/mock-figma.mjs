/**
 * A small fake of the Figma Plugin API — enough to run scripts/figma/components/*.figma.js in
 * Node. It records the tree a builder WOULD create (nodes, auto layout, variable bindings, text
 * styles, component properties) so the builders can be linted in CI and diffed against the live
 * library without opening Figma. It models the rules the builders depend on: resize() fixes both
 * axes, a typography property set on a styled text detaches the style, a union takes the bounding
 * box of its parts, HUG and FILL set the sizing modes. It knows nothing about pixels it is not
 * told: text and hugging frames keep placeholder sizes, so only bound or resized sizes mean anything.
 *
 * Two behaviours of the real file are modelled because a builder got them wrong (29 Oct 2026):
 *   - A TEXT component property holds ONE default for the whole set. Binding a text layer to it
 *     (componentPropertyReferences = { characters }) makes that layer's characters the property's
 *     default, and every layer bound to it shows that default; writing a bound layer's characters
 *     rewrites the default for all of them. Per-variant words bound to one property collapse to
 *     the last one written (Low / Medium / High → High / High / High, observed live). The mock
 *     keeps what the builder last wrote to each layer (`_authored`) so the lint can say so.
 *   - A paint's colour is resolved from its bound variable when the binding is new. Re-assigning a
 *     paint bound to the same variable as the node's current paint at that index keeps the paint's
 *     own placeholder colour ({0,0,0}, the black the builders pass) — observed on a reused page
 *     frame. Clearing the fills first (`fills = []`) makes the binding new again.
 *
 * Instances (30 Oct 2026, for the Dropdown List popup): `component.createInstance()` returns an
 * INSTANCE that copies its main component's box, auto layout, bindings and paints — not its
 * children, which the lint has already walked on the main component. `setProperties` checks every
 * key against the containing set's definitions, as Figma does: a VARIANT value swaps the main
 * component for the variant it names, and an unknown key or value throws.
 *
 * Extensions (31 Oct 2026, scripts/figma/components/*.extend.figma.js): a set's VARIANT
 * definitions follow its children, as Figma's do, so a variant appended or renamed adds or drops
 * an option; its `defaultVariant` is the top-left-most variant on the canvas (Figma's documented
 * rule), and each VARIANT definition's default is that variant's value. `getNodeByIdAsync` finds a
 * node until it is removed. A node has `isMask`, and a gradient paint keeps its stops.
 */
const MIXED = Symbol('figma.mixed')
let seq = 0
const nid = (t) => `${t.toLowerCase()}:${++seq}`
const hexToRgb = (v) => {
  if (typeof v !== 'string' || !/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(v)) return null
  const n = (i) => Math.round((parseInt(v.slice(i, i + 2), 16) / 255) * 1000) / 1000
  return { r: n(1), g: n(3), b: n(5) }
}
const DEFAULT_NAME = { FRAME: 'Frame', COMPONENT: 'Component', COMPONENT_SET: 'Component', TEXT: 'Text', RECTANGLE: 'Rectangle', ELLIPSE: 'Ellipse', POLYGON: 'Polygon', BOOLEAN_OPERATION: 'Union', VECTOR: 'Vector' }

class SceneNode {
  constructor(type, figma) {
    Object.defineProperty(this, '_figma', { value: figma, enumerable: false })
    this.id = nid(type); this.type = type; this.name = DEFAULT_NAME[type]; this.visible = true; this.isMask = false
    figma._nodes.set(this.id, this)
    this.parent = null; this.x = 0; this.y = 0; this.width = 100; this.height = 100
    this.fills = []; this.strokes = []; this.strokeAlign = 'INSIDE'
    this._sw = { top: 1, right: 1, bottom: 1, left: 1 }
    this.boundVariables = {}; this.componentPropertyReferences = {}
    this._ls = { h: null, v: null }
  }
  // Paints: a new binding resolves the variable's colour; the same binding re-assigned keeps the placeholder.
  _setPaints(key, v) {
    const prev = this[key] || []
    this[key] = (v || []).map((p, i) => {
      const id = p.boundVariables && p.boundVariables.color && p.boundVariables.color.id
      const was = prev[i] && prev[i].boundVariables && prev[i].boundVariables.color && prev[i].boundVariables.color.id
      const color = id && id !== was ? (this._figma._resolveColour(id) ?? p.color) : p.color
      const q = color ? { ...p, color: { ...color } } : { ...p }
      if (Array.isArray(p.gradientStops)) q.gradientStops = p.gradientStops.map((g) => ({ ...g, color: { ...g.color } }))
      return q
    })
  }
  get fills() { return (this._fills || []).map((p) => ({ ...p })) } set fills(v) { this._setPaints('_fills', v) }
  get strokes() { return (this._strokes || []).map((p) => ({ ...p })) } set strokes(v) { this._setPaints('_strokes', v) }
  get componentPropertyReferences() { return this._cpr }
  set componentPropertyReferences(v) { this._cpr = { ...(v || {}) }; if (this._cpr.characters) this._bindText(this._cpr.characters) }
  _bindText() { throw new Error(`componentPropertyReferences.characters on "${this.name}": only a text layer has characters`) }
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
  remove() { if (this.parent) { const c = this.parent.children; c.splice(c.indexOf(this), 1); this.parent = null } this._figma._nodes.delete(this.id) }
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
  createInstance() {
    if (this.type !== 'COMPONENT') throw new Error(`createInstance on "${this.name}": only a component has instances`)
    const n = new InstanceNode(this._figma, this)
    this._figma.currentPage.appendChild(n)
    return n
  }
}

class InstanceNode extends FrameNode {
  constructor(figma, main) {
    super('INSTANCE', figma)
    this.name = main.parent && main.parent.type === 'COMPONENT_SET' ? main.parent.name : main.name
    this._props = {}
    this._adopt(main)
  }
  _adopt(main) {
    this._main = main
    for (const k of ['primaryAxisAlignItems', 'counterAxisAlignItems', 'itemSpacing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'width', 'height', 'clipsContent']) this[k] = main[k]
    this._lm = main._lm; this._r = { ...main._r }; this._sw = { ...main._sw }
    this.boundVariables = { ...main.boundVariables }
    this._fills = main.fills; this._strokes = main.strokes
    if (this._ls.h == null) this._ls = { ...main._ls }
    this._applySizing()
  }
  get mainComponent() { return this._main }
  async getMainComponentAsync() { return this._main }
  _set() { return this._main.parent && this._main.parent.type === 'COMPONENT_SET' ? this._main.parent : null }
  _defs() { const set = this._set(); return set ? set.componentPropertyDefinitions : (this._main.componentPropertyDefinitions || {}) }
  get componentProperties() {
    const out = {}
    const variant = Object.fromEntries(this._main.name.split(', ').map((p) => p.split('=')))
    for (const [k, d] of Object.entries(this._defs())) out[k] = { type: d.type, value: d.type === 'VARIANT' ? variant[k] : (k in this._props ? this._props[k] : d.defaultValue) }
    return out
  }
  setProperties(props) {
    const defs = this._defs()
    const set = this._set()
    const variant = Object.fromEntries(this._main.name.split(', ').map((p) => p.split('=')))
    let swap = false
    for (const [k, v] of Object.entries(props)) {
      const d = defs[k]
      if (!d) throw new Error(`setProperties on "${this.name}": no property "${k}" (has ${Object.keys(defs).join(', ')})`)
      if (d.type === 'VARIANT') {
        if (!d.variantOptions.includes(v)) throw new Error(`setProperties on "${this.name}": ${k}=${v} is not a variant (${d.variantOptions.join(' / ')})`)
        variant[k] = v; swap = true
      } else if (d.type === 'BOOLEAN') {
        if (typeof v !== 'boolean') throw new Error(`setProperties on "${this.name}": ${k} is BOOLEAN, given ${JSON.stringify(v)}`)
        this._props[k] = v
      } else this._props[k] = v
    }
    if (swap) {
      const name = Object.entries(variant).map(([k, v]) => `${k}=${v}`).join(', ')
      const next = set.children.find((c) => c.name === name)
      if (!next) throw new Error(`setProperties on "${this.name}": no variant "${name}"`)
      this._adopt(next)
    }
  }
}

class ComponentSetNode extends FrameNode {
  constructor(figma) { super('COMPONENT_SET', figma); this._defs = {}; this.description = '' }
  addComponentProperty(name, type, defaultValue) {
    const key = type === 'VARIANT' ? name : `${name}#${this.id}`
    this._defs[key] = { type, defaultValue }
    return key
  }
  // The top-left-most variant, spatially: the one dragged in from the library. Ties keep layer order.
  get defaultVariant() {
    let best = null
    for (const c of this.children) if (!best || c.y < best.y || (c.y === best.y && c.x < best.x)) best = c
    return best
  }
  // VARIANT definitions come from the variants' names, every time they are read, in the order their
  // options first appear; the other properties are the ones added, the same objects each time (a TEXT
  // property's default is written through them).
  get componentPropertyDefinitions() {
    const out = {}
    const dflt = this.defaultVariant
    const dv = dflt ? Object.fromEntries(dflt.name.split(', ').map((p) => p.split('='))) : {}
    for (const c of this.children) for (const pair of c.name.split(', ')) {
      const [k, v] = pair.split('=')
      const d = (out[k] ??= { type: 'VARIANT', defaultValue: dv[k] ?? v, variantOptions: [] })
      if (!d.variantOptions.includes(v)) d.variantOptions.push(v)
    }
    return Object.assign(out, this._defs)
  }
}

class TextNode extends SceneNode {
  constructor(figma) {
    super('TEXT', figma)
    this._f = { fontName: { family: 'Inter', style: 'Regular' }, fontSize: 12, lineHeight: { unit: 'AUTO' }, letterSpacing: { unit: 'PERCENT', value: 0 } }
    this.textStyleId = ''; this.textAutoResize = 'WIDTH_AND_HEIGHT'; this.textAlignHorizontal = 'LEFT'
    this._chars = ''; this._name = DEFAULT_NAME.TEXT; this.autoRename = true; this.hyperlink = null
  }
  // As in Figma: a text layer is named after its characters until a name is set, which turns autoRename off.
  get name() { return this._name } set name(v) { this._name = v; this.autoRename = false }
  get characters() { return this._chars }
  set characters(v) {
    this._authored = v; this._show(v)
    const key = this._cpr && this._cpr.characters
    if (key) this._setDefault(key, v)
  }
  _show(v) { this._chars = v; if (this.autoRename) this._name = v }
  _setOf() { let p = this.parent; while (p && p.type !== 'COMPONENT_SET') p = p.parent; return p }
  // A TEXT property has one default for the whole set: binding a layer makes its characters that
  // default, and every layer bound to the property shows it.
  _bindText(key) { this._setDefault(key, this._chars) }
  _setDefault(key, value) {
    const set = this._setOf()
    const def = set && set.componentPropertyDefinitions[key]
    if (!def) throw new Error(`componentPropertyReferences on "${this.name}": no property ${key} on the containing component set`)
    if (def.type !== 'TEXT') throw new Error(`componentPropertyReferences.characters on "${this.name}": ${key} is a ${def.type} property, not TEXT`)
    def.defaultValue = value
    for (const t of set.findAll((n) => n.type === 'TEXT' && n._cpr && n._cpr.characters === key)) t._show(value)
  }
  setRangeHyperlink(start, end, target) { if (start === 0 && end === this._chars.length) this.hyperlink = target }
  // Whole-node list options only — the page builders set a list over all of a text's characters.
  setRangeListOptions(start, end, options) { if (start === 0 && end === this._chars.length) this._list = options }
  getRangeListOptions() { return this._list ?? { type: 'NONE' } }
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
// A vector keeps its constraints (how it follows a resized parent) and its stroke cap and join. Its
// geometry is not modelled: the mock knows a vector's box only if a builder sets it.
class VectorNode extends SceneNode {
  constructor(figma) { super('VECTOR', figma); this.constraints = { horizontal: 'MIN', vertical: 'MIN' }; this.strokeCap = 'NONE'; this.strokeJoin = 'MITER' }
}
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
    _nodes: new Map(),
    async getNodeByIdAsync(id) { return figma._nodes.get(id) ?? figma.root.children.find((p) => p.id === id) ?? null },
    _resolveColour(id) { const v = byId[id]; return v && v.resolvedType === 'COLOR' ? hexToRgb(v.valuesByMode['mode:0']) : null },
    root: { children: pages.map((n) => new PageNode(n)) },
    currentPage: null,
    _styles: Object.fromEntries(styleList.map((s) => [s.id, s])),
    async setCurrentPageAsync(p) { figma.currentPage = p },
    createPage() { const p = new PageNode('Page'); figma.root.children.push(p); return p },
    async loadFontAsync() {},
    createFrame() { const n = new FrameNode('FRAME', figma); figma.currentPage.appendChild(n); return n },
    // As documented: a frame with auto layout on in `direction` (HORIZONTAL by default), both axes hugging. It takes no name.
    createAutoLayout(direction = 'HORIZONTAL') { const n = new FrameNode('FRAME', figma); figma.currentPage.appendChild(n); n.layoutMode = direction; return n },
    createComponent() { const n = new FrameNode('COMPONENT', figma); figma.currentPage.appendChild(n); return n },
    createText() { const n = new TextNode(figma); figma.currentPage.appendChild(n); return n },
    createRectangle() { const n = new RectangleNode(figma); figma.currentPage.appendChild(n); return n },
    createEllipse() { const n = new EllipseNode(figma); figma.currentPage.appendChild(n); return n },
    createPolygon() { const n = new PolygonNode(figma); figma.currentPage.appendChild(n); return n },
    combineAsVariants(nodes, parent) { const set = new ComponentSetNode(figma); for (const n of nodes) set.appendChild(n); parent.appendChild(set); return set },
    // createNodeFromSvg returns a frame without auto layout holding one vector per drawn element, with
    // the SVG's stroke as a raw paint — which is why a builder must rebind it. The frame takes the
    // svg's width and height attributes.
    createNodeFromSvg(svg) {
      const f = new FrameNode('FRAME', figma); figma.currentPage.appendChild(f)
      f.name = 'svg'; f.fills = []
      const attr = (k) => Number((svg.match(new RegExp(`<svg[^>]*\\s${k}="([\\d.]+)"`)) || [])[1] ?? 100)
      f.width = attr('width'); f.height = attr('height')
      for (const _ of svg.matchAll(/<(path|circle|ellipse|rect|line|polyline|polygon)\b/g)) {
        const v = new VectorNode(figma); v.width = f.width; v.height = f.height
        v.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }]
        f.appendChild(v)
      }
      return f
    },
    // flatten merges the nodes into one vector inside `parent`; its box is not computed.
    flatten(nodes, parent) {
      if (!nodes.length) throw new Error('flatten: no nodes')
      const v = new VectorNode(figma); v.width = Math.max(...nodes.map((n) => n.width)); v.height = Math.max(...nodes.map((n) => n.height))
      v.strokes = nodes[0].strokes
      for (const n of [...nodes]) n.remove()
      ;(parent ?? figma.currentPage).appendChild(v); return v
    },
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
