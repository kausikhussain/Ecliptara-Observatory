import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const HTML_FILE = resolve(ROOT, 'index.html');
const APP_JS_FILE = resolve(ROOT, 'js', 'app.js');

const html = readFileSync(HTML_FILE, 'utf-8');
const appJs = readFileSync(APP_JS_FILE, 'utf-8');

// Extract IDs from index.html
const idRegex = /\bid=["']([^"']+)["']/g;
const ids = [];
let match;
while ((match = idRegex.exec(html)) !== null) {
  ids.push(match[1]);
}

// Check duplicates
const idCounts = {};
for (const id of ids) {
  idCounts[id] = (idCounts[id] || 0) + 1;
}
const duplicates = Object.keys(idCounts).filter((k) => idCounts[k] > 1).sort();

// Extract $('...') references from app.js
const refRegex = /\$\('([^']+)'\)/g;
const refs = new Set();
while ((match = refRegex.exec(appJs)) !== null) {
  refs.add(match[1]);
}
const idSet = new Set(ids);
const missingIds = Array.from(refs).filter((ref) => !idSet.has(ref)).sort();

// Extract local asset references (src and href)
const localReferences = [];
const attrRegex = /\b(src|href)=["']([^"']+)["']/g;
while ((match = attrRegex.exec(html)) !== null) {
  const [, attr, val] = match;
  if (
    !val ||
    val.startsWith('https://') ||
    val.startsWith('http://') ||
    val.startsWith('data:') ||
    val.startsWith('mailto:') ||
    val.startsWith('tel:') ||
    val.startsWith('#') ||
    val.startsWith('javascript:') ||
    val.startsWith('//') ||
    val.startsWith('/')
  ) {
    continue;
  }
  const cleanPath = val.split('?')[0].split('#')[0];
  if (cleanPath && !cleanPath.startsWith('{') && !cleanPath.startsWith('(')) {
    localReferences.push({ attr, path: cleanPath });
  }
}

const missingFiles = [];
for (const ref of localReferences) {
  const candidate = resolve(ROOT, ref.path);
  if (!existsSync(candidate)) {
    missingFiles.push(`${ref.path} (file not found)`);
  }
}

console.log(`HTML IDs: ${ids.length}`);
console.log(`Direct JS DOM references: ${refs.size}`);
console.log(`Local HTML asset references: ${localReferences.length}`);
console.log(`Duplicate IDs: ${duplicates.length > 0 ? duplicates.join(', ') : 'none'}`);
console.log(`Missing direct JS DOM IDs: ${missingIds.length > 0 ? missingIds.join(', ') : 'none'}`);
console.log(`Missing local assets: ${missingFiles.length > 0 ? missingFiles.join(', ') : 'none'}`);

if (duplicates.length > 0 || missingIds.length > 0 || missingFiles.length > 0) {
  process.exit(1);
}

