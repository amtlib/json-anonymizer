#!/usr/bin/env ts-node

import * as fs from "fs";
import * as path from "node:path";
import * as crypto from "crypto";
import { Command } from "commander";
import { faker } from "@faker-js/faker";

const program = new Command();

program
  .option("-f, --file <path>", "JSON file to anonymize")
  .parse(process.argv);

const options = program.opts();

if (!options.file) {
  console.error("Please provide a JSON file to anonymize with -f option");
  process.exit(1);
}

const hashUuid = (uuid: string): string => {
  return crypto.createHash("sha256").update(uuid).digest("hex");
};

const getFakeString = (): string => {
  return faker.lorem.word();
};

const anonymizeObject = (obj: any): any => {
  if (typeof obj === "string") {
    // Simple check for UUID (pattern: 'xxxxxxxx-xxxx-Mxxx-Nxxx-xxxxxxxxxxxx')
    if (
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
        obj,
      )
    ) {
      return hashUuid(obj);
    } else {
      return getFakeString();
    }
  }

  if (Array.isArray(obj)) {
    return obj.map(anonymizeObject);
  }

  if (typeof obj === "object" && obj !== null) {
    const result: Record<string, any> = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        result[key] = anonymizeObject(obj[key]);
      }
    }
    return result;
  }

  return obj;
};

fs.readFile(options.file, "utf8", (err, data) => {
  if (err) {
    console.error(`Error reading file: ${err.message}`);
    process.exit(1);
  }

  let json: any = JSON.parse(data);
  json = anonymizeObject(json);

  const outputFilename = path.resolve(
    __dirname,
    "../client/mocks",
    `anonymized_${options.file}`,
  );
  fs.writeFile(outputFilename, JSON.stringify(json, null, 2), (err) => {
    if (err) {
      console.error(`Error writing file: ${err.message}`);
      process.exit(1);
    }
    console.log(`Anonymized JSON saved to ${outputFilename}`);
  });
});
