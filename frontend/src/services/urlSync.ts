export const urlSync = {
    setMode: (mode: string) => {
        const url = new URL(window.location.href);
        const segments = url.pathname.split('/').filter(Boolean);
        const currentPath = segments.length > 0 ? segments[segments.length - 1] : '';

        if (currentPath !== mode) {
            let newSearch = url.search;
            if (['study', 'cheatsheet', 'info'].includes(mode)) {
                newSearch = '';
            }
            window.history.pushState(null, '', `/${mode}${newSearch}`);
        }
    },
    setParams: (params: Record<string, string | null>) => {
        const url = new URL(window.location.href);
        let changed = false;
        Object.entries(params).forEach(([k, v]) => {
            if (v === null) {
                if (url.searchParams.has(k)) { url.searchParams.delete(k); changed = true; }
            } else {
                if (url.searchParams.get(k) !== v) { url.searchParams.set(k, v); changed = true; }
            }
        });
        if (changed) {
            window.history.replaceState(null, '', url.pathname + url.search);
        }
    },
    getMode: (): any => {
        const path = window.location.pathname.replace('/', '');
        const validModes = ['study', 'workbench', 'cheatsheet', 'testing', 'info'];
        return validModes.includes(path) ? path : 'study';
    },
    getParam: (key: string) => {
        return new URLSearchParams(window.location.search).get(key);
    },
    getArrayParam: (key: string): string[] => {
        const val = new URLSearchParams(window.location.search).get(key);
        return val ? val.split(',') : [];
    }
}
