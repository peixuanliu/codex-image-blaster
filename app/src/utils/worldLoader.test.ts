import { describe, it, expect, vi } from 'vitest'
import { type World, type WorldEntry } from '../types/world'

const exampleWorld: World = {
  world_id: 'test-id',
  display_name: 'Example World',
  world_marble_url: '',
  tags: null,
  world_prompt: null,
  created_at: null,
  updated_at: null,
  assets: {
    imagery: { pano_url: '/worlds/example/output/world/0-world-pano.png' },
    mesh: { collider_mesh_url: '/worlds/example/output/world/0-world.glb' },
    splats: {
      spz_urls: {
        '500k': '/worlds/example/output/world/0-world-500k.spz',
        '150k': '/worlds/example/output/world/0-world-150k.spz',
      },
      semantics_metadata: { metric_scale_factor: 1.0, ground_plane_offset: 0.5 },
    },
    thumbnail_url: '/worlds/example/output/world/0-world-thumbnail.webp',
    caption: 'A test world',
  },
}

const exampleEntry: WorldEntry = {
  slug: 'example',
  project: { slug: 'example', display_name: 'Example World' },
  objectAssets: [],
  allObjectAssets: [],
  worldSfxUrls: [],
  sourceImageVersions: [],
  world: exampleWorld,
  worldVersions: [{
    index: 0,
    label: 'v0',
    complete: true,
    world: exampleWorld,
  }],
}

vi.mock('virtual:worlds', () => ({ default: [exampleEntry] }))

const { loadWorlds, fetchWorlds, getSplatUrl, getDeployedSplatUrl } = await import('./worldLoader')

describe('worldLoader', () => {
  it('returns WorldEntry array with correct slug', () => {
    const worlds = loadWorlds()
    expect(worlds).toHaveLength(1)
    expect(worlds[0].slug).toBe('example')
    expect(worlds[0].project.display_name).toBe('Example World')
  })

  it('fetches fresh world metadata in dev', async () => {
    const fetchedWorlds = [{ ...exampleEntry, slug: 'fresh-example' }]
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fetchedWorlds),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchWorlds()).resolves.toEqual(fetchedWorlds)
    expect(fetchMock).toHaveBeenCalledWith('/__worlds', { cache: 'no-store' })

    vi.unstubAllGlobals()
  })

  function withSplats(spz_urls: World['assets']['splats']['spz_urls']): World {
    return {
      ...exampleWorld,
      assets: {
        ...exampleWorld.assets,
        splats: { ...exampleWorld.assets.splats, spz_urls },
      },
    }
  }

  const fullRes = '/worlds/example/output/world/0-world-full_res.spz'
  const splat500k = '/worlds/example/output/world/0-world-500k.spz'
  const splat150k = '/worlds/example/output/world/0-world-150k.spz'
  const splat100k = '/worlds/example/output/world/0-world-100k.spz'

  it('prefers full-res in development', () => {
    expect(getSplatUrl(withSplats({ full_res: fullRes, '500k': splat500k }))).toBe(fullRes)
  })

  it('falls back to 500k in development', () => {
    expect(getSplatUrl(exampleWorld)).toBe(splat500k)
    expect(getSplatUrl(withSplats({ full_res: 'https://cdn.example.com/full.spz', '500k': splat500k }))).toBe(splat500k)
  })

  it('uses the remaining development fallback chain', () => {
    expect(getSplatUrl(withSplats({ '150k': splat150k, '100k': splat100k }))).toBe(splat150k)
    expect(getSplatUrl(withSplats({ '100k': splat100k }))).toBe(splat100k)
  })

  it('never selects full-res in deployed builds', () => {
    expect(getDeployedSplatUrl(withSplats({ full_res: fullRes, '500k': splat500k }))).toBe(splat500k)
    expect(getDeployedSplatUrl(withSplats({ full_res: fullRes }))).toBe('')
  })

  it('falls back through 500k, 150k, and 100k in deployed builds', () => {
    expect(getDeployedSplatUrl(withSplats({ '500k': splat500k, '150k': splat150k, '100k': splat100k }))).toBe(splat500k)
    expect(getDeployedSplatUrl(withSplats({ '150k': splat150k, '100k': splat100k }))).toBe(splat150k)
    expect(getDeployedSplatUrl(withSplats({ '100k': splat100k }))).toBe(splat100k)
    expect(getDeployedSplatUrl(withSplats({ '500k': 'https://cdn.example.com/500k.spz', '150k': splat150k }))).toBe(splat150k)
  })

  it('returns empty when no deployable local splat exists', () => {
    expect(getDeployedSplatUrl(withSplats({}))).toBe('')
    expect(getDeployedSplatUrl(withSplats({
      full_res: fullRes,
      '500k': 'https://cdn.example.com/500k.spz',
      '150k': '/other/150k.spz',
      '100k': 'data:application/octet-stream;base64,AAAA',
    }))).toBe('')
    expect(getSplatUrl(withSplats({ full_res: 'https://cdn.example.com/full.spz' }))).toBe('')
  })
})
