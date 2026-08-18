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

assert.ok(existsSync(dist), "Run npm run build before checking links.")

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8")
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    validateGeneratedTarget(file, match[1])
  }
}

for (const file of markdownFiles) {
  const source = stripCode(readFileSync(file, "utf8"))
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

function stripCode(source) {
  return source
    .replace(/<!--[^]*?-->/g, "")
    .replace(/^ {0,3}(`{3,}|~{3,})[^\n]*\n[^]*?^ {0,3}\1\s*$/gm, "")
    .replace(/`+[^`]*`+/g, "")
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
