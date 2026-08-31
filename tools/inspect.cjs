// Diagnostic: parse sample.textile with web-tree-sitter, print tree + captures.
const fs = require('fs');
const path = require('path');

const WTS = '/home/withersky/.local/share/zed/languages/bash-language-server/node_modules/web-tree-sitter';
const Parser = require(WTS);

const ROOT = '/home/withersky/zed-textile';
const WASM = path.join(ROOT, 'grammars', 'textile.wasm');
const SAMPLE = path.join(ROOT, 'test', 'sample.textile');
const HIGHLIGHTS = path.join(ROOT, 'languages', 'textile', 'highlights.scm');

function dump(node, src, indent) {
  const isNamed = node.isNamed;
  const isMissing = node.isMissing;
  const start = node.startIndex;
  const end = node.endIndex;
  let text = src.slice(start, end).replace(/\n/g, '\\n');
  if (text.length > 40) text = text.slice(0, 40) + '…';
  const name = isNamed ? node.type : `"${node.type}"`;
  const parts = ['  '.repeat(indent), name];
  if (isMissing) parts.push('MISSING');
  parts.push(`[${start}-${end}]`);
  if (isNamed) parts.push(JSON.stringify(text));
  console.log(parts.join(' '));
  for (let i = 0; i < node.childCount; i++) {
    dump(node.child(i), src, indent + 1);
  }
}

(async () => {
  await Parser.init();
  // NB: first Language.load throws undefined in this build; retry works.
  let lang;
  for (let i = 0; i < 3; i++) {
    try {
      lang = await Parser.Language.load(WASM);
      if (lang) break;
    } catch (e) {
      console.log('load attempt', i, 'failed:', e);
    }
  }
  if (!lang) {
    console.log('FATAL: could not load language');
    return;
  }
  console.log('Language fields:', lang.fields);

  const parser = new Parser();
  parser.setLanguage(lang);
  const src = fs.readFileSync(SAMPLE, 'utf8');
  const tree = parser.parse(src);

  console.log('\n===== TREE =====');
  dump(tree.rootNode, src, 0);

  console.log('\n===== CAPTURES (highlights.scm) =====');
  const scm = fs.readFileSync(HIGHLIGHTS, 'utf8');
  try {
    const query = lang.query(scm);
    const captures = query.captures(tree.rootNode);
    for (const c of captures) {
      const n = c.node;
      const text = src.slice(n.startIndex, n.endIndex).replace(/\n/g, '\\n');
      console.log(`${c.name.padEnd(24)} ${n.type.padEnd(18)} ${JSON.stringify(text)}`);
    }
    console.log(`\nTotal captures: ${captures.length}`);
  } catch (e) {
    console.log('Query error:', e);
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
