#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { convertCsvToTranscript } from "./transcript-converter.mjs";

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath || inputPath === "--help" || inputPath === "-h") {
    const command = basename(fileURLToPath(import.meta.url));
    console.log(`Usage: node scripts/${command} <input.csv> [output.json]`);
    process.exitCode = inputPath ? 0 : 1;
    return;
  }

  const inputAbsolutePath = resolve(inputPath);
  const requestedOutputPath = process.argv[3];
  const outputPath =
    (requestedOutputPath ? resolve(requestedOutputPath) : null) ??
    join(
      dirname(inputAbsolutePath),
      `${basename(inputAbsolutePath, extname(inputAbsolutePath))}.json`,
    );

  const csvText = await readFile(inputAbsolutePath, "utf8");
  const transcript = convertCsvToTranscript(csvText);
  await writeFile(outputPath, `${JSON.stringify(transcript, null, 2)}\n`, "utf8");
  console.log(`Converted ${transcript.courses.length} courses to ${outputPath}`);
}

main().catch((error) => {
  console.error(`CSV conversion failed: ${error.message}`);
  process.exitCode = 1;
});
