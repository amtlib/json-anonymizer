#!/usr/bin/env node
import * as fs from 'fs';
import * as crypto from 'crypto';
import { Command } from 'commander';
import { faker } from '@faker-js/faker';

const program = new Command();

program
    .option('-f, --file <path>', 'JSON file to anonymize')
    .option('-c, --camelcase', 'Convert object keys from snake_case to camelCase')
    .parse(process.argv);

const options = program.opts();

if (!options.file) {
    console.error('Please provide a JSON file to anonymize with -f option');
    process.exit(1);
}

const hashUuid = (uuid: string): string => {
    return crypto.createHash('sha256').update(uuid).digest('hex');
};

const getFakeString = (): string => {
    return faker.lorem.word();
};

const snakeToCamel = (str: string): string => {
    return str.replace(/_([a-z])/g, (match, p1) => p1.toUpperCase());
};

const isIsoDateString = (str: string): boolean => {
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
  return isoDateRegex.test(str);
};

const anonymizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
        // Simple check for UUID (pattern: 'xxxxxxxx-xxxx-Mxxx-Nxxx-xxxxxxxxxxxx')
        if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(obj)) {
            return hashUuid(obj);
        }
        // Check for ISO date strings
        else if (isIsoDateString(obj)) {
            return new Date(obj).getTime(); // Convert to Unix timestamp
        } 
        else {
            return getFakeString();
        }
    }

    if (Array.isArray(obj)) {
        return obj.map(anonymizeObject);
    }

    if (typeof obj === 'object' && obj !== null) {
        const result: { [key: string]: any } = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const updatedKey = options.camelcase ? snakeToCamel(key) : key;
                result[updatedKey] = anonymizeObject(obj[key]);
            }
        }
        return result;
    }

    return obj;
};

fs.readFile(options.file, 'utf8', (err, data) => {
    if (err) {
        console.error(`Error reading file: ${err.message}`);
        process.exit(1);
    }

    let json: any = JSON.parse(data);
    json = anonymizeObject(json);

    const outputFilename = `anonymized_${options.file}`;
    fs.writeFile(outputFilename, JSON.stringify(json, null, 2), (err) => {
        if (err) {
            console.error(`Error writing file: ${err.message}`);
            process.exit(1);
        }
        console.log(`Anonymized JSON saved to ${outputFilename}`);
    });
});