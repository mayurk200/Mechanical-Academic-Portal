// =============================================================
// Cloud Function: deleteAuthUsers
// Allows admins to delete Firebase Auth accounts by UID list.
// Only callable by authenticated admin users.
// =============================================================

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

exports.deleteAuthUsers = onCall(async (request) => {
  // 1. Must be authenticated
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in.");
  }

  // 2. Must be an admin
  const callerUid = request.auth.uid;
  const callerDoc = await admin.firestore().collection("users").doc(callerUid).get();

  if (!callerDoc.exists || callerDoc.data().role !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can delete user accounts.");
  }

  // 3. Validate input
  const { uids } = request.data;
  if (!uids || !Array.isArray(uids) || uids.length === 0) {
    throw new HttpsError("invalid-argument", "Must provide an array of user UIDs.");
  }

  // Safety: Don't allow deleting the caller's own account
  const filtered = uids.filter(uid => uid !== callerUid);

  if (filtered.length === 0) {
    return { deleted: 0, errors: [] };
  }

  // 4. Delete auth accounts in batches (max 1000 per call)
  try {
    const result = await admin.auth().deleteUsers(filtered);
    return {
      deleted: result.successCount,
      errors: result.errors.map(e => ({
        uid: filtered[e.index],
        message: e.error.message
      }))
    };
  } catch (err) {
    throw new HttpsError("internal", `Failed to delete auth users: ${err.message}`);
  }
});
