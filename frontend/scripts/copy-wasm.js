import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();
const sourceDir = path.join(projectRoot, 'node_modules', 'ketcher-standalone', 'dist', 'binaryWasm');
const destDir = path.join(projectRoot, 'public');

const files = [
    'indigo-ketcher-1.36.0.wasm',
    'indigo-ketcher-norender-1.36.0.wasm'
];

console.log('Project Root:', projectRoot);
console.log('Source Dir:', sourceDir);

files.forEach(file => {
    const src = path.join(sourceDir, file);
    const dest = path.join(destDir, file);
    try {
        fs.copyFileSync(src, dest);
        console.log(`Copied ${file}`);
    } catch (e) {
        console.error(`Failed to copy ${file}:`, e.message);
    }
});
