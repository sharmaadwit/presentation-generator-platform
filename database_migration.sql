-- Database Migration: Add Industry Support
-- This script adds industry columns to support industry-specific filtering

-- Add industry column to controlled_sources table
ALTER TABLE controlled_sources ADD COLUMN IF NOT EXISTS industry VARCHAR(50);

-- Add industry column to source_slides table  
ALTER TABLE source_slides ADD COLUMN IF NOT EXISTS industry VARCHAR(50);

-- Add industry column to slide_embeddings table
ALTER TABLE slide_embeddings ADD COLUMN IF NOT EXISTS industry VARCHAR(50);

-- Create index for faster industry-based queries
CREATE INDEX IF NOT EXISTS idx_controlled_sources_industry ON controlled_sources(industry);
CREATE INDEX IF NOT EXISTS idx_source_slides_industry ON source_slides(industry);
CREATE INDEX IF NOT EXISTS idx_slide_embeddings_industry ON slide_embeddings(industry);

-- Clear all existing mixed-industry data
DELETE FROM slide_embeddings;
DELETE FROM source_slides;
DELETE FROM controlled_sources;

-- Verify tables are empty
SELECT 'controlled_sources' as table_name, COUNT(*) as count FROM controlled_sources
UNION ALL
SELECT 'source_slides' as table_name, COUNT(*) as count FROM source_slides
UNION ALL
SELECT 'slide_embeddings' as table_name, COUNT(*) as count FROM slide_embeddings;
