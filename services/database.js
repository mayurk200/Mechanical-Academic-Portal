// ============================================================
// LMS Platform — Backward-Compatible Bridge
// Re-exports from new src/ structure using old import names
// This file replaces the old services/database.js
// ============================================================

export {
  UserService, CourseService, SectionService, EnrollmentService,
  AttendanceService, TestService, QuestionBankService, ResultService,
  AssignmentService, SubmissionService, NotificationService, ActivityLogService,
  ExamActivityLogService, DepartmentService
} from '../src/services/index.js';
