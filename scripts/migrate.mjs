import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))

const client = new pg.Client({
  host: 'aws-0-us-west-2.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.ksozjzzsivsopgnnczay',
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
})

const files = [
  join(__dir, '../supabase/migrations/0001_init.sql'),
  join(__dir, '../supabase/migrations/0002_scoring.sql'),
  join(__dir, '../supabase/seed/teams.sql'),
  join(__dir, '../supabase/seed/matches.sql'),
]

await client.connect()
console.log('Connected to Supabase Postgres')

for (const file of files) {
  const sql = readFileSync(file, 'utf8')
  const name = file.split(/[\\/]/).slice(-2).join('/')
  try {
    await client.query(sql)
    console.log(`✓ ${name}`)
  } catch (err) {
    console.error(`✗ ${name}: ${err.message}`)
    process.exit(1)
  }
}

await client.end()
console.log('Done.')
