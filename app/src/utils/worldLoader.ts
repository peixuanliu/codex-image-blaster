import worlds from 'virtual:worlds'
import { type World, type WorldEntry } from '../types/world'

export function loadWorlds(): WorldEntry[] {
  return worlds as WorldEntry[]
}

export async function fetchWorlds(): Promise<WorldEntry[]> {
  if (!import.meta.env.DEV) return loadWorlds()

  const response = await fetch('/__worlds', { cache: 'no-store' })
  if (!response.ok) throw new Error(await response.text())
  return response.json() as Promise<WorldEntry[]>
}

function localWorldAssetUrl(url: string | undefined): string {
  return url?.startsWith('/worlds/') ? url : ''
}

function preferredSplatUrl(world: World, preferences: (keyof World['assets']['splats']['spz_urls'])[]): string {
  const urls = world.assets.splats.spz_urls
  for (const preference of preferences) {
    const url = localWorldAssetUrl(urls[preference])
    if (url) return url
  }
  return ''
}

export function getDeployedSplatUrl(world: World): string {
  return preferredSplatUrl(world, ['500k', '150k', '100k'])
}

export function getSplatUrl(world: World): string {
  return import.meta.env.DEV
    ? preferredSplatUrl(world, ['full_res', '500k', '150k', '100k'])
    : getDeployedSplatUrl(world)
}
