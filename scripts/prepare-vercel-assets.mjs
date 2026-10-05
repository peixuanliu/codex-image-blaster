import { cp, mkdir, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(root, 'worlds/corridor');
const destination = path.join(root, 'app/dist/worlds/corridor');
const project = JSON.parse(await readFile(path.join(source, 'project.json'), 'utf8'));
const world = JSON.parse(await readFile(path.join(source, 'output/world/0-world.json'), 'utf8'));
if (project.slug !== 'corridor' || !world.assets) throw new Error('Missing corridor metadata');
const required = [
  '0-world.glb', '0-world-pano.png', '0-world-thumbnail.webp',
];
const maxAssetBytes = 25 * 1024 * 1024;
const skipped = [];
for (const name of required) {
  const info = await stat(path.join(source, 'output/world', name));
  if (!info.isFile() || !info.size) throw new Error(`Missing corridor asset: ${name}`);
}
// Vite's public/worlds link may have already copied unfiltered world assets.
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await cp(path.join(source, 'project.json'), path.join(destination, 'project.json'));
await cp(path.join(source, 'output/world'), path.join(destination, 'output/world'), {
  recursive: true,
  filter: async file => {
    if (path.basename(file).startsWith('.')) return false;
    const info = await stat(file);
    if (info.isFile() && info.size > maxAssetBytes) {
      skipped.push(path.relative(root, file));
      console.log(`Skipped oversized asset (${(info.size / 1024 / 1024).toFixed(2)} MiB): ${path.relative(root, file)}`);
      return false;
    }
    return true;
  },
});
console.log(`Copied corridor metadata and deployment assets to app/dist/worlds/corridor; skipped ${skipped.length} oversized assets`);
