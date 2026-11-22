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

const tauriConfPath = join(root, 'src-tauri', 'tauri.conf.json');
const tauriConf = JSON.parse(readFileSync(tauriConfPath, 'utf8'));
tauriConf.version = newVersion;
writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n', 'utf8');

const cargoTomlPath = join(root, 'src-tauri', 'Cargo.toml');
const cargoToml = readFileSync(cargoTomlPath, 'utf8');
const cargoTomlNext = cargoToml.replace(
  /^(\[package\][\s\S]*?^version\s*=\s*)"[^"]*"/m,
  `$1"${newVersion}"`
);
if (cargoTomlNext === cargoToml && !cargoToml.includes(`version = "${newVersion}"`)) {
  console.error('Failed to update version in src-tauri/Cargo.toml.');
  process.exit(1);
}
writeFileSync(cargoTomlPath, cargoTomlNext, 'utf8');

try {
  const { execFileSync } = await import('node:child_process');
  execFileSync('cargo', ['update', '-p', 'flapcrypt'], {
    cwd: join(root, 'src-tauri'),
    stdio: 'inherit',
  });
} catch {
  console.warn('Warning: could not refresh src-tauri/Cargo.lock (cargo not found?). Run `cargo update -p flapcrypt` manually.');
}

console.log(`Bumped ${oldVersion} (code ${oldCode}) -> ${newVersion} (code ${newCode})`);
console.log('Synced: package.json, src-tauri/tauri.conf.json, src-tauri/Cargo.toml, src-tauri/Cargo.lock');
console.log('Next: npm run build:playstore');
