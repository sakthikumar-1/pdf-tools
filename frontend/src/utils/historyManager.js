/**
 * Simatrix PDF Tools - History Manager
 * Tracks file processing activities per user session and persists to localStorage.
 */

const GLOBAL_HISTORY_KEY = 'simatrix_pdf_history';
const MAX_HISTORY_ITEMS = 50;

/**
 * Gets the current active user email if authenticated, or null for guest.
 */
function getActiveUserEmail() {
  try {
    const raw = localStorage.getItem('simatrix_auth_user');
    if (raw) {
      const user = JSON.parse(raw);
      return user?.email || null;
    }
  } catch {
    // Ignore JSON error
  }
  return null;
}

/**
 * Gets the localStorage key for the given user email or active user.
 */
function getStorageKey(userEmail) {
  const email = userEmail !== undefined ? userEmail : getActiveUserEmail();
  return email ? `simatrix_pdf_history_${email.toLowerCase().trim()}` : GLOBAL_HISTORY_KEY;
}

/**
 * Records a completed file processing activity to history.
 * @param {Object} item
 * @param {string} item.fileName - Name of original or resulting file
 * @param {number|string} item.fileSize - Size in bytes or formatted string
 * @param {string} item.toolName - Name of the tool used (e.g., 'Reorder PDF', 'Crop PDF')
 * @param {string} [item.status='Completed'] - Status string
 * @param {string} [item.userEmail] - Optional user email override
 */
export function addHistoryItem({
  fileName,
  fileSize,
  toolName,
  status = 'Completed',
  userEmail
}) {
  if (!fileName && !toolName) return;

  const email = userEmail !== undefined ? userEmail : getActiveUserEmail();
  const timestamp = new Date().toISOString();
  const id = `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const newEntry = {
    id,
    fileName: fileName || 'document.pdf',
    fileSize: typeof fileSize === 'number' ? fileSize : (fileSize || 0),
    toolName: toolName || 'PDF Utility',
    timestamp,
    status: status || 'Completed',
    userEmail: email || 'guest'
  };

  // Helper to append and trim
  const saveToKey = (key) => {
    try {
      const existingRaw = localStorage.getItem(key);
      let list = existingRaw ? JSON.parse(existingRaw) : [];
      if (!Array.isArray(list)) list = [];
      
      // Avoid immediate duplicate within 3 seconds
      if (list.length > 0 && list[0].fileName === newEntry.fileName && list[0].toolName === newEntry.toolName) {
        const timeDiff = Math.abs(new Date(timestamp) - new Date(list[0].timestamp));
        if (timeDiff < 3000) return;
      }

      list.unshift(newEntry);
      if (list.length > MAX_HISTORY_ITEMS) {
        list = list.slice(0, MAX_HISTORY_ITEMS);
      }
      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {
      console.warn(`[historyManager] Failed to save history to ${key}:`, e);
    }
  };

  // Always save to the global history list
  saveToKey(GLOBAL_HISTORY_KEY);

  // If user is authenticated, also save to their user-specific history list
  if (email) {
    saveToKey(`simatrix_pdf_history_${email.toLowerCase().trim()}`);
  }

  // Dispatch custom event so any mounted History component updates in real time
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('simatrix_history_updated', { detail: newEntry }));
  }

  return newEntry;
}

/**
 * Retrieves history items for the active user or given user email.
 * Falls back to global history if user list is empty.
 * @param {string} [userEmail]
 * @returns {Array} List of history items
 */
export function getHistoryItems(userEmail) {
  const email = userEmail !== undefined ? userEmail : getActiveUserEmail();
  const userKey = email ? `simatrix_pdf_history_${email.toLowerCase().trim()}` : null;

  try {
    if (userKey) {
      const userRaw = localStorage.getItem(userKey);
      if (userRaw) {
        const parsed = JSON.parse(userRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }

    // Fallback to global history key
    const globalRaw = localStorage.getItem(GLOBAL_HISTORY_KEY);
    if (globalRaw) {
      const parsed = JSON.parse(globalRaw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[historyManager] Failed to retrieve history:', e);
  }

  return [];
}

/**
 * Deletes a single history item by ID or index.
 */
export function removeHistoryItem(identifier, userEmail) {
  const email = userEmail !== undefined ? userEmail : getActiveUserEmail();
  const keys = [GLOBAL_HISTORY_KEY];
  if (email) keys.push(`simatrix_pdf_history_${email.toLowerCase().trim()}`);

  keys.forEach((key) => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        let list = JSON.parse(raw);
        if (Array.isArray(list)) {
          list = list.filter((item, idx) => item.id !== identifier && idx !== identifier);
          localStorage.setItem(key, JSON.stringify(list));
        }
      }
    } catch (e) {
      console.warn(`[historyManager] Failed to remove item from ${key}:`, e);
    }
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('simatrix_history_updated'));
  }
}

/**
 * Clears all history for the active user and globally.
 */
export function clearAllHistory(userEmail) {
  const email = userEmail !== undefined ? userEmail : getActiveUserEmail();
  try {
    localStorage.removeItem(GLOBAL_HISTORY_KEY);
    if (email) {
      localStorage.removeItem(`simatrix_pdf_history_${email.toLowerCase().trim()}`);
    }
  } catch (e) {
    console.warn('[historyManager] Failed to clear history:', e);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('simatrix_history_updated'));
  }
}
