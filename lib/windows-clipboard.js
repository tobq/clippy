'use strict';

const fs = require('fs');
const path = require('path');

if (process.platform !== 'win32') {
  module.exports = {
    getSequenceNumber() { return 0; },
    readImageCandidate() { return null; },
    dibToBmpBuffer,
  };
  return;
}

const koffi = require('koffi');

const user32 = koffi.load('user32.dll');
const kernel32 = koffi.load('kernel32.dll');
const shell32 = koffi.load('shell32.dll');

const OpenClipboard = user32.func('int __stdcall OpenClipboard(void *hWndNewOwner)');
const CloseClipboard = user32.func('int __stdcall CloseClipboard()');
const GetClipboardData = user32.func('void * __stdcall GetClipboardData(uint32 uFormat)');
const IsClipboardFormatAvailable = user32.func('int __stdcall IsClipboardFormatAvailable(uint32 format)');
const RegisterClipboardFormatW = user32.func('uint32 __stdcall RegisterClipboardFormatW(str16 lpszFormat)');
const GetClipboardSequenceNumber = user32.func('uint32 __stdcall GetClipboardSequenceNumber()');

const GlobalLock = kernel32.func('void * __stdcall GlobalLock(void *hMem)');
const GlobalUnlock = kernel32.func('int __stdcall GlobalUnlock(void *hMem)');
const GlobalSize = kernel32.func('uintptr_t __stdcall GlobalSize(void *hMem)');

const DragQueryFileW = shell32.func('uint32 __stdcall DragQueryFileW(void *hDrop, uint32 iFile, void *lpszFile, uint32 cch)');

const CF_BITMAP = 2;
const CF_DIB = 8;
const CF_HDROP = 15;
const MAX_IMAGE_FILE_BYTES = 100 * 1024 * 1024;
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.bmp', '.gif', '.webp', '.tif', '.tiff', '.heic', '.heif']);
const registeredFormats = new Map();

function getSequenceNumber() {
  try { return GetClipboardSequenceNumber() >>> 0; } catch { return 0; }
}

function registeredFormat(name) {
  if (!registeredFormats.has(name)) registeredFormats.set(name, RegisterClipboardFormatW(name) >>> 0);
  return registeredFormats.get(name);
}

function pointerToBuffer(ptr, size) {
  const length = Number(size) || 0;
  if (!ptr || length <= 0) return null;
  try {
    return Buffer.from(koffi.decode(ptr, 'uint8_t', length));
  } catch { return null; }
}

function readGlobalMemory(format) {
  if (!format || !IsClipboardFormatAvailable(format)) return null;
  const handle = GetClipboardData(format);
  if (!handle) return null;
  const size = Number(GlobalSize(handle)) || 0;
  if (size <= 0) return null;
  const ptr = GlobalLock(handle);
  if (!ptr) return null;
  try {
    return pointerToBuffer(ptr, size);
  } finally {
    try { GlobalUnlock(handle); } catch {}
  }
}

function withOpenClipboard(fn) {
  if (!OpenClipboard(null)) return null;
  try { return fn(); } finally { try { CloseClipboard(); } catch {} }
}

function hasPngSignature(buffer) {
  return Buffer.isBuffer(buffer)
    && buffer.length >= 8
    && buffer[0] === 0x89
    && buffer[1] === 0x50
    && buffer[2] === 0x4e
    && buffer[3] === 0x47
    && buffer[4] === 0x0d
    && buffer[5] === 0x0a
    && buffer[6] === 0x1a
    && buffer[7] === 0x0a;
}

function stringFromUtf16Buffer(buffer) {
  if (!Buffer.isBuffer(buffer)) return '';
  let end = 0;
  while (end + 1 < buffer.length && buffer.readUInt16LE(end) !== 0) end += 2;
  return buffer.toString('utf16le', 0, end).trim();
}

function stringFromAnsiBuffer(buffer) {
  if (!Buffer.isBuffer(buffer)) return '';
  const nul = buffer.indexOf(0);
  return buffer.toString('latin1', 0, nul >= 0 ? nul : buffer.length).trim();
}

function isImagePath(filePath) {
  if (!filePath || typeof filePath !== 'string') return false;
  const ext = path.extname(filePath).toLowerCase();
  if (!IMAGE_EXTENSIONS.has(ext)) return false;
  try {
    const stat = fs.statSync(filePath);
    return stat.isFile() && stat.size > 0 && stat.size <= MAX_IMAGE_FILE_BYTES;
  } catch {
    return false;
  }
}

function readHdropPathsOpen() {
  if (!IsClipboardFormatAvailable(CF_HDROP)) return [];
  const hDrop = GetClipboardData(CF_HDROP);
  if (!hDrop) return [];
  const count = DragQueryFileW(hDrop, 0xffffffff, null, 0);
  const paths = [];
  for (let i = 0; i < count; i += 1) {
    const chars = DragQueryFileW(hDrop, i, null, 0);
    if (!chars) continue;
    const buffer = Buffer.alloc((chars + 1) * 2);
    const written = DragQueryFileW(hDrop, i, buffer, chars + 1);
    if (written) paths.push(buffer.toString('utf16le', 0, written * 2));
  }
  return paths;
}

function readNamedFilePathsOpen() {
  const paths = [];
  const fileNameW = readGlobalMemory(registeredFormat('FileNameW'));
  const fileNameA = readGlobalMemory(registeredFormat('FileName'));
  const wide = stringFromUtf16Buffer(fileNameW);
  const ansi = stringFromAnsiBuffer(fileNameA);
  if (wide) paths.push(wide);
  if (ansi) paths.push(ansi);
  return paths;
}

function readImageFileCandidateOpen() {
  const paths = [...readHdropPathsOpen(), ...readNamedFilePathsOpen()];
  const imagePath = paths.find(isImagePath);
  if (!imagePath) return null;
  try {
    return { buffer: fs.readFileSync(imagePath), source: 'win32-file', path: imagePath };
  } catch {
    return null;
  }
}

function readPngCandidateOpen() {
  for (const name of ['PNG', 'image/png']) {
    const buffer = readGlobalMemory(registeredFormat(name));
    if (hasPngSignature(buffer)) return { buffer, source: `win32-${name}` };
  }
  return null;
}

function dibToBmpBuffer(dib) {
  if (!Buffer.isBuffer(dib) || dib.length < 40) return null;
  const headerSize = dib.readUInt32LE(0);
  if (headerSize < 12 || headerSize > dib.length) return null;

  let bitCount = 0;
  let compression = 0;
  let colorsUsed = 0;
  if (headerSize >= 40 && dib.length >= 36) {
    bitCount = dib.readUInt16LE(14);
    compression = dib.readUInt32LE(16);
    colorsUsed = dib.readUInt32LE(32);
  }

  const paletteEntries = colorsUsed || (bitCount > 0 && bitCount <= 8 ? 2 ** bitCount : 0);
  const bitfieldBytes = compression === 3 && headerSize === 40 ? 12 : 0;
  const pixelOffset = 14 + headerSize + bitfieldBytes + paletteEntries * 4;
  if (pixelOffset > 14 + dib.length) return null;

  const fileHeader = Buffer.alloc(14);
  fileHeader.write('BM', 0, 'ascii');
  fileHeader.writeUInt32LE(fileHeader.length + dib.length, 2);
  fileHeader.writeUInt32LE(0, 6);
  fileHeader.writeUInt32LE(pixelOffset, 10);
  return Buffer.concat([fileHeader, dib]);
}

function readDibCandidateOpen() {
  const dib = readGlobalMemory(CF_DIB);
  const bmp = dibToBmpBuffer(dib);
  return bmp ? { buffer: bmp, source: 'win32-dib' } : null;
}

function readImageCandidate() {
  return withOpenClipboard(() => (
    readImageFileCandidateOpen()
    || readPngCandidateOpen()
    || readDibCandidateOpen()
    || (IsClipboardFormatAvailable(CF_BITMAP) ? { source: 'win32-bitmap-unreadable' } : null)
  ));
}

module.exports = {
  getSequenceNumber,
  readImageCandidate,
  dibToBmpBuffer,
  _private: {
    hasPngSignature,
    stringFromUtf16Buffer,
    isImagePath,
  },
};
