
import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        include: ['scripts/extraction.test.ts'],
        environment: 'node',
        setupFiles: [], // Explicitly empty to avoid running browser setup
    },
})
