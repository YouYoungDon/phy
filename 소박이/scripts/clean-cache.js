const os = require('os');
const fs = require('fs');
const path = require('path');

const tmp = os.tmpdir();

// Clear Metro transform cache
fs.rmSync(path.join(tmp, 'metro-cache'), { recursive: true, force: true });

// Clear Haste map cache (file listing cache that causes SHA-1 errors)
const jestDir = path.join(tmp, 'jest');
if (fs.existsSync(jestDir)) {
  fs.readdirSync(jestDir)
    .filter((f) => f.startsWith('haste-map'))
    .forEach((f) => fs.rmSync(path.join(jestDir, f), { force: true }));
}

console.log('Metro cache cleared (metro-cache + haste-map)');
