import { minify } from 'terser';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production' || process.env.BUILD_MODE === 'production';

if (!isProduction) {
  console.log('Skipping worker minification in development mode');
  process.exit(0);
}

async function minifyWorker() {
  const workerPath = join(__dirname, '../release/bundle/bin/complete/worker.js');

  try {
    const code = readFileSync(workerPath, 'utf-8');

    const result = await minify(code, {
      compress: {
        drop_console: true, // Remove all console.* statements
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
      },
      mangle: {
        keep_classnames: true,
        keep_fnames: false,
      },
      format: {
        comments: false,
      },
    });

    if (result.code) {
      writeFileSync(workerPath, result.code, 'utf-8');
      console.log('✓ Worker.js minified successfully (console.log removed)');
    } else {
      console.error('✗ Failed to minify worker.js');
      process.exit(1);
    }
  } catch (error) {
    console.error('✗ Error minifying worker.js:', error.message);
    process.exit(1);
  }
}

minifyWorker();
