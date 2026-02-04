/**
 * Test Fixtures - Sample data for integration tests
 */

import { v4 as uuidv4 } from 'uuid';

export interface TestFixtures {
  workspace: any;
  users: any[];
  projects: any[];
  samples: any[];
  analysisTypes: any[];
  batches: any[];
}

/**
 * Create test fixtures in database
 */
export async function createTestFixtures(db: any): Promise<TestFixtures> {
  // Create workspace
  const workspaceId = uuidv4();
  await db.run(
    `INSERT INTO Workspace (id, name, description, status)
     VALUES (?, ?, ?, ?)`,
    [workspaceId, 'Test Workspace', 'For integration testing', 'active']
  );

  // Create users
  const adminUserId = uuidv4();
  const managerUserId = uuidv4();
  const scientistUserId = uuidv4();

  const users = [
    {
      id: adminUserId,
      email: 'admin@test.com',
      name: 'Admin User',
      role: 'Admin',
      workspace_id: workspaceId
    },
    {
      id: managerUserId,
      email: 'manager@test.com',
      name: 'Manager User',
      role: 'Manager',
      workspace_id: workspaceId
    },
    {
      id: scientistUserId,
      email: 'scientist@test.com',
      name: 'Scientist User',
      role: 'Scientist',
      workspace_id: workspaceId
    }
  ];

  for (const user of users) {
    await db.run(
      `INSERT INTO Users (id, email, name, role, workspace_id)
       VALUES (?, ?, ?, ?, ?)`,
      [user.id, user.email, user.name, user.role, user.workspace_id]
    );
  }

  // Create projects
  const projectIds = [uuidv4(), uuidv4()];
  const projects = [
    {
      id: projectIds[0],
      workspace_id: workspaceId,
      name: 'COVID-19 Research',
      description: 'Test project for virus research',
      status: 'Active',
      created_by: adminUserId
    },
    {
      id: projectIds[1],
      workspace_id: workspaceId,
      name: 'Drug Development',
      description: 'Test project for drug development',
      status: 'Planning',
      created_by: managerUserId
    }
  ];

  for (const project of projects) {
    await db.run(
      `INSERT INTO Projects (id, workspace_id, name, description, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [project.id, project.workspace_id, project.name, project.description, project.status, project.created_by]
    );
  }

  // Create samples
  const sampleIds = [uuidv4(), uuidv4()];
  const samples = [
    {
      id: sampleIds[0],
      project_id: projectIds[0],
      workspace_id: workspaceId,
      sample_id: 'S-001',
      name: 'Sample 001',
      description: 'Original sample for testing',
      metadata: JSON.stringify({ quantity: 100, unit: 'ml' }),
      status: 'created',
      created_by: scientistUserId
    },
    {
      id: sampleIds[1],
      project_id: projectIds[0],
      workspace_id: workspaceId,
      sample_id: 'S-002',
      name: 'Sample 002',
      description: 'Second sample for testing',
      metadata: JSON.stringify({ quantity: 50, unit: 'ml' }),
      status: 'created',
      created_by: scientistUserId
    }
  ];

  for (const sample of samples) {
    await db.run(
      `INSERT INTO Samples (id, project_id, workspace_id, sample_id, name, description, metadata, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sample.id, sample.project_id, sample.workspace_id, sample.sample_id, sample.name, sample.description, sample.metadata, sample.status, sample.created_by]
    );
  }

  // Create analysis types
  const analysisTypeIds = [uuidv4(), uuidv4()];
  const analysisTypes = [
    {
      id: analysisTypeIds[0],
      name: 'DNA Sequencing',
      category: 'Genomics',
      workspace_id: workspaceId
    },
    {
      id: analysisTypeIds[1],
      name: 'Protein Analysis',
      category: 'Proteomics',
      workspace_id: workspaceId
    }
  ];

  for (const analysisType of analysisTypes) {
    await db.run(
      `INSERT INTO AnalysisTypes (id, name, category, workspace_id)
       VALUES (?, ?, ?, ?)`,
      [analysisType.id, analysisType.name, analysisType.category, analysisType.workspace_id]
    );
  }

  // Create batches
  const batchIds = [uuidv4(), uuidv4()];
  const batches = [
    {
      id: batchIds[0],
      project_id: projectIds[0],
      workspace_id: workspaceId,
      batch_id: 'BATCH-001',
      status: 'created',
      created_by: scientistUserId
    },
    {
      id: batchIds[1],
      project_id: projectIds[1],
      workspace_id: workspaceId,
      batch_id: 'BATCH-002',
      status: 'in_progress',
      created_by: managerUserId
    }
  ];

  for (const batch of batches) {
    await db.run(
      `INSERT INTO Batches (id, project_id, workspace_id, batch_id, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [batch.id, batch.project_id, batch.workspace_id, batch.batch_id, batch.status, batch.created_by]
    );
  }

  return {
    workspace: { id: workspaceId, name: 'Test Workspace' },
    users,
    projects,
    samples,
    analysisTypes,
    batches
  };
}

export default {
  createTestFixtures
};
