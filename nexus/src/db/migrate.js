import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { pool } from './client.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(__dirname, 'migrations')

export async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      filename TEXT PRIMARY KEY,
      run_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  const { rows: ran } = await pool.query('SELECT filename FROM _migrations')
  const ranSet = new Set(ran.map(r => r.filename))

  const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()

  for (const file of files) {
    if (ranSet.has(file)) continue
    const sql = readFileSync(join(migrationsDir, file), 'utf8')
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [file])
      await client.query('COMMIT')
      console.log(`Ran migration: ${file}`)
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  }

  console.log('Migrations complete.')
}

// Only close pool when run as a CLI script
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrate()
    .then(() => pool.end())
    .catch(err => { console.error(err); process.exit(1) })
}
