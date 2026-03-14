# Mechanical Academic Portal — LMS

A modular, production-grade Learning Management System built with vanilla JavaScript and Firebase. Supports admin, teacher, and student roles with full attendance tracking, test management, and course enrollment.

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- [Firebase CLI](https://firebase.google.com/docs/cli) (`npm install -g firebase-tools`)
- A Firebase project with Firestore, Auth, and Storage enabled

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/mechanical-academic-portal.git
   cd mechanical-academic-portal
   ```

2. **Configure Firebase credentials**
   ```bash
   cp config/firebase-credentials.js.example config/firebase-credentials.js
   ```
   Edit `config/firebase-credentials.js` with your Firebase project config from the [Firebase Console](https://console.firebase.google.com).

3. **Install dependencies** (optional — for dev scripts)
   ```bash
   npm install
   ```

4. **Run locally**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

5. **Deploy to Firebase**
   ```bash
   firebase login
   npm run deploy
   ```

---

## 🏗 Architecture

```
project-root/
├── config/                    # Firebase config & version
│   ├── firebase-config.js     # Firebase initialization
│   ├── firebase-credentials.js # Your Firebase keys (gitignored)
│   └── version.json           # Semantic version
│
├── src/                       # Modular source code
│   ├── config/                # App configuration
│   │   ├── appConfig.js       # Feature flags, limits, routes
│   │   ├── constants.js       # Collection names, error codes
│   │   └── firebaseConfig.js  # Firebase re-export bridge
│   │
│   ├── core/                  # App infrastructure
│   │   ├── router.js          # Sidebar, auth guard, RBAC
│   │   ├── authGuard.js       # Role-based access control
│   │   ├── sessionManager.js  # Auth state management
│   │   └── eventBus.js        # Pub/sub event system
│   │
│   ├── database/              # Data access layer
│   │   ├── firestore.js       # Shared Firestore helpers
│   │   └── repositories/      # Collection-specific CRUD
│   │       ├── userRepository.js
│   │       ├── courseRepository.js
│   │       ├── enrollmentRepository.js
│   │       ├── attendanceRepository.js
│   │       ├── testRepository.js
│   │       ├── resultRepository.js
│   │       ├── notificationRepository.js
│   │       ├── activityLogRepository.js
│   │       └── assignmentRepository.js
│   │
│   ├── services/              # Business logic layer
│   │   ├── index.js           # Barrel export (backward compat)
│   │   ├── authService.js     # Authentication operations
│   │   └── uploadService.js   # File parsing & validation
│   │
│   ├── components/            # Reusable UI components
│   │   └── ui/
│   │       ├── modal.js
│   │       ├── notification.js
│   │       ├── loader.js
│   │       └── dropdown.js
│   │
│   └── utils/                 # Utility modules
│       ├── logger.js          # Structured logging
│       ├── errorHandler.js    # Error codes & messages
│       ├── validators.js      # Input validation
│       ├── dateUtils.js       # Date formatting
│       ├── fileParser.js      # CSV/file parsing
│       └── idGenerator.js     # Unique ID generation
│
├── app/                       # HTML pages (role-based)
├── assets/                    # Static assets (CSS, images)
├── scripts/                   # Dev & build scripts
├── docs/                      # Documentation
├── .github/workflows/         # CI/CD
└── tests/                     # Test files
```

---

## 👥 Roles

| Role | Capabilities |
|------|-------------|
| **Admin** | Full system control, user management, factory reset, data export |
| **Teacher** | Course management, attendance, test creation, student management |
| **Student** | View courses, take tests, view attendance and results |

---

## 🗄 Database Schema (Firestore)

| Collection | Key Fields | Purpose |
|-----------|------------|---------|
| `users` | uid, name, email, role, department, urn | User profiles |
| `courses` | title, code, teacherId | Course catalog |
| `enrollments` | studentId, courseId | Student-course mapping |
| `attendance` | studentId, courseId, date, status | Daily attendance |
| `tests` | courseId, title, questions[], duration | Test definitions |
| `test_results` | testId, studentId, score, answers | Test submissions |
| `notifications` | userId, title, message, read | In-app notifications |
| `activity_logs` | userId, action, details | Audit trail |

See [docs/database.md](docs/database.md) for full schema documentation.

---

## 🛠 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start local dev server |
| `npm run validate` | Validate project structure |
| `npm run version:patch` | Bump patch version (1.0.X) |
| `npm run version:minor` | Bump minor version (1.X.0) |
| `npm run version:major` | Bump major version (X.0.0) |
| `npm run deploy` | Deploy to Firebase Hosting |

---

## 🔒 Security

- Firebase Auth with session persistence
- Role-based access control (RBAC) on every page
- Password-protected admin operations
- Firestore security rules enforcement
- Firebase credentials stored in gitignored file

---

## 📄 License

MIT
