#!/usr/bin/env node

/**
 * Comprehensive cleanup script to delete all files, embeddings, and reset the system
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function cleanupAll() {
  const client = await pool.connect();
  
  try {
    console.log('🧹 Starting comprehensive cleanup...\n');
    
    // 1. Delete all slide embeddings
    console.log('🗑️ Deleting all slide embeddings...');
    const embeddingsResult = await client.query('DELETE FROM slide_embeddings');
    console.log(`   ✅ Deleted ${embeddingsResult.rowCount} slide embeddings`);
    
    // 2. Delete all source slides
    console.log('🗑️ Deleting all source slides...');
    const sourceSlidesResult = await client.query('DELETE FROM source_slides');
    console.log(`   ✅ Deleted ${sourceSlidesResult.rowCount} source slides`);
    
    // 3. Delete all presentation sources
    console.log('🗑️ Deleting all presentation sources...');
    const sourcesResult = await client.query('DELETE FROM presentation_sources');
    console.log(`   ✅ Deleted ${sourcesResult.rowCount} presentation sources`);
    
    // 4. Delete all uploaded presentations
    console.log('🗑️ Deleting all uploaded presentations...');
    const uploadsResult = await client.query('DELETE FROM uploaded_presentations');
    console.log(`   ✅ Deleted ${uploadsResult.rowCount} uploaded presentations`);
    
    // 5. Delete all presentations
    console.log('🗑️ Deleting all presentations...');
    const presentationsResult = await client.query('DELETE FROM presentations');
    console.log(`   ✅ Deleted ${presentationsResult.rowCount} presentations`);
    
    // 6. Delete all slides
    console.log('🗑️ Deleting all slides...');
    const slidesResult = await client.query('DELETE FROM slides');
    console.log(`   ✅ Deleted ${slidesResult.rowCount} slides`);
    
    // 7. Delete all training sessions
    console.log('🗑️ Deleting all training sessions...');
    const trainingResult = await client.query('DELETE FROM training_sessions');
    console.log(`   ✅ Deleted ${trainingResult.rowCount} training sessions`);
    
    // 8. Delete all training progress
    console.log('🗑️ Deleting all training progress...');
    const progressResult = await client.query('DELETE FROM training_progress');
    console.log(`   ✅ Deleted ${progressResult.rowCount} training progress records`);
    
    // 9. Clean up physical files
    console.log('🗑️ Cleaning up physical files...');
    
    // Clean backend uploads
    const backendUploadsDir = path.join(__dirname, 'backend', 'uploads');
    if (fs.existsSync(backendUploadsDir)) {
      const files = fs.readdirSync(backendUploadsDir);
      files.forEach(file => {
        const filePath = path.join(backendUploadsDir, file);
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
          console.log(`   🗑️ Deleted file: ${file}`);
        }
      });
    }
    
    // Clean AI service generated presentations
    const aiGeneratedDir = path.join(__dirname, 'ai-service', 'generated_presentations');
    if (fs.existsSync(aiGeneratedDir)) {
      const files = fs.readdirSync(aiGeneratedDir);
      files.forEach(file => {
        const filePath = path.join(aiGeneratedDir, file);
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
          console.log(`   🗑️ Deleted AI generated file: ${file}`);
        }
      });
    }
    
    console.log('\n🎉 Cleanup completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   • Slide embeddings: ${embeddingsResult.rowCount}`);
    console.log(`   • Source slides: ${sourceSlidesResult.rowCount}`);
    console.log(`   • Presentation sources: ${sourcesResult.rowCount}`);
    console.log(`   • Uploaded presentations: ${uploadsResult.rowCount}`);
    console.log(`   • Presentations: ${presentationsResult.rowCount}`);
    console.log(`   • Slides: ${slidesResult.rowCount}`);
    console.log(`   • Training sessions: ${trainingResult.rowCount}`);
    console.log(`   • Training progress: ${progressResult.rowCount}`);
    
    console.log('\n✅ System is now clean and ready for fresh uploads!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the cleanup
cleanupAll().catch(console.error);
