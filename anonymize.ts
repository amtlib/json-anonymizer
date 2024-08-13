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

const anonymizeObject = async (obj: any): Promise<any> => {
    const importedCamelCase = options.camelcase ? await import('camelcase') : null;

    if (typeof obj === 'string') {
        // Simple check for UUID (pattern: 'xxxxxxxx-xxxx-Mxxx-Nxxx-xxxxxxxxxxxx')
        if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(obj)) {
            return hashUuid(obj);
        } else {
            return getFakeString();
        }
    }

    if (Array.isArray(obj)) {
        return Promise.all(obj.map(anonymizeObject));
    }

    if (typeof obj === 'object' && obj !== null) {
        const result: { [key: string]: any } = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const updatedKey = options.camelcase && importedCamelCase ? importedCamelCase.default(key) : key;
                result[updatedKey] = await anonymizeObject(obj[key]);
            }
        }
        return result;
    }

    return obj;
};

const main = async () => {
    const data = await fs.promises.readFile(options.file, 'utf8');
    let json: any = JSON.parse(data);
    json = await anonymizeObject(json);

    const outputFilename = `anonymized_${options.file}`;
    await fs.promises.writeFile(outputFilename, JSON.stringify(json, null, 2));

    console.log(`Anonymized JSON saved to ${outputFilename}`);
};

main();