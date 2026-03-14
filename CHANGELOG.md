# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] — 2026-03-14

### 🏗 Architecture Refactoring
- **BREAKING**: Monolithic `services/database.js` decomposed into 9 individual repository files
- New `src/` directory with modular architecture: config, core, database, services, components, utils
- Repository pattern: all Firestore CRUD isolated in `src/database/repositories/`
- Service barrel export for backward compatibility (`src/services/index.js`)
- Bridge files in old locations re-export from new structure (zero HTML changes needed)

### ✨ New Features
- Centralized application config (`src/config/appConfig.js`) with feature flags
- Constants file (`src/config/constants.js`) — no more magic strings
- Event bus (`src/core/eventBus.js`) for cross-module communication
- Session manager (`src/core/sessionManager.js`)
- Auth guard utilities (`src/core/authGuard.js`)
- Upload service with CSV parsing and validation (`src/services/uploadService.js`)
- Centralized error handler with error codes (`src/utils/errorHandler.js`)
- File parser utilities (`src/utils/fileParser.js`)
- ID generator utilities (`src/utils/idGenerator.js`)
- Batch write utilities for Firestore (500-doc batches)
- Paginated query helper

### 🔒 Security
- Firebase credentials moved to gitignored file (`config/firebase-credentials.js`)
- `.env.example` template for safe credential sharing
- GitHub CI checks for hardcoded API keys

### 🛠 DevOps
- Semantic version bump script (`scripts/versionUpdate.js`)
- Project structure validator (`scripts/validateStructure.js`)
- GitHub Actions CI pipeline (`.github/workflows/ci.yml`)
- Comprehensive `.gitignore`
- Root `package.json` with dev scripts

### 📄 Documentation
- Full `README.md` with architecture diagram and setup guide
- Database schema documentation (`docs/database.md`)
- Architecture overview (`docs/architecture.md`)

## [1.1.0] — 2026-03-14
### Added
- Admin system: user management, system settings, factory reset
- Bulk student upload with department alias normalization
- Attendance matrix UI with rapid absent-entry mode
- Question builder with structured editing

## [1.0.0] — 2026-03-12
### Added
- Student login with URN
- Admin dashboard with statistics
- Attendance system with aggregate counters
- Test creation and auto-grading
- Course management and enrollment
