import fs from 'fs';
import path from 'path';
import { describe, it, expect } from '@jest/globals';
import { BATCH_STATUS_VALUES, EXECUTION_MODE_VALUES } from '../api/batches/types';

function extractEnumValues(content: string, typeName: string): string[] {
  const regex = new RegExp(`CREATE TYPE ${typeName} AS ENUM \\(([^;]+)\\);`, 'i');
  const match = content.match(regex);
  if (!match) {
    return [];
  }

  const values = match[1].match(/'([^']+)'/g) || [];
  return values.map((value) => value.replace(/'/g, '').trim());
}

function extractInterfaceBlock(content: string, interfaceName: string): string {
  const regex = new RegExp(`export interface ${interfaceName} \\{([\\s\\S]*?)\\}`, 'm');
  const match = content.match(regex);
  return match ? match[1] : '';
}

function extractStringUnionValues(block: string, fieldName: string): string[] {
  const fieldRegex = new RegExp(`${fieldName}\\s*:\\s*([^;\\n]+)`, 'm');
  const match = block.match(fieldRegex);
  if (!match) {
    return [];
  }

  const values = match[1].match(/'([^']+)'/g) || [];
  return values.map((value) => value.replace(/'/g, '').trim());
}

function extractInterfaceFields(block: string): string[] {
  const fields: string[] = [];
  const regex = /\s*([A-Za-z0-9_]+)\??\s*:/g;
  let match: RegExpExecArray | null = null;

  while ((match = regex.exec(block)) !== null) {
    fields.push(match[1]);
  }

  return fields;
}

function sortValues(values: string[]): string[] {
  return [...new Set(values)].sort();
}

describe('Batch Contract Consistency', () => {
  const dbSetupPath = path.resolve(__dirname, '..', 'database', 'setup.ts');
  const apiTypesPath = path.resolve(__dirname, '..', 'api', 'batches', 'types.ts');
  const uiTypesPath = path.resolve(__dirname, '..', '..', '..', 'src', 'lib', 'types.ts');

  const dbSetup = fs.readFileSync(dbSetupPath, 'utf-8');
  const apiTypes = fs.readFileSync(apiTypesPath, 'utf-8');
  const uiTypes = fs.readFileSync(uiTypesPath, 'utf-8');

  const uiBatchBlock = extractInterfaceBlock(uiTypes, 'Batch');
  const apiBatchResponseBlock = extractInterfaceBlock(apiTypes, 'BatchResponse');

  it('batch_status enum values align across DB, API, and UI', () => {
    const dbValues = extractEnumValues(dbSetup, 'batch_status');
    const apiValues = [...BATCH_STATUS_VALUES];
    const uiValues = extractStringUnionValues(uiBatchBlock, 'status');

    expect(sortValues(dbValues)).toEqual(sortValues(apiValues));
    expect(sortValues(uiValues)).toEqual(sortValues(apiValues));
  });

  it('execution_mode enum values align across DB, API, and UI', () => {
    const dbValues = extractEnumValues(dbSetup, 'execution_mode');
    const apiValues = [...EXECUTION_MODE_VALUES];
    const uiValues = extractStringUnionValues(uiBatchBlock, 'executionMode');

    expect(sortValues(dbValues)).toEqual(sortValues(apiValues));
    expect(sortValues(uiValues)).toEqual(sortValues(apiValues));
  });

  it('batch response fields align between API and UI', () => {
    const apiFields = extractInterfaceFields(apiBatchResponseBlock);
    const uiFields = extractInterfaceFields(uiBatchBlock);

    expect(sortValues(apiFields)).toEqual(sortValues(uiFields));
  });
});
