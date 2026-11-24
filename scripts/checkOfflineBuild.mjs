import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('dist');
async function inspect(file) {
  const source = await readFile(file, 'utf8');
  const urls = file.endsWith('.html')
    ? [...source.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => match[1])
    : [...source.matchAll(/url\(["']?([^\s)"']+)/g)].map(match => match[1]);
  for (const url of urls) {
    if (url.startsWith('data:') || url.startsWith('#')) continue;
    assert(!/^(https?:)?\/\//.test(url), `External dependency in ${file}: ${url}`);
    const asset = url.startsWith('/') ? path.join(root, url) : path.resolve(path.dirname(file), url);
    assert((await stat(asset)).isFile(), `Missing bundled asset: ${asset}`);
  }
}

await inspect(path.join(root, 'index.html'));
const assets = await readdir(path.join(root, 'assets'));
for (const file of assets.filter(file => file.endsWith('.css'))) {
  await inspect(path.join(root, 'assets', file));
}
const manifestPath = assets.find(file => file.endsWith('.webmanifest'));
assert(manifestPath, 'Missing web manifest');
const manifest = JSON.parse(await readFile(path.join(root, 'assets', manifestPath), 'utf8'));
for (const icon of manifest.icons) assert((await stat(path.join(root, icon.src))).isFile());
assert(assets.some(file => file.includes('georgian') && file.endsWith('.woff2')), 'Missing Georgian font');
console.log('Offline assets verified: HTML, styles, fonts, icons and manifest.');
