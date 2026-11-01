import { describe, it, expect } from 'vitest'
import { ProductMark } from '../../demo/shell/ProductMark'

// Product Mark's closed props (the spec's Props table), held by the compiler in the site as the kit
// would hold them. `npm run typecheck` fails if any line under @ts-expect-error compiles, so each
// case is a combination the spec forbids. The test body only proves the file is part of the run.

const allowed = [
  <ProductMark size="small" label="Vela Design System" />,
  <ProductMark size="regular" decorative />,
  <ProductMark size="large" label="Vela Design System" />,
  <ProductMark size="hero" on="dark" label="Vela Design System" animate="once" />,
  <ProductMark size="hero" on="light" decorative animate="once" replay={{ label: 'Play the pulse' }} />,
]

const forbidden = [
  // `hero` without `on`.
  // @ts-expect-error on is required on hero
  <ProductMark size="hero" label="Vela Design System" />,
  // `replay` without `decorative`.
  // @ts-expect-error replay requires decorative
  <ProductMark size="hero" on="light" label="Vela Design System" animate="once" replay={{ label: 'Play the pulse' }} />,
  // `replay` without `animate="once"`.
  // @ts-expect-error replay requires animate="once"
  <ProductMark size="hero" on="light" decorative replay={{ label: 'Play the pulse' }} />,
  // `animate` on `large`.
  // @ts-expect-error animate is hero only
  <ProductMark size="large" label="Vela Design System" animate="once" />,
  // `on` on `regular`.
  // @ts-expect-error on is hero only
  <ProductMark size="regular" decorative on="dark" />,
  // `label` together with `decorative`.
  // @ts-expect-error label and decorative are exclusive
  <ProductMark size="large" label="Vela Design System" decorative />,
  // Neither `label` nor `decorative`.
  // @ts-expect-error the mark is named or decorative
  <ProductMark size="large" />,
  // No numeric size, no colour, no className.
  // @ts-expect-error size is one of four words
  <ProductMark size={32} decorative />,
  // @ts-expect-error no color prop
  <ProductMark size="large" decorative color="red" />,
  // @ts-expect-error no className prop
  <ProductMark size="large" decorative className="x" />,
]

describe('Product Mark: closed props', () => {
  it('the allowed and forbidden combinations are compiled by npm run typecheck', () => {
    expect(allowed).toHaveLength(5)
    expect(forbidden).toHaveLength(10)
  })
})
