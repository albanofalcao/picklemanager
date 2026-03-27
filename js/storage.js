'use strict';

/**
 * Storage — LocalStorage CRUD wrapper
 * All keys are namespaced with prefix 'pm_'
 */
const Storage = {
  _PREFIX: 'pm_',

  /** Read and parse JSON from localStorage; returns null on error */
  _get(key) {
    try {
      const raw = localStorage.getItem(this._PREFIX + key);
      return raw !== null ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('[Storage._get] Failed to parse key:', key, e);
      return null;
    }
  },

  /** Serialize data to JSON and write to localStorage */
  _set(key, data) {
    try {
      localStorage.setItem(this._PREFIX + key, JSON.stringify(data));
    } catch (e) {
      console.error('[Storage._set] Failed to write key:', key, e);
    }
  },

  /** Generate a unique ID using timestamp (base36) + random suffix */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  /** Return the full array stored under key, or empty array */
  getAll(key) {
    const data = this._get(key);
    return Array.isArray(data) ? data : [];
  },

  /** Find a single item by its id */
  getById(key, id) {
    return this.getAll(key).find(item => item.id === id) || null;
  },

  /** Create a new record; auto-assigns id, createdAt, updatedAt */
  create(key, data) {
    const list = this.getAll(key);
    const now = new Date().toISOString();
    const record = {
      ...data,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
    };
    list.push(record);
    this._set(key, list);
    return record;
  },

  /**
   * Update an existing record by id.
   * Merges data, updates updatedAt, preserves id and createdAt.
   * Returns updated record or null if not found.
   */
  update(key, id, data) {
    const list = this.getAll(key);
    const index = list.findIndex(item => item.id === id);
    if (index === -1) return null;
    const existing = list[index];
    const now = new Date().toISOString();
    const updated = {
      ...existing,
      ...data,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: now,
    };
    list[index] = updated;
    this._set(key, list);
    return updated;
  },

  /** Remove the item with the given id; returns true if found */
  delete(key, id) {
    const list = this.getAll(key);
    const next = list.filter(item => item.id !== id);
    const removed = next.length < list.length;
    this._set(key, next);
    return removed;
  },

  /** Return total count of items under key */
  count(key) {
    return this.getAll(key).length;
  },

  /** Count items that satisfy a predicate function */
  countWhere(key, predicate) {
    return this.getAll(key).filter(predicate).length;
  },

  /**
   * Seed initial data only if the key does NOT already exist in localStorage.
   * Adds id, createdAt, updatedAt to each item.
   */
  seed(key, data) {
    if (this._get(key) !== null) return; // already seeded
    const now = new Date().toISOString();
    const records = data.map(item => ({
      ...item,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
    }));
    this._set(key, records);
  },
};
