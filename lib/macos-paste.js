'use strict';

if (process.platform !== 'darwin') {
  module.exports = { sendCommandV() { return { ok: true }; } };
  return;
}

const koffi = require('koffi');

let coreGraphics = null;
let coreFoundation = null;

const KEY_V = 0x09;
const KEY_COMMAND = 0x37;
const kCGHIDEventTap = 0;
const kCGEventFlagMaskCommand = 1 << 20;

function loadFrameworks() {
  if (coreGraphics) return;
  coreGraphics = koffi.load('/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics');
  coreFoundation = koffi.load('/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation');

  coreGraphics.CGEventCreateKeyboardEvent = coreGraphics.func(
    'void *CGEventCreateKeyboardEvent(void *source, uint16 virtualKey, bool keyDown)'
  );
  coreGraphics.CGEventSetFlags = coreGraphics.func(
    'void CGEventSetFlags(void *event, uint64 flags)'
  );
  coreGraphics.CGEventPost = coreGraphics.func(
    'void CGEventPost(uint32 tap, void *event)'
  );
  coreFoundation.CFRelease = coreFoundation.func(
    'void CFRelease(void *cf)'
  );
}

function postKey(keyCode, keyDown, flags) {
  const event = coreGraphics.CGEventCreateKeyboardEvent(null, keyCode, keyDown);
  if (!event) throw new Error(`CGEventCreateKeyboardEvent failed for key ${keyCode}`);
  try {
    coreGraphics.CGEventSetFlags(event, flags);
    coreGraphics.CGEventPost(kCGHIDEventTap, event);
  } finally {
    coreFoundation.CFRelease(event);
  }
}

function sendCommandV() {
  try {
    loadFrameworks();
    postKey(KEY_COMMAND, true, kCGEventFlagMaskCommand);
    postKey(KEY_V, true, kCGEventFlagMaskCommand);
    postKey(KEY_V, false, kCGEventFlagMaskCommand);
    postKey(KEY_COMMAND, false, 0);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error && error.message };
  }
}

module.exports = { sendCommandV };
