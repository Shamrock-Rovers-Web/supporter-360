const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

// List of Lambda entry points to bundle
// Format: { source: source file path, target: target file path (for CDK handler) }
// NOTE: CDK handler format is "filepath.export" where filepath doesn't include .js
// So we output files without .handler extension to match CDK expectations
const entryPoints = [
  // Webhooks
  { source: 'handlers/webhooks/shopify.handler', target: 'handlers/webhooks/shopify-webhook' },
  { source: 'handlers/webhooks/stripe.handler', target: 'handlers/webhooks/stripe-webhook' },
  { source: 'handlers/webhooks/gocardless.handler', target: 'handlers/webhooks/gocardless-webhook' },
  { source: 'handlers/webhooks/mailchimp.handler', target: 'handlers/webhooks/mailchimp-webhook' },

  // Processors
  { source: 'handlers/processors/shopify.processor', target: 'handlers/processors/shopify-processor' },
  { source: 'handlers/processors/stripe.processor', target: 'handlers/processors/stripe-processor' },
  { source: 'handlers/processors/gocardless.processor', target: 'handlers/processors/gocardless-processor' },
  { source: 'handlers/processors/futureticketing.processor', target: 'handlers/processors/futureticketing-processor' },
  { source: 'handlers/processors/mailchimp.processor', target: 'handlers/processors/mailchimp-processor' },

  // API Handlers
  { source: 'handlers/api/search.handler', target: 'handlers/api/search' },
  { source: 'handlers/api/profile.handler', target: 'handlers/api/profile' },
  { source: 'handlers/api/timeline.handler', target: 'handlers/api/timeline' },
  { source: 'handlers/api/admin/merge.handler', target: 'handlers/api/admin/merge' },

  // Scheduled Handlers
  { source: 'handlers/scheduled/future-ticketing-poller.handler', target: 'handlers/scheduled/future-ticketing-poller' },
  { source: 'handlers/scheduled/mailchimp-syncer.handler', target: 'handlers/scheduled/mailchimp-syncer' },
  { source: 'handlers/scheduled/supporter-type-classifier.handler', target: 'handlers/scheduled/supporter-type-classifier' },
  { source: 'handlers/scheduled/reconciler.handler', target: 'handlers/scheduled/reconciler' },

  // Migrations
  { source: 'migrations/run-migrations', target: 'migrations/run-migrations' },
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
  console.log('Running TypeScript compilation...');
  execSync('npx tsc', { cwd: __dirname, stdio: 'inherit' });

  // Bundle each entry point
  console.log('\nBundling Lambda functions...');
  for (const entry of entryPoints) {
    const inputPath = path.join(__dirname, 'dist', `${entry.source}.js`);
    if (!fs.existsSync(inputPath)) {
      console.warn(`Warning: ${inputPath} does not exist, skipping...`);
      continue;
    }

    // The output path - for processors, we need to add .handler before .js
    const outputPath = path.join(__dirname, 'dist', `${entry.target}.js`);

    try {
      await esbuild.build({
        entryPoints: [inputPath],
        bundle: true,
        platform: 'node',
        target: 'node18',
        outfile: outputPath,
        allowOverwrite: true,
        external: ['@aws-sdk/*', 'aws-sdk'], // Don't bundle AWS SDK (available in Lambda runtime)
        minify: false,
        sourcemap: true, // Enable sourcemaps for debugging
        logLevel: 'error',
      });
      console.log(`  Bundled: ${entry.target}`);
    } catch (err) {
      console.error(`Error bundling ${entry.target}:`, err);
      throw err;
    }
  }

  console.log('\nBundling complete!');
  console.log(`Total handlers bundled: ${entryPoints.length}`);

  // List all bundled files
  console.log('\nBundled files:');
  for (const entry of entryPoints) {
    const filePath = path.join(__dirname, 'dist', `${entry.target}.js`);
    const stats = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
    if (stats) {
      console.log(`  ${entry.target} (${(stats.size / 1024).toFixed(1)} KB)`);
    }
  }
}

bundle().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
