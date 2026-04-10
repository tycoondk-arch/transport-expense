const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: {
    headless: true,
    viewport: { width: 390, height: 844 },
  },
  reporter: [['list'], ['json', { outputFile: 'results.json' }]],
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } }
  ]
});
