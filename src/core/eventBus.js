// ============================================================
// LMS Platform — Event Bus
// Simple pub/sub event system for cross-module communication
// ============================================================

const _handlers = new Map();

export const EventBus = {
  // Subscribe to an event
  on(event, handler) {
    if (!_handlers.has(event)) {
      _handlers.set(event, []);
    }
    _handlers.get(event).push(handler);

    // Return unsubscribe function
    return () => this.off(event, handler);
  },

  // Unsubscribe from an event
  off(event, handler) {
    if (!_handlers.has(event)) return;
    const handlers = _handlers.get(event);
    const idx = handlers.indexOf(handler);
    if (idx >= 0) handlers.splice(idx, 1);
  },

  // Emit an event
  emit(event, data = null) {
    if (!_handlers.has(event)) return;
    _handlers.get(event).forEach(handler => {
      try {
        handler(data);
      } catch (err) {
        console.error(`EventBus handler error for "${event}":`, err);
      }
    });
  },

  // Subscribe to an event once
  once(event, handler) {
    const wrapper = (data) => {
      this.off(event, wrapper);
      handler(data);
    };
    this.on(event, wrapper);
  },

  // Clear all handlers for an event
  clear(event = null) {
    if (event) {
      _handlers.delete(event);
    } else {
      _handlers.clear();
    }
  }
};

// ── Pre-defined Events ──────────────────
export const EVENTS = {
  AUTH_STATE_CHANGED: 'auth:stateChanged',
  USER_LOGGED_IN: 'auth:loggedIn',
  USER_LOGGED_OUT: 'auth:loggedOut',
  COURSE_CREATED: 'course:created',
  COURSE_DELETED: 'course:deleted',
  ATTENDANCE_MARKED: 'attendance:marked',
  TEST_SUBMITTED: 'test:submitted',
  DATA_EXPORTED: 'data:exported',
  NOTIFICATION_RECEIVED: 'notification:received',
  CACHE_INVALIDATED: 'cache:invalidated'
};
