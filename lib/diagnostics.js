'use strict';

const fs = require('fs');
const os = require('os');

const DEFAULT_MAX_EVENTS = 500;
const DEFAULT_MAX_FILE_BYTES = 2 * 1024 * 1024;
const DEFAULT_TAIL_BYTES = 256 * 1024;

function sanitize(value, depth = 0) {
  if (value == null) return value;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.length > 500 ? `${value.slice(0, 500)}...` : value;
  if (depth > 3) return '[depth]';
  if (Array.isArray(value)) return value.slice(0, 50).map(item => sanitize(item, depth + 1));
  if (typeof value === 'object') {
    const result = {};
    for (const [key, inner] of Object.entries(value).slice(0, 80)) {
      result[key] = sanitize(inner, depth + 1);
    }
    return result;
  }
  return String(value);
}

class Diagnostics {
  constructor({ filePath, enabled = false, maxEvents = DEFAULT_MAX_EVENTS, maxFileBytes = DEFAULT_MAX_FILE_BYTES } = {}) {
    this.filePath = filePath;
    this.enabled = !!enabled;
    this.maxEvents = maxEvents;
    this.maxFileBytes = maxFileBytes;
    this.events = [];
    this.startedAt = new Date().toISOString();
    this.fileTrimmedAt = 0;
  }

  setEnabled(enabled) {
    const next = !!enabled;
    if (this.enabled === next) return;
    this.enabled = next;
    this.record('diagnostics.toggle', { enabled: next }, { forceFile: true });
  }

  isEnabled() {
    return this.enabled;
  }

  record(event, details = {}, { forceFile = false } = {}) {
    const entry = {
      ts: new Date().toISOString(),
      event,
      ...sanitize(details),
    };
    this.events.push(entry);
    if (this.events.length > this.maxEvents) this.events.splice(0, this.events.length - this.maxEvents);
    if (this.enabled || forceFile) this.append(entry);
    return entry;
  }

  slow(event, ms, details = {}, thresholdMs = 100) {
    if (ms < thresholdMs) return null;
    return this.record(event, { ...details, ms: Math.round(ms), slow: true }, { forceFile: true });
  }

  append(entry) {
    if (!this.filePath) return;
    try {
      fs.appendFileSync(this.filePath, `${JSON.stringify(entry)}${os.EOL}`);
      this.trimFileIfNeeded();
    } catch {}
  }

  trimFileIfNeeded() {
    if (!this.filePath || Date.now() - this.fileTrimmedAt < 30000) return;
    this.fileTrimmedAt = Date.now();
    try {
      const stats = fs.statSync(this.filePath);
      if (stats.size <= this.maxFileBytes) return;
      const keepBytes = Math.floor(this.maxFileBytes / 2);
      const fd = fs.openSync(this.filePath, 'r');
      const buffer = Buffer.alloc(keepBytes);
      fs.readSync(fd, buffer, 0, keepBytes, stats.size - keepBytes);
      fs.closeSync(fd);
      fs.writeFileSync(this.filePath, buffer.toString('utf8').replace(/^[^\n]*\n?/, ''));
      fs.appendFileSync(this.filePath, `${JSON.stringify({ ts: new Date().toISOString(), event: 'diagnostics.truncated' })}${os.EOL}`);
    } catch {}
  }

  fileTail(maxBytes = DEFAULT_TAIL_BYTES) {
    if (!this.filePath) return '';
    try {
      const stats = fs.statSync(this.filePath);
      const bytes = Math.min(stats.size, maxBytes);
      const fd = fs.openSync(this.filePath, 'r');
      const buffer = Buffer.alloc(bytes);
      fs.readSync(fd, buffer, 0, bytes, stats.size - bytes);
      fs.closeSync(fd);
      return buffer.toString('utf8');
    } catch {
      return '';
    }
  }

  snapshot(extra = {}) {
    let file = { path: this.filePath || null, exists: false };
    try {
      const stats = fs.statSync(this.filePath);
      file = { path: this.filePath, exists: true, size: stats.size, mtime: stats.mtime.toISOString() };
    } catch {}
    return {
      generated_at: new Date().toISOString(),
      started_at: this.startedAt,
      enabled: this.enabled,
      file,
      recent_events: [...this.events],
      ...sanitize(extra),
    };
  }
}

module.exports = { Diagnostics, sanitize };
