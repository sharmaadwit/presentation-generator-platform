#!/usr/bin/env node

/**
 * Script to check what content is actually stored in the database
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkDatabaseContent() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking database content...\n');
    
    // Check slide_embeddings table
    console.log('🧠 Slide Embeddings:');
    const embeddingsResult = await client.query(
      'SELECT se.content, ps.title as source_title FROM slide_embeddings se JOIN presentation_sources ps ON se.source_id = ps.id LIMIT 10'
    );
    console.log(`Found ${embeddingsResult.rows.length} embeddings:`);
    embeddingsResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. Source: ${row.source_title}`);
      console.log(`     Content: ${row.content.substring(0, 100)}...`);
      console.log(`     Is Mock: ${row.content.includes('Mock slide content') ? 'YES' : 'NO'}`);
      console.log();
    });
    
    // Check source_slides table
    console.log('📄 Source Slides:');
    const sourceSlidesResult = await client.query(
      'SELECT ss.content, ps.title as source_title FROM source_slides ss JOIN presentation_sources ps ON ss.source_id = ps.id LIMIT 10'
    );
    console.log(`Found ${sourceSlidesResult.rows.length} source slides:`);
    sourceSlidesResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. Source: ${row.source_title}`);
      console.log(`     Content: ${row.content.substring(0, 100)}...`);
      console.log(`     Is Mock: ${row.content.includes('Mock slide content') ? 'YES' : 'NO'}`);
      console.log();
    });
    
    // Check presentation_sources table
    console.log('📚 Presentation Sources:');
    const sourcesResult = await client.query(
      'SELECT id, title, status FROM presentation_sources ORDER BY created_at DESC LIMIT 10'
    );
    console.log(`Found ${sourcesResult.rows.length} sources:`);
    sourcesResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.title} - Status: ${row.status}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
checkDatabaseContent();
