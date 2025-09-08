#!/usr/bin/env node

/**
 * Database cleanup script that runs in the backend directory
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function cleanupDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🧹 Starting database cleanup...\n');
    
    // Delete all data in correct order (respecting foreign keys)
    const results = {
      slideEmbeddings: 0,
      sourceSlides: 0,
      presentationSources: 0,
      uploadedPresentations: 0,
      presentations: 0,
      slides: 0,
      trainingSessions: 0,
      trainingProgress: 0
    };
    
    // Delete slide embeddings first
    console.log('🗑️ Deleting slide embeddings...');
    const embeddingsResult = await client.query('DELETE FROM slide_embeddings');
    results.slideEmbeddings = embeddingsResult.rowCount || 0;
    console.log(`   ✅ Deleted ${results.slideEmbeddings} slide embeddings`);
    
    // Delete source slides
    console.log('🗑️ Deleting source slides...');
    const sourceSlidesResult = await client.query('DELETE FROM source_slides');
    results.sourceSlides = sourceSlidesResult.rowCount || 0;
    console.log(`   ✅ Deleted ${results.sourceSlides} source slides`);
    
    // Delete presentation sources
    console.log('🗑️ Deleting presentation sources...');
    const sourcesResult = await client.query('DELETE FROM presentation_sources');
    results.presentationSources = sourcesResult.rowCount || 0;
    console.log(`   ✅ Deleted ${results.presentationSources} presentation sources`);
    
    // Delete uploaded presentations
    console.log('🗑️ Deleting uploaded presentations...');
    const uploadsResult = await client.query('DELETE FROM uploaded_presentations');
    results.uploadedPresentations = uploadsResult.rowCount || 0;
    console.log(`   ✅ Deleted ${results.uploadedPresentations} uploaded presentations`);
    
    // Delete presentations
    console.log('🗑️ Deleting presentations...');
    const presentationsResult = await client.query('DELETE FROM presentations');
    results.presentations = presentationsResult.rowCount || 0;
    console.log(`   ✅ Deleted ${results.presentations} presentations`);
    
    // Delete slides
    console.log('🗑️ Deleting slides...');
    const slidesResult = await client.query('DELETE FROM slides');
    results.slides = slidesResult.rowCount || 0;
    console.log(`   ✅ Deleted ${results.slides} slides`);
    
    // Delete training sessions
    console.log('🗑️ Deleting training sessions...');
    const trainingResult = await client.query('DELETE FROM training_sessions');
    results.trainingSessions = trainingResult.rowCount || 0;
    console.log(`   ✅ Deleted ${results.trainingSessions} training sessions`);
    
    // Delete training progress
    console.log('🗑️ Deleting training progress...');
    const progressResult = await client.query('DELETE FROM training_progress');
    results.trainingProgress = progressResult.rowCount || 0;
    console.log(`   ✅ Deleted ${results.trainingProgress} training progress records`);
    
    console.log('\n🎉 Database cleanup completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   • Slide embeddings: ${results.slideEmbeddings}`);
    console.log(`   • Source slides: ${results.sourceSlides}`);
    console.log(`   • Presentation sources: ${results.presentationSources}`);
    console.log(`   • Uploaded presentations: ${results.uploadedPresentations}`);
    console.log(`   • Presentations: ${results.presentations}`);
    console.log(`   • Slides: ${results.slides}`);
    console.log(`   • Training sessions: ${results.trainingSessions}`);
    console.log(`   • Training progress: ${results.trainingProgress}`);
    
    console.log('\n✅ Database is now clean and ready for fresh uploads!');
    
  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the cleanup
cleanupDatabase().catch(console.error);
