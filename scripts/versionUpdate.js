// ============================================================
// LMS Platform — Version Update Script
// Run: node scripts/versionUpdate.js [patch|minor|major]
// ============================================================

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const versionPath = resolve(__dirname, '../config/version.json');

try {
  const versionData = JSON.parse(readFileSync(versionPath, 'utf-8'));
  const [major, minor, patch] = versionData.version.split('.').map(Number);
  const bumpType = process.argv[2] || 'patch';

  let newVersion;
  switch (bumpType) {
    case 'major':
      newVersion = `${major + 1}.0.0`;
      break;
    case 'minor':
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case 'patch':
    default:
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
  }

  versionData.version = newVersion;
  versionData.buildDate = new Date().toISOString().split('T')[0];

  writeFileSync(versionPath, JSON.stringify(versionData, null, 2) + '\n');
  console.log(`✅ Version bumped: ${major}.${minor}.${patch} → ${newVersion}`);
  console.log(`   Build date: ${versionData.buildDate}`);
  console.log(`   Environment: ${versionData.environment}`);
} catch (err) {
  console.error('❌ Failed to update version:', err.message);
  process.exit(1);
}
