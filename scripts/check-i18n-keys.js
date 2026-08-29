// 校验：所有 t('...') / tr('...') 用到的键是否在 en 字典中（缺失会回退中文）
const fs = require('fs');
const path = require('path');

const roots = ['app', 'components', 'lib'];
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
}
for (const r of roots) if (fs.existsSync(r)) walk(r);

const i18n = fs.readFileSync('lib/i18n.ts', 'utf8');
const dictMatch = i18n.match(/export const en: Record<string, string> = \{([\s\S]*?)\n\};/);
if (!dictMatch) { console.error('dict not found'); process.exit(1); }
const dictBody = dictMatch[1];
const dictKeys = new Set();
// 键可能是带引号（'...' / "..."）或裸写（中文直接作键名），统一取到冒号前的文本；
// 裸写键不允许跨行（[^:\n]），避免把注释行并入
const keyRe = /^\s*(?:('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")|([^:\n]+?))\s*:/gm;
let m;
while ((m = keyRe.exec(dictBody))) {
  const raw = m[1] ?? m[2];
  const key = raw.startsWith("'") || raw.startsWith('"') ? raw.slice(1, -1) : raw.trim();
  if (key && !key.startsWith('//')) dictKeys.add(key);
}

const used = new Map();
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  // 匹配 t('...') 和 tr('...') 及 t("...")
  const re = /\b(?:t|tr)\(\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')\s*(?:,|\))/g;
  let mm;
  while ((mm = re.exec(src))) {
    const key = mm[1] ?? mm[2];
    if (!used.has(key)) used.set(key, []);
    used.get(key).push(f);
  }
}

let missing = 0;
for (const [key, locs] of [...used.entries()].sort()) {
  if (!dictKeys.has(key)) {
    missing++;
    console.log(`MISSING: ${JSON.stringify(key)}  (${locs.length}处)`);
  }
}
console.log(`\n共使用 ${used.size} 个键，缺失 ${missing} 个`);
