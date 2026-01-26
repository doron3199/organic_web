import * as mod from '@vitest/browser-webdriverio';
console.log('Keys:', Object.keys(mod));
if (mod.webdriverio) {
    console.log('webdriverio type:', typeof mod.webdriverio);
    console.log('webdriverio value:', mod.webdriverio);
}
if (mod.default) {
    console.log('default type:', typeof mod.default);
    console.log('default value:', mod.default);
}
