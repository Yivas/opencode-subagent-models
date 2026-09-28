import assert from "node:assert/strict"
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const wikiRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const repositoryRoot = resolve(wikiRoot, "..")
const dist = join(wikiRoot, "dist")
const base = "/opencode-subagent-models"
const htmlFiles = collectFiles(dist, (name) => name.endsWith(".html"))
const markdownFiles = collectFiles(
  repositoryRoot,
  (name) => name.endsWith(".md"),
  new Set([".git", "node_modules", "wiki"]),
)
const failures = []

assert.equal(stripHtmlComments("before<!-- hidden <!-- nested -->after"), "beforeafter")
// Text inside an HTML comment is not content: the links it hides must never be validated.
assert.equal(stripCode("Install <!-- [docs](./does-not-exist.md) --> now"), "Install  now")
// An unterminated comment swallows the rest of the file, so it fails instead of leaking its links.
assert.throws(() => stripCode("Install <!-- [docs](./does-not-exist.md)"), /Unclosed HTML comment/)
// A fence may contain `<!--`: code is stripped first, so it cannot abort the run on a missing `-->`.
assert.match(
  stripCode("```text\nInstall <!-- note\n```\n\nSee [docs](./does-not-exist.md)."),
  /\.\/does-not-exist\.md/,
)
// A `-->` later in the file must not swallow the content written in between.
assert.match(
  stripCode("```text\nInstall <!-- note\n```\n\nSee [docs](./does-not-exist.md).\n\n<!-- closed later -->"),
  /\.\/does-not-exist\.md/,
)
// A comment closed inside a fence stays code and does not change what the rest of the file reports.
assert.equal(
  stripCode("```text\nInstall <!-- note -->\n```\n\nSee [docs](./README.md)."),
  "\nSee [docs](./README.md).",
)
// The wiki ships one logo through two paths: editing a single copy would publish two different marks.
assert.equal(
  readFileSync(join(repositoryRoot, "wiki", "src", "assets", "logo.svg"), "utf8"),
  readFileSync(join(repositoryRoot, "wiki", "public", "logo.svg"), "utf8"),
  "wiki/src/assets/logo.svg and wiki/public/logo.svg must stay identical.",
)
assert.ok(existsSync(dist), "Run npm run build before checking links.")

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8")
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    validateGeneratedTarget(file, match[1])
  }
}

for (const file of markdownFiles) {
  const source = stripCode(readFileSync(file, "utf8"), relative(repositoryRoot, file))
  for (const match of source.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    validateRepositoryTarget(file, match[1])
  }
  for (const match of source.matchAll(/^\s{0,3}\[[^\]]+\]:\s*(\S+)/gm)) {
    validateRepositoryTarget(file, match[1])
  }
}

assert.deepEqual(failures, [], `Broken links:\n${failures.join("\n")}`)
console.log(`links: ok (${htmlFiles.length} pages, ${markdownFiles.length} repository files)`)

function validateGeneratedTarget(sourceFile, target) {
  if (/^(?:https?:|mailto:|data:)/.test(target)) return

  const sourcePath = sourceFile.slice(dist.length).replaceAll("\\", "/")
  const url = new URL(target, `https://docs.invalid${base}${sourcePath}`)
  const withoutBase = url.pathname.startsWith(base) ? url.pathname.slice(base.length) : url.pathname
  const relativePath = withoutBase.replace(/^\//, "")
  const path = relativePath ? join(dist, relativePath) : join(dist, "index.html")
  const file = existsSync(path) && !statSync(path).isDirectory()
    ? path
    : join(path, "index.html")

  if (!existsSync(file)) {
    failures.push(`${relative(wikiRoot, sourceFile)}: ${target}`)
    return
  }

  if (url.hash && file.endsWith(".html")) {
    const fragment = decodeURIComponent(url.hash.slice(1))
    const ids = new Set(Array.from(readFileSync(file, "utf8").matchAll(/\sid="([^"]+)"/g), (match) => match[1]))
    if (!ids.has(fragment)) failures.push(`${relative(wikiRoot, sourceFile)}: ${target}`)
  }
}

function validateRepositoryTarget(sourceFile, rawTarget) {
  const target = rawTarget.replace(/^<|>$/g, "")
  if (target.startsWith("#") || target.startsWith("//") || /^[a-z][a-z\d+.-]*:/i.test(target)) return
  const localPath = target.split(/[?#]/, 1)[0]
  if (!localPath || !existsSync(resolve(dirname(sourceFile), decodeURIComponent(localPath)))) {
    failures.push(`${relative(repositoryRoot, sourceFile)}: ${target}`)
  }
}

// Code goes first: a `<!--` inside a closed fence is code, and stripping comments before it would
// let that marker open a real comment that hides or aborts on the rest of the file. A fence left
// unclosed is not stripped, so a `<!--` in it can still open a comment.
function stripCode(source, sourceLabel) {
  const withoutCode = source
    .replace(/^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?^ {0,3}\1\s*$/gm, "")
    .replace(/`+[^`]*`+/g, "")
  return stripHtmlComments(withoutCode, sourceLabel)
}

function stripHtmlComments(source, sourceLabel) {
  let result = ""
  let index = 0
  while (index < source.length) {
    const start = source.indexOf("<!--", index)
    if (start === -1) return result + source.slice(index)
    result += source.slice(index, start)
    const end = source.indexOf("-->", start + 4)
    if (end === -1) {
      throw new Error(sourceLabel ? `Unclosed HTML comment in ${sourceLabel}.` : "Unclosed HTML comment.")
    }
    index = end + 3
  }
  return result
}

function collectFiles(directory, include, ignored = new Set()) {
  const files = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignored.has(entry.name)) continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...collectFiles(path, include, ignored))
    else if (include(entry.name)) files.push(path)
  }
  return files
}
