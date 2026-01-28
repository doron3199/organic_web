
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const sourceDir = path.resolve(projectRoot, 'node_modules/ketcher-standalone/dist/binaryWasm');
const destDir = path.resolve(projectRoot, 'public');

console.log(`Copying Ketcher files from ${sourceDir} to ${destDir}...`);

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

if (!fs.existsSync(sourceDir)) {
    console.error(`Source directory not found: ${sourceDir}`);
    process.exit(1);
}

const files = fs.readdirSync(sourceDir);

files.forEach(file => {
    const srcPath = path.join(sourceDir, file);
    const destPath = path.join(destDir, file);

    // Copy original file
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied: ${file}`);

    // Create standard alias if it looks like a versioned file
    let alias = null;
    // ANCHORED REGEX FIX: Must end with $.
    if (file.match(/indigo-ketcher-\d+\.\d+\.\d+\.wasm$/)) {
        alias = 'indigo-ketcher.wasm';
    } else if (file.match(/indigo-ketcher-norender-\d+\.\d+\.\d+\.wasm$/)) {
        alias = 'indigo-ketcher-norender.wasm';
    } else if (file.match(/indigoWorker-[a-f0-9]+\.js$/)) {
        alias = 'indigoWorker.js';
        // Check if map exists for this worker
        if (files.includes(file + '.map')) {
            const mapAlias = 'indigoWorker.js.map';
            fs.copyFileSync(path.join(sourceDir, file + '.map'), path.join(destDir, mapAlias));
            console.log(`Created alias: ${mapAlias}`);
        }
    }

    if (alias) {
        fs.copyFileSync(srcPath, path.join(destDir, alias));
        console.log(`Created alias: ${alias} -> ${file}`);
    }
});

console.log('Ketcher setup complete.');
