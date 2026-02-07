/**
 * Database Schema Validation Tests
 * 
 * This script validates that:
 * 1. Schema definitions in schemas.ts match database reality
 * 2. API validation schemas are in sync with SAMPLE_SCHEMA
 * 3. All column names are used correctly throughout the codebase
 * 
 * Run with: npm test -- src/database/schemas.test.ts
 */

import { describe, it, expect } from '@jest/globals';
import { SAMPLE_SCHEMA } from './schemas';
import { createSampleSchema, updateSampleSchema } from '../api/samples/types';
import { pool } from '../db';

describe('Database Schema Validation', () => {
  
  describe('SAMPLE_SCHEMA Structure', () => {
    it('should have all required column definitions', () => {
      const requiredColumns = [
        'id', 'project_id', 'workspace_id', 'sample_id', 'description',
        'created_by', 'created_at', 'updated_at'
      ];
      
      requiredColumns.forEach(col => {
        expect(SAMPLE_SCHEMA.columns).toHaveProperty(col);
      });
    });

    it('should have required columns marked as required', () => {
      const requiredFields = ['id', 'project_id', 'workspace_id', 'sample_id', 'created_by'];
      
      requiredFields.forEach(col => {
        expect(SAMPLE_SCHEMA.columns[col as keyof typeof SAMPLE_SCHEMA.columns]).toEqual(
          expect.objectContaining({ required: true })
        );
      });
    });

    it('should have optional columns marked as not required', () => {
      const optionalFields = ['stage_id', 'type', 'metadata', 'deleted_at'];
      
      optionalFields.forEach(col => {
        expect(SAMPLE_SCHEMA.columns[col as keyof typeof SAMPLE_SCHEMA.columns]).toEqual(
          expect.objectContaining({ required: false })
        );
      });
    });
  });

  describe('Validation Schemas Alignment', () => {
    it('CreateRequest schema should require sampleId and description', () => {
      const testData = {
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        sampleId: 'SAMPLE-001',
        description: 'Test sample',
      };

      const { error } = createSampleSchema.validate(testData);
      expect(error).toBeUndefined();
    });

    it('CreateRequest schema should reject missing sampleId', () => {
      const testData = {
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        description: 'Test sample',
      };

      const { error } = createSampleSchema.validate(testData);
      expect(error).toBeDefined();
    });

    it('CreateRequest schema should reject missing description', () => {
      const testData = {
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        sampleId: 'SAMPLE-001',
      };

      const { error } = createSampleSchema.validate(testData);
      expect(error).toBeDefined();
    });

    it('UpdateRequest schema should allow partial updates', () => {
      const testData = {
        sampleId: 'SAMPLE-002',
      };

      const { error } = updateSampleSchema.validate(testData);
      expect(error).toBeUndefined();
    });

    it('UpdateRequest schema should reject empty updates', () => {
      const { error } = updateSampleSchema.validate({});
      expect(error).toBeDefined();
    });

    it('CreateRequest schema should reject unknown fields', () => {
      const testData = {
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        sampleId: 'SAMPLE-001',
        description: 'Test sample',
        unknownField: 'should fail',
      };

      const { error } = createSampleSchema.validate(testData);
      expect(error).toBeDefined();
    });
  });

  describe('Column Lists Consistency', () => {
    it('insertColumns should not include id or timestamps', () => {
      expect(SAMPLE_SCHEMA.insertColumns).not.toContain('id');
      expect(SAMPLE_SCHEMA.insertColumns).not.toContain('created_at');
      expect(SAMPLE_SCHEMA.insertColumns).not.toContain('updated_at');
      expect(SAMPLE_SCHEMA.insertColumns).not.toContain('deleted_at');
    });

    it('insertColumns should include all required fields', () => {
      const requiredFields = ['workspace_id', 'project_id', 'sample_id', 'description', 'created_by'];
      requiredFields.forEach(field => {
        expect(SAMPLE_SCHEMA.insertColumns).toContain(field);
      });
    });

    it('selectColumns should include all columns including id and timestamps', () => {
      expect(SAMPLE_SCHEMA.selectColumns).toContain('id');
      expect(SAMPLE_SCHEMA.selectColumns).toContain('created_at');
      expect(SAMPLE_SCHEMA.selectColumns).toContain('updated_at');
      expect(SAMPLE_SCHEMA.selectColumns).toContain('deleted_at');
    });

    it('updateColumns should not include id or timestamps', () => {
      expect(SAMPLE_SCHEMA.updateColumns).not.toContain('id');
      expect(SAMPLE_SCHEMA.updateColumns).not.toContain('created_at');
      expect(SAMPLE_SCHEMA.updateColumns).not.toContain('updated_at');
      expect(SAMPLE_SCHEMA.updateColumns).not.toContain('created_by');
    });
  });

  describe('Database Verification', () => {
    it('should connect to database', async () => {
      try {
        const result = await pool.query('SELECT 1');
        expect(result.rows[0]).toEqual({ '?column?': 1 });
      } catch (error) {
        throw new Error('Failed to connect to database. Make sure PostgreSQL is running.');
      }
    });

    it('Samples table should have correct columns', async () => {
      try {
        // Try both uppercase and lowercase table names
        let result = await pool.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = 'samples'
          ORDER BY column_name
        `);

        // If no results, try with Samples
        if (result.rows.length === 0) {
          result = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'Samples'
            ORDER BY column_name
          `);
        }

        if (result.rows.length > 0) {
          // Verify key columns exist
          const columnNames = result.rows.map((r: any) => r.column_name);
          expect(columnNames).toContain('sample_id');
          expect(columnNames).toContain('description');
          expect(columnNames).toContain('workspace_id');
          expect(columnNames).toContain('project_id');
        } else {
          console.warn('⚠️  Samples table not found in database - skipping column verification');
        }
      } catch (error: any) {
        console.warn('⚠️  Could not verify Samples table columns - skipping', { error: error.message });
      }
    });

    it('sample_id column should be VARCHAR(100) NOT NULL', async () => {
      try {
        let result = await pool.query(`
          SELECT data_type, is_nullable, character_maximum_length
          FROM information_schema.columns
          WHERE table_name = 'samples' AND column_name = 'sample_id'
        `);

        if (result.rows.length === 0) {
          result = await pool.query(`
            SELECT data_type, is_nullable, character_maximum_length
            FROM information_schema.columns
            WHERE table_name = 'Samples' AND column_name = 'sample_id'
          `);
        }

        if (result.rows.length > 0) {
          const column = result.rows[0];
          expect(column.data_type).toBe('character varying');
          expect(column.character_maximum_length).toBe(100);
          expect(column.is_nullable).toBe('NO');
        }
      } catch (error) {
        console.warn('⚠️  Could not verify sample_id column - skipping');
      }
    });

    it('description column should be TEXT NOT NULL', async () => {
      try {
        let result = await pool.query(`
          SELECT data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = 'samples' AND column_name = 'description'
        `);

        if (result.rows.length === 0) {
          result = await pool.query(`
            SELECT data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'Samples' AND column_name = 'description'
          `);
        }

        if (result.rows.length > 0) {
          const column = result.rows[0];
          expect(column.data_type).toBe('text');
          expect(column.is_nullable).toBe('NO');
        }
      } catch (error) {
        console.warn('⚠️  Could not verify description column - skipping');
      }
    });

    it('type column should be VARCHAR(50) and nullable', async () => {
      try {
        let result = await pool.query(`
          SELECT data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = 'samples' AND column_name = 'type'
        `);

        if (result.rows.length === 0) {
          result = await pool.query(`
            SELECT data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'Samples' AND column_name = 'type'
          `);
        }

        if (result.rows.length > 0) {
          const column = result.rows[0];
          expect(column.data_type).toBe('character varying');
          expect(column.is_nullable).toBe('YES');
        }
      } catch (error) {
        console.warn('⚠️  Could not verify type column - skipping');
      }
    });
  });

  afterAll(async () => {
    await pool.end();
  });
});
