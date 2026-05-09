import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    timeout: 45000,
    expect: {
        timeout: 5000
    },
    fullyParallel: false,
    workers: 1,
    retries: 0,
    use: {
        baseURL: 'http://127.0.0.1:4173',
        headless: true,
        viewport: { width: 1440, height: 900 }
    },
    projects: [
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                permissions: ['clipboard-read', 'clipboard-write']
            }
        },
        {
            name: 'firefox',
            use: {
                ...devices['Desktop Firefox']
            }
        }
    ],
    webServer: {
        command: 'node tests/e2e/static-server.mjs',
        url: 'http://127.0.0.1:4173',
        reuseExistingServer: true,
        timeout: 120000
    }
});
