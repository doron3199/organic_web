// vitest.setup.ts
import { beforeAll } from 'vitest';

beforeAll(async () => {
    if (typeof window !== 'undefined' && !window.initRDKitModule) {
        console.log('Injecting RDKit script...');
        await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = "https://unpkg.com/@rdkit/rdkit/dist/RDKit_minimal.js";
            script.onload = () => {
                console.log('RDKit script loaded');
                resolve();
            };
            script.onerror = (e) => {
                console.error('Failed to load RDKit', e);
                reject(e);
            };
            document.head.appendChild(script);
        });
    }
});
