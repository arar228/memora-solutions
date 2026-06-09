const fs = require('fs');
const path = require('path');

// Chromium ships a .pak file per supported UI language (~50 files, ~40MB).
// Our UI is React with its own ru/en strings, so the rest are dead weight.
// Keep only the locales we might surface in native menus/dialogs.
const KEEP = new Set(['en-US.pak', 'ru.pak']);

exports.default = async function afterPack(context) {
  const localesDir = path.join(context.appOutDir, 'locales');
  if (!fs.existsSync(localesDir)) return;
  let removed = 0;
  let freed = 0;
  for (const f of fs.readdirSync(localesDir)) {
    if (KEEP.has(f)) continue;
    const p = path.join(localesDir, f);
    try {
      freed += fs.statSync(p).size;
      fs.rmSync(p);
      removed++;
    } catch { /* ignore */ }
  }
  console.log(`[afterPack] removed ${removed} locale files (~${Math.round(freed / 1048576)}MB), kept ${[...KEEP].join(', ')}`);
};
