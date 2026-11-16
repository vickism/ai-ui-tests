#!/usr/bin/env bash
set -euo pipefail

archive_dir="${RUNNER_TEMP:?}/npm-package"
mkdir -p "$archive_dir"
npm pack --json --pack-destination "$archive_dir" > "$archive_dir/manifest.json"

node --input-type=module - "$archive_dir/manifest.json" <<'NODE'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const [pkg] = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
assert.equal(pkg.name, '@vicksim/ai-ui-tests')
const paths = pkg.files.map(({ path }) => path)
for (const required of ['package.json', 'README.md', 'dist/index.js',
  'dist/templates/ai-ui-tests.config.ts', 'dist/templates/ai-ui-tests.md',
  'dist/templates/example.test.md']) {
  assert(paths.includes(required), `Missing package file: ${required}`)
}
for (const path of paths) {
  assert(['package.json', 'README.md', 'LICENSE', 'LICENSE.md'].includes(path)
    || path === 'dist/index.js' || path.startsWith('dist/templates/'),
    `Unexpected package file: ${path}`)
}
console.log(`Checked ${pkg.filename}: ${paths.length} files`)
NODE

smoke_dir="$(mktemp -d)"
tar -xzf "$archive_dir"/*.tgz -C "$smoke_dir"
# Use the clean npm ci dependencies to exercise the packed files.
ln -s "$GITHUB_WORKSPACE/node_modules" "$smoke_dir/package/node_modules"
mkdir "$smoke_dir/project"
cd "$smoke_dir/project"
node "$smoke_dir/package/dist/index.js" --help
node "$smoke_dir/package/dist/index.js" init
test -s ai-ui-tests.config.ts
test -s ai-ui-tests.md
test -s tests/example.test.md
