import { createHash } from "node:crypto";
import {
  createReadStream,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function argsFrom(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) fail(`Unexpected argument: ${token}`);
    const key = token.slice(2);
    if (key === "dry-run") {
      args[key] = true;
      continue;
    }
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) fail(`Missing value for --${key}`);
    args[key] = value;
    i += 1;
  }
  return args;
}

async function sha256File(path) {
  const hash = createHash("sha256");
  const stream = createReadStream(path);
  for await (const chunk of stream) hash.update(chunk);
  return hash.digest("hex");
}

function runWrangler(args) {
  const executable = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(
    executable,
    ["wrangler", ...args],
    { stdio: "inherit", shell: false },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    fail(`Wrangler failed with exit code ${result.status}.`);
  }
}

const args = argsFrom(process.argv.slice(2));
if (!args.report || !args.bucket) {
  fail("Usage: npm run audio:upload -- --report <inspection.json> --bucket <r2-bucket> [--dry-run]");
}

if (!/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/u.test(args.bucket)) {
  fail(`Invalid R2 bucket name: ${args.bucket}`);
}

const reportPath = resolve(args.report);
const reportDir = dirname(reportPath);
const report = JSON.parse(readFileSync(reportPath, "utf8"));

if (!Array.isArray(report.assets) || report.assets.length === 0) {
  fail("Inspection report contains no assets.");
}

for (const asset of report.assets) {
  const localPath = resolve(reportDir, asset.file);
  const stat = statSync(localPath);

  if (stat.size !== asset.bytes) {
    fail(`Local size changed after inspection: ${asset.file}`);
  }

  const localHash = await sha256File(localPath);
  if (localHash !== asset.sha256) {
    fail(`Local SHA-256 changed after inspection: ${asset.file}`);
  }

  if (stat.size > 315 * 1024 * 1024) {
    fail(
      `Wrangler upload limit exceeded for ${asset.file}; use rclone/S3 multipart tooling instead.`,
    );
  }

  const objectPath = `${args.bucket}/${asset.objectKey}`;

  console.log(
    `${args["dry-run"] ? "[DRY RUN] " : ""}R2 upload: ${asset.file} -> ${objectPath}`,
  );

  if (args["dry-run"]) continue;

  runWrangler([
    "r2",
    "object",
    "put",
    objectPath,
    "--file",
    localPath,
    "--content-type",
    "audio/mpeg",
    "--cache-control",
    "public, max-age=31536000, immutable",
    "--remote",
  ]);

  const tempDir = mkdtempSync(join(tmpdir(), "ketabcast-r2-verify-"));
  const downloaded = join(tempDir, basename(asset.objectKey));

  try {
    runWrangler([
      "r2",
      "object",
      "get",
      objectPath,
      "--file",
      downloaded,
      "--remote",
    ]);

    const remoteStat = statSync(downloaded);
    const remoteHash = await sha256File(downloaded);

    if (remoteStat.size !== asset.bytes || remoteHash !== asset.sha256) {
      fail(`R2 round-trip integrity mismatch: ${asset.objectKey}`);
    }

    console.log(`R2 integrity PASS: ${asset.objectKey}`);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}
