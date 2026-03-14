// ============================================================
// LMS Platform — Structure Validator
// Run: node scripts/validateStructure.js
// ============================================================

import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');

const requiredFiles = [
  // Config
  'config/firebase-config.js',
  'config/firebase-credentials.js',
  'config/version.json',

  // Source Config
  'src/config/firebaseConfig.js',
  'src/config/appConfig.js',
  'src/config/constants.js',

  // Database
  'src/database/firestore.js',
  'src/database/repositories/userRepository.js',
  'src/database/repositories/courseRepository.js',
  'src/database/repositories/enrollmentRepository.js',
  'src/database/repositories/attendanceRepository.js',
  'src/database/repositories/testRepository.js',
  'src/database/repositories/resultRepository.js',
  'src/database/repositories/notificationRepository.js',
  'src/database/repositories/activityLogRepository.js',
  'src/database/repositories/assignmentRepository.js',

  // Services
  'src/services/index.js',
  'src/services/authService.js',
  'src/services/uploadService.js',

  // Core
  'src/core/router.js',
  'src/core/authGuard.js',
  'src/core/sessionManager.js',
  'src/core/eventBus.js',

  // Utils
  'src/utils/logger.js',
  'src/utils/errorHandler.js',
  'src/utils/validators.js',
  'src/utils/dateUtils.js',
  'src/utils/fileParser.js',
  'src/utils/idGenerator.js',

  // Components
  'src/components/ui/modal.js',
  'src/components/ui/notification.js',
  'src/components/ui/loader.js',
  'src/components/ui/dropdown.js',

  // Root files
  '.gitignore',
  'package.json',
  '.env.example',
  'README.md',
  'CHANGELOG.md',
  'firebase.json',
  'firestore.rules',
];

console.log('🔍 Validating project structure...\n');

let missing = 0;
let found = 0;

requiredFiles.forEach(file => {
  const fullPath = resolve(root, file);
  if (existsSync(fullPath)) {
    console.log(`  ✅ ${file}`);
    found++;
  } else {
    console.log(`  ❌ ${file} — MISSING`);
    missing++;
  }
});

console.log(`\n📊 Result: ${found} found, ${missing} missing`);

if (missing > 0) {
  console.log('\n⚠️  Some files are missing. Please check the project structure.');
  process.exit(1);
} else {
  console.log('\n✅ All required files are present!');
}
