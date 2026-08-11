import {
  copyFile,
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { createHash } from "node:crypto";

import { resolveFactorySlugs } from "./factory-selection.mjs";

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      throw new Error(`Unexpected argument: ${token}`);
    }

    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }

    args[key] = value;
    index += 1;
  }
  return args;
}

async function sha256Buffer(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function githubJson(url, options = {}) {
  const token = process.env.GH_TOKEN?.trim();
  if (!token) throw new Error("GH_TOKEN is required.");

  const response = await fetch(url, {
    ...options,
    redirect: "follow",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2026-03-10",
      ...(options.headers ?? {}),
    },
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `GitHub API ${response.status} ${response.statusText}: ${text.slice(
        0,
        1500,
      )}`,
    );
  }

  return text ? JSON.parse(text) : null;
}

async function githubBinary(url) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      Accept: "application/octet-stream",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Asset download ${response.status} ${response.statusText}: ${url}`,
    );
  }

  return Buffer.from(await response.arrayBuffer());
}

async function uploadAsset(repo, releaseId, assetName, buffer) {
  const token = process.env.GH_TOKEN?.trim();
  if (!token) throw new Error("GH_TOKEN is required.");

  const url =
    `https://uploads.github.com/repos/${repo}/releases/${releaseId}/assets` +
    `?name=${encodeURIComponent(assetName)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2026-03-10",
      "Content-Type": "audio/mpeg",
      "Content-Length": String(buffer.length),
    },
    body: buffer,
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `Asset upload ${response.status} ${response.statusText}: ${text.slice(
        0,
        1500,
      )}`,
    );
  }

  return JSON.parse(text);
}

const args = parseArgs(process.argv.slice(2));
const repo = args.repo;
const releaseTag = args["release-tag"];
const slugArg = args.slug;
const outRoot = resolve(args.out ?? ".factory-output");
const inspectionPath = resolve(
  args.inspection ?? ".factory-output/audio-inspection.local.json",
);
const mapPath = resolve(
  args.map ?? ".factory-output/github-release-assets.json",
);

if (!repo || !releaseTag || !slugArg) {
  throw new Error("--repo, --release-tag and --slug are required.");
}

const [owner, repository] = repo.split("/");
if (!owner || !repository) {
  throw new Error(`Invalid repository: ${repo}`);
}

const catalog = JSON.parse(
  await readFile("content/factory/books.json", "utf8"),
);
const inspection = JSON.parse(await readFile(inspectionPath, "utf8"));

const slugs = resolveFactorySlugs(catalog, slugArg);

const release = await githubJson(
  `https://api.github.com/repos/${repo}/releases/tags/${encodeURIComponent(
    releaseTag,
  )}`,
);

const releaseAssets = Array.isArray(release.assets) ? [...release.assets] : [];
const mapped = [];
const releaseDir = join(outRoot, "release-assets");
await mkdir(releaseDir, { recursive: true });

for (const slug of slugs) {
  const book = catalog.books.find((entry) => entry.slug === slug);
  if (!book) throw new Error(`Unknown book slug: ${slug}`);

  const inspected = inspection.assets.find(
    (asset) => asset.episodeId === book.episodeId,
  );
  if (!inspected) {
    throw new Error(`Inspection entry missing for ${book.episodeId}`);
  }

  const localPath = join(outRoot, slug, "episode.mp3");
  const localBuffer = await readFile(localPath);
  const localSha = await sha256Buffer(localBuffer);

  if (localSha !== inspected.sha256) {
    throw new Error(
      `Local SHA mismatch for ${book.episodeId}: ` +
        `${localSha} != ${inspected.sha256}`,
    );
  }

  if (localBuffer.length !== inspected.bytes) {
    throw new Error(
      `Local byte mismatch for ${book.episodeId}: ` +
        `${localBuffer.length} != ${inspected.bytes}`,
    );
  }

  const assetName = basename(book.objectKey);
  if (!assetName.endsWith(".mp3")) {
    throw new Error(`Expected MP3 asset name: ${assetName}`);
  }

  const stagedPath = join(releaseDir, assetName);
  await copyFile(localPath, stagedPath);

  let remote = releaseAssets.find((asset) => asset.name === assetName);

  if (!remote) {
    console.log(`Uploading ${assetName} to ${releaseTag}...`);
    remote = await uploadAsset(
      repo,
      release.id,
      assetName,
      localBuffer,
    );
    releaseAssets.push(remote);
  } else {
    console.log(`Reusing existing release asset ${assetName}.`);
  }

  const expectedDigest = `sha256:${localSha}`;

  if (remote.state !== "uploaded") {
    throw new Error(`${assetName} is not in uploaded state.`);
  }

  if (Number(remote.size) !== localBuffer.length) {
    throw new Error(
      `GitHub asset size mismatch for ${assetName}: ` +
        `${remote.size} != ${localBuffer.length}`,
    );
  }

  if (remote.digest && remote.digest !== expectedDigest) {
    throw new Error(
      `GitHub asset digest mismatch for ${assetName}: ` +
        `${remote.digest} != ${expectedDigest}`,
    );
  }

  const downloaded = await githubBinary(remote.browser_download_url);
  const downloadedSha = await sha256Buffer(downloaded);

  if (downloaded.length !== localBuffer.length) {
    throw new Error(
      `Download-back byte mismatch for ${assetName}: ` +
        `${downloaded.length} != ${localBuffer.length}`,
    );
  }

  if (downloadedSha !== localSha) {
    throw new Error(
      `Download-back SHA mismatch for ${assetName}: ` +
        `${downloadedSha} != ${localSha}`,
    );
  }

  mapped.push({
    episodeId: book.episodeId,
    bookSlug: book.slug,
    objectKey: book.objectKey,
    assetName,
    publicUrl: remote.browser_download_url,
    releaseTag,
    releaseUrl: release.html_url,
    assetId: remote.id,
    mimeType: "audio/mpeg",
    bytes: localBuffer.length,
    sha256: localSha,
    githubDigest: remote.digest ?? expectedDigest,
    verified: true,
  });

  console.log(
    `GitHub Release asset verified: ${assetName} ` +
      `${localBuffer.length} bytes sha256=${localSha}`,
  );
}

await mkdir(dirname(mapPath), { recursive: true });
await writeFile(
  mapPath,
  `${JSON.stringify(
    {
      schemaVersion: 1,
      provider: "github-release-assets",
      repository: repo,
      releaseTag,
      releaseUrl: release.html_url,
      assets: mapped,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(
  `GitHub Release Asset integrity PASS: ${mapped.length} asset(s).`,
);
