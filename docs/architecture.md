# Architecture Overview

## System Layers

```
┌─────────────────────────────────┐
│          HTML Pages             │  ← app/*.html (UI + inline scripts)
├─────────────────────────────────┤
│      Components (UI)            │  ← src/components/ui/
├─────────────────────────────────┤
│    Core (Router, Auth Guard)    │  ← src/core/
├─────────────────────────────────┤
│    Services (Business Logic)    │  ← src/services/
├─────────────────────────────────┤
│  Repositories (Data Access)     │  ← src/database/repositories/
├─────────────────────────────────┤
│   Firestore (Database Layer)    │  ← src/database/firestore.js
├─────────────────────────────────┤
│     Firebase SDK (CDN)          │  ← Auth, Firestore, Storage
└─────────────────────────────────┘
```

## Data Flow

```
User Action → HTML Event Handler → Service → Repository → Firestore
                                      ↓
                                  Event Bus → Other Components
```

## Module Dependency Rules

1. **Repositories** only import from `firestore.js` and `constants.js`
2. **Services** import from repositories and config
3. **Core** modules import from services and config
4. **Components** import from utils only
5. **HTML pages** import from core, services, and components

## Key Design Patterns

- **Repository Pattern**: All database operations are in repository files
- **Bridge Pattern**: Old import paths re-export from new locations
- **Event Bus**: Decoupled cross-module communication
- **Feature Flags**: Enable/disable features via `appConfig.js`
- **Aggregate Counters**: Attendance counts stored on user documents for O(1) reads
