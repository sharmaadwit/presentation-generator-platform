#!/usr/bin/env node

/**
 * Script to upgrade user subscription tiers
 * This will upgrade a user to Pro (50 presentations) or Enterprise (500 presentations)
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function upgradeSubscription(userEmail, newTier = 'pro') {
  const client = await pool.connect();
  
  try {
    const monthlyLimits = {
      free: 5,
      pro: 50,
      enterprise: 500
    };
    
    if (!monthlyLimits[newTier]) {
      throw new Error('Invalid subscription tier. Use: free, pro, or enterprise');
    }
    
    console.log(`🔄 Upgrading ${userEmail} to ${newTier} tier...`);
    
    const result = await client.query(
      `UPDATE users 
       SET subscription_tier = $1, monthly_limit = $2, presentations_generated = 0, updated_at = CURRENT_TIMESTAMP
       WHERE email = $3
       RETURNING id, email, name, subscription_tier, presentations_generated, monthly_limit`,
      [newTier, monthlyLimits[newTier], userEmail]
    );
    
    if (result.rows.length === 0) {
      console.log(`❌ User with email ${userEmail} not found`);
      return;
    }
    
    const user = result.rows[0];
    console.log(`✅ Successfully upgraded user:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Tier: ${user.subscription_tier}`);
    console.log(`   Monthly Limit: ${user.monthly_limit}`);
    console.log(`   Presentations Generated: ${user.presentations_generated}`);
    
  } catch (error) {
    console.error('❌ Error upgrading subscription:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const userEmail = args[0];
const newTier = args[1] || 'pro';

if (!userEmail) {
  console.log('Usage: node upgrade-subscription.js <email> [tier]');
  console.log('Tiers: free (5), pro (50), enterprise (500)');
  console.log('Example: node upgrade-subscription.js user@example.com pro');
  process.exit(1);
}

// Run the script
upgradeSubscription(userEmail, newTier);
