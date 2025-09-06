import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting database migrations...');
    
    // Create migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Get list of migration files
    const migrationsDir = path.join(__dirname, '../migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    console.log(`📁 Found ${migrationFiles.length} migration files`);
    
    for (const filename of migrationFiles) {
      // Check if migration already executed
      const result = await client.query(
        'SELECT id FROM migrations WHERE filename = $1',
        [filename]
      );
      
      if (result.rows.length > 0) {
        console.log(`⏭️  Skipping ${filename} (already executed)`);
        continue;
      }
      
      console.log(`🔄 Executing ${filename}...`);
      
      // Read and execute migration file
      const migrationPath = path.join(migrationsDir, filename);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      await client.query(migrationSQL);
      
      // Record migration as executed
      await client.query(
        'INSERT INTO migrations (filename) VALUES ($1)',
        [filename]
      );
      
      console.log(`✅ Completed ${filename}`);
    }
    
    console.log('🎉 All migrations completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migrations if this script is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration process failed:', error);
      process.exit(1);
    });
}

export { runMigrations };
