import { readdir, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const files = [];
async function walk(folder) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const file = path.join(folder, entry.name);
    if (entry.isDirectory() && entry.name !== 'smart-assets') await walk(file);
    else if (/\.(svg|png|jpe?g|webp|avif)$/i.test(file))
      files.push(
        '/' +
          path.relative(path.join(root, 'public'), file).replaceAll('\\', '/'),
      );
  }
}
await walk(path.join(root, 'public'));
await mkdir(path.join(root, 'src', 'data'), { recursive: true });
await writeFile(
  path.join(root, 'src', 'data', 'image-manifest.json'),
  JSON.stringify(files.sort(), null, 2) + '\n',
);
await mkdir(path.join(root, 'src', 'data', 'locales'), { recursive: true });
for (const locale of ['es', 'en'])
  await copyFile(
    path.join(root, 'public', 'locales', `${locale}.json`),
    path.join(root, 'src', 'data', 'locales', `${locale}.json`),
  );
console.log(
  `Inventario: ${files.length} recursos; ${files.filter((f) => !f.endsWith('.svg')).length} fotografías raster.`,
);
