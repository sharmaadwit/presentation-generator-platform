#!/usr/bin/env node

/**
 * Script to reset presentation limits for testing/development
 * This will reset the presentations_generated counter to 0 for all users
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function resetPresentationLimits() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Resetting presentation limits...');
    
    // Reset presentations_generated to 0 for all users
    const result = await client.query(
      'UPDATE users SET presentations_generated = 0 WHERE presentations_generated > 0'
    );
    
    console.log(`✅ Reset presentation counter for ${result.rowCount} users`);
    
    // Show current user limits
    const users = await client.query(
      'SELECT email, subscription_tier, presentations_generated, monthly_limit FROM users ORDER BY created_at DESC LIMIT 5'
    );
    
    console.log('\n📊 Current user limits:');
    users.rows.forEach(user => {
      console.log(`- ${user.email}: ${user.presentations_generated}/${user.monthly_limit} (${user.subscription_tier})`);
    });
    
  } catch (error) {
    console.error('❌ Error resetting limits:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
resetPresentationLimits();
