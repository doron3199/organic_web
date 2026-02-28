/// <reference types="vitest/globals" />
// vitest.setup.ts
async function initNodeRdkit(): Promise<boolean> {
    if (typeof process === 'undefined' || !process.versions?.node) {
        return false;
    }

    try {
        const mod = await import('@rdkit/rdkit');
        const initRDKitModule = mod.default ?? (mod as any).initRDKitModule;
        if (!initRDKitModule) {
            return false;
        }

        (globalThis as any).initRDKitModule = initRDKitModule;
        if (typeof window !== 'undefined') {
            (window as any).initRDKitModule = initRDKitModule;
        }
        return true;
    } catch (e) {
        console.warn('Node RDKit init failed, falling back to CDN:', e);
        return false;
    }
}

beforeAll(async () => {
    const ready = await initNodeRdkit();
    if (ready) {
        return;
    }

    if (typeof window !== 'undefined' && !window.initRDKitModule) {
        await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/@rdkit/rdkit/dist/RDKit_minimal.js';
            script.onload = () => resolve();
            script.onerror = (e) => reject(e);
            document.head.appendChild(script);
        });
    }
});
