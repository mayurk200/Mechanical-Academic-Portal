// ============================================================
// LMS Platform — Department Repository
// Firestore CRUD for 'departments' collection
// ============================================================

import { db, collection, getDocs, query, orderBy } from '../firestore.js';
import { COLLECTIONS } from '../../config/constants.js';

const COL = COLLECTIONS.DEPARTMENTS;

export const DepartmentRepository = {
  /**
   * Retrieves all departments from the database
   */
  async getAll() {
    try {
      // Assuming departments might be ordered by name or code.
      const snap = await getDocs(query(collection(db, COL), orderBy('name', 'asc')));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.error('DepartmentRepository.getAll error:', err);
      // Fallback: If ordering requires an index that doesn't exist yet
      try {
        const snap = await getDocs(collection(db, COL));
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e2) {
        console.error('DepartmentRepository.getAll fallback error:', e2);
        return [];
      }
    }
  }
};
