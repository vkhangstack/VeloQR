import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import dts from 'rollup-plugin-dts';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import postcss from 'rollup-plugin-postcss';
import copy from 'rollup-plugin-copy';
import obfuscator from 'rollup-plugin-obfuscator';
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
      },
      {
        file: packageJson.module,
        format: 'esm',
        sourcemap: !isProduction,
        inlineDynamicImports: true,
      },
    ],
    plugins: [
      peerDepsExternal(),
      json(),
      resolve({
        browser: true,
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        exclude: ['**/*.test.ts', '**/*.test.tsx'],
        compilerOptions: {
          outDir: 'release/types',
          declarationDir: 'release/types',
          declarationMap: !isProduction,
        },
      }),
      postcss({
        minimize: true,
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
            src: 'public/worker.js',
            dest: 'release/bundle/bin/complete',
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
    external: ['react', 'react-dom'],
  },
  {
    input: 'release/types/index.d.ts',
    output: [{ file: 'release/index.d.ts', format: 'esm' }],
    plugins: [dts()],
    external: [/\.css$/],
  },
];
