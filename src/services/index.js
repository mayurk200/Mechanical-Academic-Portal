// ============================================================
// LMS Platform — Services Barrel Export
// Backward-compatible re-exports of all service objects
// Allows:  import { UserService } from '../src/services/index.js'
// ============================================================

// Re-export repositories as services (same API, new location)
export { UserRepository as UserService } from '../database/repositories/userRepository.js';
export { CourseRepository as CourseService, SectionRepository as SectionService } from '../database/repositories/courseRepository.js';
export { EnrollmentRepository as EnrollmentService } from '../database/repositories/enrollmentRepository.js';
export { AttendanceRepository as AttendanceService } from '../database/repositories/attendanceRepository.js';
export { TestRepository as TestService, QuestionBankRepository as QuestionBankService } from '../database/repositories/testRepository.js';
export { ResultRepository as ResultService } from '../database/repositories/resultRepository.js';
export { NotificationRepository as NotificationService } from '../database/repositories/notificationRepository.js';
export { ActivityLogRepository as ActivityLogService } from '../database/repositories/activityLogRepository.js';
export { AssignmentRepository as AssignmentService, SubmissionRepository as SubmissionService } from '../database/repositories/assignmentRepository.js';
