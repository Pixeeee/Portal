import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';

const here = path.dirname(fileURLToPath(import.meta.url));
let dir = path.join(here, 'db', 'migrations');
try { await fs.access(dir); } catch { dir = path.resolve(process.cwd(), 'src/db/migrations'); }
await pool.query(`CREATE TABLE IF NOT EXISTS schema_migration (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
for (const file of files) {
  const exists = await pool.query('SELECT 1 FROM schema_migration WHERE name=$1', [file]);
  if (exists.rowCount) continue;
  const sql = await fs.readFile(path.join(dir, file), 'utf8');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO schema_migration(name) VALUES($1)', [file]);
    await client.query('COMMIT');
    console.log(`applied ${file}`);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally { client.release(); }
}
await pool.end();
