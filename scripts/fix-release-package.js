#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packagePath = join(__dirname, '../release/package.json');
const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));

// Update entry points to remove "release/" prefix since we're publishing from inside release/
pkg.main = 'index.js';
pkg.module = 'index.esm.js';
pkg.types = 'index.d.ts';

// Update files field to only include what's in release folder
pkg.files = [
  'index.js',
  'index.esm.js',
  'index.d.ts',
  'bundle',
  'README.md',
  'LICENSE'
];

// Remove scripts that are only for development
delete pkg.scripts;
delete pkg.devDependencies;

writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
console.log('✓ Fixed package.json paths for release folder');
