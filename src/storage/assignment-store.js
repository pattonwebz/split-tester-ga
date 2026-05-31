const sharedMemoryEntries = new Map();

function createMemoryStorage() {
  return {
    getItem(key) {
      return sharedMemoryEntries.has(key) ? sharedMemoryEntries.get(key) : null;
    },
    setItem(key, value) {
      sharedMemoryEntries.set(key, String(value));
    },
    removeItem(key) {
      sharedMemoryEntries.delete(key);
    }
  };
}

function getBrowserStorage() {
  if (typeof globalThis === "undefined") {
    return null;
  }

  try {
    const storage = globalThis.localStorage;
    if (!storage) {
      return null;
    }
    const testKey = "__split_tester_test__";
    storage.setItem(testKey, "1");
    storage.removeItem(testKey);
    return storage;
  } catch {
    return null;
  }
}

function normalizeStorage(storage) {
  if (!storage) {
    return createMemoryStorage();
  }

  if (
    typeof storage.getItem === "function" &&
    typeof storage.setItem === "function" &&
    typeof storage.removeItem === "function"
  ) {
    return storage;
  }

  return createMemoryStorage();
}

export function createAssignmentStore(storage = getBrowserStorage()) {
  const backend = normalizeStorage(storage);

  return {
    get(key) {
      try {
        return backend.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        backend.setItem(key, value);
      } catch {
        // Ignore storage failures and continue with in-memory assignments.
      }
    },
    delete(key) {
      try {
        backend.removeItem(key);
      } catch {
        // Ignore storage failures.
      }
    }
  };
}
