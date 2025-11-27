import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import dts from 'rollup-plugin-dts';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import postcss from 'rollup-plugin-postcss';
import copy from 'rollup-plugin-copy';
import obfuscator from 'rollup-plugin-obfuscator';
import terser from '@rollup/plugin-terser';
import { readFileSync } from 'fs';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));

// Check if building for production (no sourcemaps)
const isProduction = process.env.NODE_ENV === 'production' || process.env.BUILD_MODE === 'production';

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: packageJson.main,
        format: 'cjs',
        sourcemap: !isProduction,
        inlineDynamicImports: true,
        exports: 'named',
        // Compatible with webpack and other bundlers
        interop: 'auto',
      },
      {
        file: packageJson.module,
        format: 'esm',
        sourcemap: !isProduction,
        inlineDynamicImports: true,
        // Preserve modules for better tree-shaking
        preserveModules: false,
      },
    ],
    plugins: [
      peerDepsExternal(),
      json(),
      resolve({
        browser: true,
        // Support both old and new extensions
        extensions: ['.mjs', '.js', '.jsx', '.json', '.ts', '.tsx'],
        // Prefer browser versions
        mainFields: ['browser', 'module', 'main'],
      }),
      commonjs({
        // Convert CommonJS to ES modules
        include: /node_modules/,
        // Support named exports from CommonJS
        requireReturnsDefault: 'auto',
      }),
      typescript({
        tsconfig: './tsconfig.json',
        exclude: ['**/*.test.ts', '**/*.test.tsx'],
        compilerOptions: {
          // Target ES5 to support older browsers
          target: 'ES5',
          // Use React.createElement instead of new JSX transform
          jsx: 'react',
          outDir: 'release/types',
          declarationDir: 'release/types',
          declarationMap: !isProduction,
          // Options for compatibility with older React versions
          lib: ['ES2015', 'ES2016', 'ES2017', 'DOM'],
          downlevelIteration: true,
          importHelpers: true,
        },
      }),
      postcss({
        minimize: true,
        // Inject CSS into JS for webpack compatibility
        inject: true,
        // Support CSS modules
        modules: false,
      }),
      // Remove console.log in production
      isProduction && terser({
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
          // Maintain ES5 compatibility
          ecma: 5,
        },
        mangle: {
          keep_classnames: true,
          keep_fnames: false,
        },
        format: {
          comments: false,
          ecma: 5,
        },
        // Ensure compatibility with IE11 and older browsers
        safari10: true,
      }),
      copy({
        targets: [
          {
            src: [
              'rust-qr/pkg/veloqr.js',
              'rust-qr/pkg/veloqr.d.ts',
              'rust-qr/pkg/veloqr_bg.wasm',
              'rust-qr/pkg/veloqr_bg.wasm.d.ts'
            ],
            dest: 'release/bundle/bin/complete',
          },
          {
            src: 'src/workers/worker.js',
            dest: 'release/bundle/bin/complete',
            rename: 'worker.js'
          },
          {
            src: 'LICENSE',
            dest: 'release',
          },
          {
            src: 'package.json',
            dest: 'release',
          },
          {
            src: 'README.npm.md',
            dest: 'release',
            rename: 'README.md'
          }
        ],
        hook: 'writeBundle',
        copyOnce: true,
      }),
      // Strong obfuscation for production builds
      isProduction && obfuscator({
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.75,
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.4,
        debugProtection: false,
        disableConsoleOutput: false,
        identifierNamesGenerator: 'hexadecimal',
        log: false,
        numbersToExpressions: true,
        renameGlobals: false,
        selfDefending: true,
        simplify: true,
        splitStrings: true,
        splitStringsChunkLength: 5,
        stringArray: true,
        stringArrayCallsTransform: true,
        stringArrayEncoding: ['rc4'],
        stringArrayIndexShift: true,
        stringArrayRotate: true,
        stringArrayShuffle: true,
        stringArrayWrappersCount: 2,
        stringArrayWrappersChainedCalls: true,
        stringArrayWrappersParametersMaxCount: 4,
        stringArrayWrappersType: 'function',
        stringArrayThreshold: 0.75,
        transformObjectKeys: true,
        unicodeEscapeSequence: false
      }),
    ].filter(Boolean),
    // External dependencies - do not bundle react and react-dom
    external: ['react', 'react-dom', 'react/jsx-runtime'],
    // Handle circular dependency warnings
    onwarn(warning, warn) {
      // Skip circular dependency warnings
      if (warning.code === 'CIRCULAR_DEPENDENCY') return;
      warn(warning);
    },
  },
  {
    input: 'release/types/index.d.ts',
    output: [{ file: 'release/index.d.ts', format: 'esm' }],
    plugins: [dts()],
    external: [/\.css$/],
  },
];
