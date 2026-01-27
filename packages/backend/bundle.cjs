const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

// List of Lambda entry points to bundle
const entryPoints = [
  'handlers/webhooks/shopify.handler',
  'handlers/webhooks/stripe.handler',
  'handlers/webhooks/gocardless.handler',
  'handlers/webhooks/mailchimp.handler',
  'handlers/processors/shopify.processor',
  'handlers/processors/stripe.processor',
  'handlers/processors/gocardless.processor',
  'handlers/processors/futureticketing.processor',
  'handlers/processors/mailchimp.processor',
  'handlers/api/search.handler',
  'handlers/api/profile.handler',
  'handlers/api/timeline.handler',
  'handlers/api/merge.handler',
  'handlers/polling/futureticketing.handler',
  'handlers/scheduled/mailchimp-sync.handler',
  'handlers/scheduled/supporter-type.handler',
  'handlers/scheduled/reconciliation.handler',
  'migrations/run-migrations',
];

async function bundle() {
  // Clean dist folder first (keep structure)
  const distDir = path.join(__dirname, 'dist');
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  fs.mkdirSync(distDir, { recursive: true });

  // First run tsc to compile TypeScript
  const { execSync } = require('child_process');
  execSync('npx tsc', { cwd: __dirname, stdio: 'inherit' });

  // Bundle each entry point
  for (const entry of entryPoints) {
    const inputPath = path.join(__dirname, 'dist', `${entry}.js`);
    if (!fs.existsSync(inputPath)) {
      console.warn(`Warning: ${inputPath} does not exist, skipping...`);
      continue;
    }

    try {
      await esbuild.build({
        entryPoints: [inputPath],
        bundle: true,
        platform: 'node',
        target: 'node18',
        outfile: inputPath,
        allowOverwrite: true,
        external: ['@aws-sdk/*'], // Don't bundle AWS SDK (available in Lambda runtime)
        minify: false,
        sourcemap: false,
      });
      console.log(`Bundled ${entry}`);
    } catch (err) {
      console.error(`Error bundling ${entry}:`, err);
      throw err;
    }
  }

  console.log('Bundling complete!');
}

bundle().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
