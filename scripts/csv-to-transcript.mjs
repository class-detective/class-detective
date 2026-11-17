#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED_COLUMNS = [
  "First Name",
  "Last Name",
  "StudentID",
  "Institution",
  "Semester",
  "Course Subject",
  "Course Number",
  "Course Title",
  "Course Level",
  "Course Credits",
  "Course Grade",
];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (inQuotes) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"' && field.length === 0) {
      inQuotes = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      if (character === "\r" && text[index + 1] === "\n") {
        index += 1;
      }
    } else if (character === '"') {
      throw new Error(`Unexpected quote at character ${index + 1}.`);
    } else {
      field += character;
    }
  }

  if (inQuotes) {
    throw new Error("CSV contains an unterminated quoted field.");
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((values) => values.some((value) => value.trim() !== ""));
}

function createTranscript(rows) {
  if (rows.length < 2) {
    throw new Error("CSV must contain a header and at least one course row.");
  }

  const headers = rows[0].map((header) => header.trim());
  while (headers.length > 0 && headers[headers.length - 1] === "") {
    headers.pop();
  }

  const columnIndexes = new Map();
  headers.forEach((header, index) => {
    if (!header) {
      throw new Error("CSV contains an empty column header.");
    }
    if (columnIndexes.has(header)) {
      throw new Error(`CSV contains a duplicate column header: "${header}".`);
    }
    columnIndexes.set(header, index);
  });

  const missingColumns = REQUIRED_COLUMNS.filter(
    (column) => !columnIndexes.has(column),
  );
  if (missingColumns.length > 0) {
    throw new Error(`CSV is missing required columns: ${missingColumns.join(", ")}.`);
  }

  const getValue = (values, column) => values[columnIndexes.get(column)].trim();
  const courses = [];
  let student;
  let institution;

  rows.slice(1).forEach((values, rowIndex) => {
    const csvRowNumber = rowIndex + 2;
    while (values.length > headers.length && values[values.length - 1].trim() === "") {
      values.pop();
    }
    if (values.length !== headers.length) {
      throw new Error(
        `CSV row ${csvRowNumber} has ${values.length} fields; expected ${headers.length}.`,
      );
    }

    const rowStudent = {
      firstName: getValue(values, "First Name"),
      lastName: getValue(values, "Last Name"),
      studentId: getValue(values, "StudentID"),
    };
    const rowInstitution = getValue(values, "Institution");

    if (Object.values(rowStudent).some((value) => !value) || !rowInstitution) {
      throw new Error(`CSV row ${csvRowNumber} is missing student or institution details.`);
    }

    if (!student) {
      student = rowStudent;
      institution = rowInstitution;
    } else if (
      student.firstName !== rowStudent.firstName ||
      student.lastName !== rowStudent.lastName ||
      student.studentId !== rowStudent.studentId ||
      institution !== rowInstitution
    ) {
      throw new Error(
        `CSV row ${csvRowNumber} belongs to a different student or institution.`,
      );
    }

    const creditsText = getValue(values, "Course Credits");
    const credits = Number(creditsText);
    if (!creditsText || !Number.isFinite(credits) || credits < 0) {
      throw new Error(`CSV row ${csvRowNumber} has invalid course credits.`);
    }

    const term = getValue(values, "Semester");
    const subject = getValue(values, "Course Subject");
    const courseNumber = getValue(values, "Course Number");
    const title = getValue(values, "Course Title");
    const level = getValue(values, "Course Level");
    if (![term, subject, courseNumber, title, level].every(Boolean)) {
      throw new Error(`CSV row ${csvRowNumber} is missing course details.`);
    }

    const sourceGrade = getValue(values, "Course Grade");
    const isInProgress = sourceGrade === "***";
    courses.push({
      term,
      subject,
      courseNumber,
      title,
      level,
      credits,
      grade: isInProgress || !sourceGrade ? null : sourceGrade,
      status: isInProgress ? "in_progress" : "completed",
    });
  });

  return {
    schemaVersion: "1.0",
    student,
    institution,
    courses,
  };
}

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

  const csvText = (await readFile(inputAbsolutePath, "utf8")).replace(/^\uFEFF/, "");
  const transcript = createTranscript(parseCsv(csvText));
  await writeFile(outputPath, `${JSON.stringify(transcript, null, 2)}\n`, "utf8");
  console.log(`Converted ${transcript.courses.length} courses to ${outputPath}`);
}

main().catch((error) => {
  console.error(`CSV conversion failed: ${error.message}`);
  process.exitCode = 1;
});
