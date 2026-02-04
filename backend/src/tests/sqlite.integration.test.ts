// Integration test for SQLite DB
const sqlite3 = require('sqlite3');
const path = require('path');

describe('SQLite DB Integration', () => {
  const DB_PATH = path.join(__dirname, '../../local-test.db');
  let db: sqlite3.Database;

  beforeAll((done) => {
    db = new sqlite3.Database(DB_PATH, done);
  });

  afterAll((done) => {
    db.close(done);
  });

  test('Insert and fetch Workspace', (done) => {
    db.run(
      `INSERT INTO Workspace (id, name, slug, type) VALUES (?, ?, ?, ?)`,
      ['w1', 'TestOrg', 'testorg', 'research'],
      (err) => {
        expect(err).toBeNull();
        db.get(`SELECT * FROM Workspace WHERE id = ?`, ['w1'], (err2, row) => {
          expect(err2).toBeNull();
          expect(row.name).toBe('TestOrg');
          done();
        });
      }
    );
  });

  test('Insert and fetch User', (done) => {
    db.run(
      `INSERT INTO Users (id, workspace_id, email, role) VALUES (?, ?, ?, ?)`,
      ['u1', 'w1', 'user@example.com', 'admin'],
      (err) => {
        expect(err).toBeNull();
        db.get(`SELECT * FROM Users WHERE id = ?`, ['u1'], (err2, row) => {
          expect(err2).toBeNull();
          expect(row.email).toBe('user@example.com');
          done();
        });
      }
    );
  });
});
