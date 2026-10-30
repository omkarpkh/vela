import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { installFor, OPTIONAL_PEERS } from '../../demo/playground/install'

// The playground's install line (playground spec, section 4): generated from the package's own
// peerDependenciesMeta, not hand-written. npm installs ordinary peers but never optional ones.
const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'))

describe('the install command', () => {
  it('reads the optional peers from peerDependenciesMeta', () => {
    const optional = Object.entries(pkg.peerDependenciesMeta as Record<string, { optional?: boolean }>).filter(([, m]) => m.optional).map(([n]) => n)
    expect(OPTIONAL_PEERS).toEqual(optional)
    expect(OPTIONAL_PEERS).toEqual(['@base-ui/react'])
    // React is a peer too, but not an optional one: npm installs it, so it is never named.
    expect(OPTIONAL_PEERS).not.toContain('react')
  })

  it('a core component installs the package alone', () => {
    expect(installFor('@omkarux/vela')).toEqual({ command: 'npm i @omkarux/vela' })
  })

  it('a headless component installs Base UI too, and says why', () => {
    expect(installFor('@omkarux/vela/headless')).toEqual({
      command: 'npm i @omkarux/vela @base-ui/react',
      note: "Base UI is an optional peer, and npm doesn't install optional peers for you.",
    })
  })
})
