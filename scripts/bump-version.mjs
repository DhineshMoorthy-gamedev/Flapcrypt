#!/usr/bin/env node
/**
 * Version bumper for FlapCrypt.
 * Single source of truth: package.json ("version" + "versionCode").
 *   npm run bump -- 0.0.3          # bumps version, auto-increments versionCode
 *   npm run bump -- 0.0.3 4        # bumps version, sets versionCode explicitly
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkgPath = join(root, 'package.json');

const args = process.argv.slice(2);
const newVersion = args[0];
const explicitCode = args[1];

if (!newVersion) {
  console.error('Usage: npm run bump -- <semver> [versionCode]');
  console.error('  e.g. npm run bump -- 0.0.3');
  console.error('  e.g. npm run bump -- 0.0.3 4');
  process.exit(1);
}

if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(newVersion)) {
  console.error(`Invalid version "${newVersion}". Expected semver like 1.2.3 or 1.2.3-beta.1`);
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const oldVersion = pkg.version;
const oldCode = Number(pkg.versionCode);

if (!Number.isInteger(oldCode) || oldCode < 1) {
  console.error('package.json "versionCode" must be a positive integer.');
  process.exit(1);
}

const newCode = explicitCode !== undefined ? Number(explicitCode) : oldCode + 1;

if (!Number.isInteger(newCode) || newCode < 1) {
  console.error(`Invalid versionCode "${explicitCode}". Expected a positive integer.`);
  process.exit(1);
}

if (newVersion === oldVersion && newCode === oldCode) {
  console.log(`Already at ${newVersion} (versionCode ${newCode}). Nothing to do.`);
  process.exit(0);
}

if (newCode <= oldCode) {
  console.error(`versionCode must increase: ${newCode} <= ${oldCode}. Play Console rejects non-increasing codes.`);
  process.exit(1);
}

if (newVersion === oldVersion) {
  console.warn(`Warning: versionCode bumped to ${newCode} but version name stayed "${oldVersion}".`);
}

pkg.version = newVersion;
pkg.versionCode = newCode;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

console.log(`Bumped ${oldVersion} (code ${oldCode}) -> ${newVersion} (code ${newCode})`);
console.log('Next: npm run build:playstore');
