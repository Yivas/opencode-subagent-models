import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"

const packArguments = ["pack", "--dry-run", "--json", "--ignore-scripts"]
const npmExecutable = process.env.npm_execpath
const useWindowsShell = !npmExecutable && process.platform === "win32"
const command = npmExecutable
  ? process.execPath
  : useWindowsShell
    ? process.env.ComSpec ?? "cmd.exe"
    : "npm"
const npmArguments = npmExecutable
  ? [npmExecutable, ...packArguments]
  : useWindowsShell
    ? ["/d", "/s", "/c", ["npm", ...packArguments].join(" ")]
    : packArguments
const output = execFileSync(command, npmArguments, { encoding: "utf8" })
const packages = JSON.parse(output)

assert.equal(packages.length, 1)
assert.deepEqual(
  packages[0].files.map((file) => file.path).sort(),
  [
    "CHANGELOG.md",
    "LICENSE",
    "README.md",
    "package.json",
    "src/index.ts",
    "src/state.ts",
    "src/tui.ts",
  ],
)

console.log("package contents: ok")
