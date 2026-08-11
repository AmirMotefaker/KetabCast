import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function run(command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    throw new Error(
      `${command} failed (${result.status}): ${result.stderr || result.stdout}`,
    );
  }

  return result.stdout.trim();
}

function getDuration(file) {
  const value = run("ffprobe", [
    "-v","error",
    "-show_entries","format=duration",
    "-of","default=noprint_wrappers=1:nokey=1",
    file,
  ]);

  const duration = Number(value);
  if (!Number.isFinite(duration) || duration < 15) {
    throw new Error(`Unexpected duration: ${file} -> ${value}`);
  }

  return duration;
}

async function main() {
  const root = path.resolve(process.argv[2] ?? ".voice-lab");
  const manifest = JSON.parse(
    await readFile(path.join(root, "voice-lab-manifest.json"), "utf8"),
  );
  const mixDir = path.join(root, "podcast-demo");
  await mkdir(mixDir, { recursive: true });

  const mixManifest = {
    schemaVersion: 1,
    source: "procedurally-synthesized-light-bed",
    thirdPartyRecordingIncluded: false,
    oscillatorsHz: [196, 246.94, 293.66],
    files: [],
  };

  for (const voice of manifest.voices) {
    const input = path.join(root, voice.rawFile);
    const duration = getDuration(input);
    const middleStart = Math.max(14, duration * 0.45);
    const middleEnd = Math.min(duration - 8, middleStart + 6);
    const outroStart = Math.max(0, duration - 6);

    const outputName =
      path.basename(voice.rawFile, ".mp3") + "-podcast-demo.mp3";
    const output = path.join(mixDir, outputName);

    const bedVolume =
      `if(between(t,0,8),0.065,` +
      `if(between(t,${middleStart.toFixed(2)},${middleEnd.toFixed(2)}),0.025,` +
      `if(gte(t,${outroStart.toFixed(2)}),0.045,0)))`;

    const filter = [
      "[1:a]volume=0.12,lowpass=f=850[a1]",
      "[2:a]volume=0.08,lowpass=f=1100[a2]",
      "[3:a]volume=0.05,lowpass=f=1350[a3]",
      "[a1][a2][a3]amix=inputs=3:normalize=0[pad0]",
      `[pad0]volume='${bedVolume}':eval=frame,afade=t=in:st=0:d=1.5[pad]`,
      "[0:a]aresample=44100,volume=1.0[voice]",
      "[voice][pad]amix=inputs=2:duration=first:normalize=0," +
        "loudnorm=I=-16:LRA=7:TP=-1.5[out]",
    ].join(";");

    run("ffmpeg", [
      "-hide_banner","-loglevel","error","-y",
      "-i",input,
      "-f","lavfi","-i",
      `sine=frequency=196:sample_rate=44100:duration=${duration}`,
      "-f","lavfi","-i",
      `sine=frequency=246.94:sample_rate=44100:duration=${duration}`,
      "-f","lavfi","-i",
      `sine=frequency=293.66:sample_rate=44100:duration=${duration}`,
      "-filter_complex",filter,
      "-map","[out]",
      "-ar","44100",
      "-ac","2",
      "-b:a","128k",
      output,
    ]);

    const bytes = await readFile(output);
    mixManifest.files.push({
      voice: voice.voice,
      file: `podcast-demo/${outputName}`,
      durationSeconds: Number(duration.toFixed(3)),
      bytes: bytes.length,
      sha256: sha256(bytes),
    });

    console.log(`Podcast demo PASS: ${voice.voice}`);
  }

  await writeFile(
    path.join(root, "podcast-mix-manifest.json"),
    `${JSON.stringify(mixManifest, null, 2)}\n`,
    "utf8",
  );

  console.log("Voice Lab podcast mix PASS: 8 demos.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
