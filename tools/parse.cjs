// Usage: node tools/parse.cjs [file]
// Parses a .textile file with the built wasm and prints the tree.
const fs = require('fs');
const path = require('path');

const WTS = '/home/withersky/.local/share/zed/languages/bash-language-server/node_modules/web-tree-sitter';
const Parser = require(WTS);

const ROOT = '/home/withersky/zed-textile';
const WASM = path.join(ROOT, 'grammars', 'textile.wasm');
const FILE = process.argv[2] ? path.join(ROOT, process.argv[2]) : path.join(ROOT, 'test', 'sample.textile');

function dump(node, src, indent) {
  if (!node.isNamed) return;
  const text = src.slice(node.startIndex, node.endIndex).replace(/\n/g, '\\n');
  console.log(
    '  '.repeat(indent) +
      node.type +
      ' [' + node.startIndex + '-' + node.endIndex + '] ' +
      JSON.stringify(text)
  );
  for (let i = 0; i < node.childCount; i++) {
    dump(node.child(i), src, indent + 1);
  }
}

(async () => {
  await Parser.init();
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
  const parser = new Parser();
  parser.setLanguage(lang);
  const src = fs.readFileSync(FILE, 'utf8');
  const tree = parser.parse(src);
  dump(tree.rootNode, src, 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
