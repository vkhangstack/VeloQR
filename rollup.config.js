import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import dts from 'rollup-plugin-dts';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import postcss from 'rollup-plugin-postcss';
import copy from 'rollup-plugin-copy';
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
          declarationMap: !isProduction,
        },
      }),
      postcss({
        minimize: true,
      }),
      copy({
        targets: [
          {
            src: 'rust-qr/pkg/*',
            dest: 'dist/bundle/bin/complete',
          },
        ],
        hook: 'writeBundle',
        copyOnce: true,
      }),
    ],
    external: ['react', 'react-dom'],
  },
  {
    input: 'dist/index.d.ts',
    output: [{ file: 'dist/index.d.ts', format: 'esm' }],
    plugins: [dts()],
    external: [/\.css$/],
  },
];
