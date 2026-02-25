export const urlSync = {
    setMode: (mode: string) => {
        const url = new URL(window.location.href);
        const segments = url.pathname.split('/').filter(Boolean);
        const currentMode = segments.length > 0 ? segments[0] : '';

        if (currentMode !== mode) {
            let newSearch = url.search;
            let newHash = url.hash;

            if (['cheatsheet', 'info'].includes(mode)) {
                newSearch = '';
                newHash = '';
                window.history.pushState(null, '', `/${mode}${newSearch}${newHash}`);
            } else if (mode === 'workbench' || mode === 'testing') {
                const searchParams = new URLSearchParams(url.search);
                const keys = Array.from(searchParams.keys());
                for (const k of keys) {
                    if (!['smiles', 'submode', 'conditions'].includes(k)) {
                        searchParams.delete(k);
                    }
                }
                newSearch = searchParams.toString() ? `?${searchParams.toString()}` : '';
                newHash = '';
                window.history.pushState(null, '', `/${mode}${newSearch}${newHash}`);
            } else if (mode === 'study') {
                newSearch = '';
                newHash = '';
                window.history.pushState(null, '', `/${mode}${newSearch}${newHash}`);
            }
        }
    },
    setStudyPath: (subject: string, subsubject: string) => {
        const url = new URL(window.location.href);
        const newPath = `/study/${subject}`;
        const newHash = subsubject ? `#${subsubject}` : '';

        if (url.pathname !== newPath || url.hash !== newHash) {
            window.history.replaceState(null, '', `${newPath}${url.search}${newHash}`);
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
            window.history.replaceState(null, '', url.pathname + url.search + url.hash);
        }
    },
    getMode: (): any => {
        const segments = window.location.pathname.split('/').filter(Boolean);
        const mode = segments.length > 0 ? segments[0] : '';
        const validModes = ['study', 'workbench', 'cheatsheet', 'testing', 'info'];
        return validModes.includes(mode) ? mode : 'study';
    },
    getSubject: (): string | null => {
        const segments = window.location.pathname.split('/').filter(Boolean);
        const mode = segments.length > 0 ? segments[0] : '';
        if (mode === 'study' && segments.length > 1) {
            return segments[1];
        }
        return new URLSearchParams(window.location.search).get('subject');
    },
    getSubSubject: (): string | null => {
        const hash = window.location.hash.replace('#', '');
        if (hash) return hash;
        return new URLSearchParams(window.location.search).get('subsubject');
    },
    getParam: (key: string) => {
        return new URLSearchParams(window.location.search).get(key);
    },
    getArrayParam: (key: string): string[] => {
        const val = new URLSearchParams(window.location.search).get(key);
        return val ? val.split(',') : [];
    }
}
