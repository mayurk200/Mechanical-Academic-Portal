// ============================================================
// LMS Platform — Auth Bridge (Backward Compatibility)
// Re-exports from src/services/authService.js
// ============================================================

export {
  loginUser, registerUser, loginWithURN, logoutUser,
  resetPassword, createStaffAccount, createStudentAccount,
  createBulkStudentHelper, reauthAndChangePassword,
  verifyCurrentPassword, redirectToDashboard,
  guardPublicPage, getCurrentUser
} from '../../../src/services/authService.js';
