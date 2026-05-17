# Contributing

Thanks for taking a look at BoardClip.

## Setup

```sh
npm install
npm test
npm start
```

On Windows, use the batch scripts if you want the same process handling as a normal local install:

```bat
start.bat
update.bat
kill.bat
```

## Development Notes

- Keep clipboard history, pin, group, tombstone, and sync merge behavior in `lib/clipboard-model.js` where possible.
- Prefer adapting shared helpers over adding platform-specific variants.
- Keep Windows-specific input behavior in `lib/windows-*`.
- Keep provider discovery in `lib/cloud-accounts.js`.
- Avoid introducing a hosted service requirement; BoardClip should stay local-first.

## Before Opening a PR

Run:

```sh
npm test
node --check main.js
node --check preload.js
node --check lib/cloud-accounts.js
node --check lib/clipboard-model.js
```

For UI changes, launch the app and verify the popup, settings screen, search, pinning, and paste flow manually.
