#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const packagePath = path.join(root, "package.json");
const packageLockPath = path.join(root, "package-lock.json");
const appConfigPath = path.join(root, "app.json");
const versionModulePath = path.join(root, "src", "version.ts");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function parseVersion(value) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value ?? "");

  if (!match) {
    throw new Error(`Version invalide: ${value}. Format attendu: x.y.z`);
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function formatVersion({ major, minor, patch }) {
  return `${major}.${minor}.${patch}`;
}

function nextVersion(current, bump) {
  if (bump === "patch") {
    return { ...current, patch: current.patch + 1 };
  }

  if (bump === "minor") {
    return { ...current, minor: current.minor + 1, patch: 0 };
  }

  if (bump === "major") {
    return { major: current.major + 1, minor: 0, patch: 0 };
  }

  throw new Error(`Type de bump inconnu: ${bump}`);
}

function currentVersion() {
  const packageJson = readJson(packagePath);
  return packageJson.version;
}

function writeVersionModule(version) {
  const content = [
    "export const PROJECT_VERSION = {",
    `  name: "WeSpice",`,
    `  version: "${version}",`,
    `  label: "v${version}",`,
    "} as const;",
    "",
  ].join("\n");

  fs.writeFileSync(versionModulePath, content);
}

function updateVersion(version) {
  const packageJson = readJson(packagePath);
  const packageLock = readJson(packageLockPath);
  const appConfig = readJson(appConfigPath);

  packageJson.version = version;
  packageLock.version = version;
  if (packageLock.packages?.[""]) {
    packageLock.packages[""].version = version;
  }
  appConfig.expo.version = version;

  writeJson(packagePath, packageJson);
  writeJson(packageLockPath, packageLock);
  writeJson(appConfigPath, appConfig);
  writeVersionModule(version);
}

function stageVersionFiles() {
  execFileSync("git", ["add", "package.json", "package-lock.json", "app.json", "src/version.ts"], {
    cwd: root,
    stdio: "inherit",
  });
}

function usage() {
  console.log("Usage:");
  console.log("  node scripts/version-project.js show");
  console.log("  node scripts/version-project.js set <x.y.z> [--stage]");
  console.log("  node scripts/version-project.js bump <patch|minor|major> [--stage]");
}

function main() {
  const [, , command, arg, ...flags] = process.argv;
  const shouldStage = flags.includes("--stage");

  if (command === "show") {
    console.log(currentVersion());
    return;
  }

  if (command !== "set" && command !== "bump") {
    usage();
    process.exit(1);
  }

  const current = parseVersion(currentVersion());
  const version = command === "set"
    ? formatVersion(parseVersion(arg))
    : formatVersion(nextVersion(current, arg));

  updateVersion(version);

  if (shouldStage) {
    stageVersionFiles();
  }

  console.log(`WeSpice ${version}`);
}

main();
