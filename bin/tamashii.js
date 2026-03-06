#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { transpile } from '../src/transpiler.js';

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
  console.log(`
TAMASHII 魂 — Transpiler CLI

Usage:
  tamashii <input.tama> [-o <output.js>]

Options:
  -o, --output    Output file (default: <input>.js)
  -h, --help      Show this help

Examples:
  tamashii hello.tama
  tamashii hello.tama -o hello.js
  `);
  process.exit(0);
}

const inputFile = args[0];
let outputFile = null;

const oIndex = args.indexOf('-o') !== -1 ? args.indexOf('-o') : args.indexOf('--output');
if (oIndex !== -1 && args[oIndex + 1]) {
  outputFile = args[oIndex + 1];
} else {
  outputFile = inputFile.replace(/\.tama$/, '.js');
}

try {
  const inputPath = resolve(inputFile);
  const outputPath = resolve(outputFile);
  
  const source = readFileSync(inputPath, 'utf-8');
  const jsCode = transpile(source);
  
  writeFileSync(outputPath, jsCode, 'utf-8');
  
  console.log(`✓ Transpiled: ${inputFile} → ${outputFile}`);
} catch (error) {
  console.error(`✕ Error: ${error.message}`);
  process.exit(1);
}
