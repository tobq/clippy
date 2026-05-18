'use strict';

const fs = require('fs');
const path = require('path');

function normalizeSyncPath(syncPath) {
  const normalized = path.normalize(String(syncPath || '').trim());
  if (!normalized || !path.isAbsolute(normalized)) return '';
  return normalized;
}

function migrateSyncSettings(settings) {
  if (!settings) return settings;
  const customPaths = [
    settings.sync_path,
    ...(Array.isArray(settings.sync_custom_paths) ? settings.sync_custom_paths : []),
  ].map(normalizeSyncPath).filter(Boolean);
  settings.sync_custom_paths = [...new Set(customPaths)];
  settings.sync_path = settings.sync_custom_paths[0] || '';
  if (!Array.isArray(settings.sync_disabled_paths)) settings.sync_disabled_paths = [];
  settings.sync_disabled_paths = [...new Set(settings.sync_disabled_paths.map(normalizeSyncPath).filter(Boolean))];
  return settings;
}

function customSyncPaths(settings) {
  migrateSyncSettings(settings);
  return settings.sync_custom_paths || [];
}

function addCustomSyncPath(settings, syncPath) {
  const normalized = normalizeSyncPath(syncPath);
  if (!normalized) return '';
  const paths = new Set(customSyncPaths(settings));
  paths.add(normalized);
  settings.sync_custom_paths = [...paths];
  settings.sync_path = settings.sync_custom_paths[0] || '';
  return normalized;
}

function syncDisabledPathSet(settings) {
  migrateSyncSettings(settings);
  return new Set((settings.sync_disabled_paths || []).map(normalizeSyncPath).filter(Boolean));
}

function syncAccountsWithCustom(settings, accounts) {
  const result = [...(accounts || [])];
  for (const customPath of customSyncPaths(settings)) {
    const available = fs.existsSync(customPath) || fs.existsSync(path.dirname(customPath));
    if (!available || result.some(acc => normalizeSyncPath(acc.path) === customPath)) continue;
    result.push({
      provider: 'custom',
      label: path.basename(customPath) || customPath,
      email: '',
      path: customPath,
    });
  }
  return result;
}

module.exports = {
  normalizeSyncPath,
  migrateSyncSettings,
  customSyncPaths,
  addCustomSyncPath,
  syncDisabledPathSet,
  syncAccountsWithCustom,
};
