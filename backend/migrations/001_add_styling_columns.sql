-- Migration: Add styling preservation columns to slide_embeddings table
-- Created: 2025-01-06
-- Purpose: Enable preservation of fonts, colors, images, and formatting from training data

-- Add styling columns to slide_embeddings table
ALTER TABLE slide_embeddings ADD COLUMN IF NOT EXISTS font_family VARCHAR(100);
ALTER TABLE slide_embeddings ADD COLUMN IF NOT EXISTS font_size INTEGER;
ALTER TABLE slide_embeddings ADD COLUMN IF NOT EXISTS font_weight VARCHAR(20) DEFAULT 'normal'; -- 'normal', 'bold'
ALTER TABLE slide_embeddings ADD COLUMN IF NOT EXISTS font_style VARCHAR(20) DEFAULT 'normal';  -- 'normal', 'italic'
ALTER TABLE slide_embeddings ADD COLUMN IF NOT EXISTS text_color VARCHAR(20) DEFAULT '#000000';
ALTER TABLE slide_embeddings ADD COLUMN IF NOT EXISTS background_color VARCHAR(20) DEFAULT '#FFFFFF';
ALTER TABLE slide_embeddings ADD COLUMN IF NOT EXISTS text_align VARCHAR(20) DEFAULT 'left'; -- 'left', 'center', 'right'
ALTER TABLE slide_embeddings ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE slide_embeddings ADD COLUMN IF NOT EXISTS charts JSONB DEFAULT '[]'::jsonb;
ALTER TABLE slide_embeddings ADD COLUMN IF NOT EXISTS layout_data JSONB DEFAULT '{}'::jsonb;

-- Create slide_images table for storing image data
CREATE TABLE IF NOT EXISTS slide_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slide_embedding_id UUID REFERENCES slide_embeddings(id) ON DELETE CASCADE,
  image_url VARCHAR(500),
  image_data BYTEA,
  position_x DECIMAL(5,2) DEFAULT 0,
  position_y DECIMAL(5,2) DEFAULT 0,
  width DECIMAL(5,2) DEFAULT 2,
  height DECIMAL(5,2) DEFAULT 1.5,
  image_type VARCHAR(50) DEFAULT 'image', -- 'image', 'chart', 'diagram'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create slide_charts table for storing chart data
CREATE TABLE IF NOT EXISTS slide_charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slide_embedding_id UUID REFERENCES slide_embeddings(id) ON DELETE CASCADE,
  chart_type VARCHAR(50) NOT NULL, -- 'bar', 'line', 'pie', 'doughnut', 'scatter'
  chart_data JSONB NOT NULL,
  chart_options JSONB DEFAULT '{}'::jsonb,
  position_x DECIMAL(5,2) DEFAULT 0,
  position_y DECIMAL(5,2) DEFAULT 0,
  width DECIMAL(5,2) DEFAULT 4,
  height DECIMAL(5,2) DEFAULT 3,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_slide_images_embedding_id ON slide_images(slide_embedding_id);
CREATE INDEX IF NOT EXISTS idx_slide_charts_embedding_id ON slide_charts(slide_embedding_id);
CREATE INDEX IF NOT EXISTS idx_slide_embeddings_font_family ON slide_embeddings(font_family);
CREATE INDEX IF NOT EXISTS idx_slide_embeddings_text_color ON slide_embeddings(text_color);

-- Add comments for documentation
COMMENT ON COLUMN slide_embeddings.font_family IS 'Font family name (e.g., Arial, Calibri, Times New Roman)';
COMMENT ON COLUMN slide_embeddings.font_size IS 'Font size in points';
COMMENT ON COLUMN slide_embeddings.font_weight IS 'Font weight: normal or bold';
COMMENT ON COLUMN slide_embeddings.font_style IS 'Font style: normal or italic';
COMMENT ON COLUMN slide_embeddings.text_color IS 'Text color in hex format (e.g., #000000)';
COMMENT ON COLUMN slide_embeddings.background_color IS 'Background color in hex format';
COMMENT ON COLUMN slide_embeddings.text_align IS 'Text alignment: left, center, or right';
COMMENT ON COLUMN slide_embeddings.images IS 'JSON array of image references and metadata';
COMMENT ON COLUMN slide_embeddings.charts IS 'JSON array of chart references and metadata';
COMMENT ON COLUMN slide_embeddings.layout_data IS 'JSON object containing layout information (x, y, width, height)';

COMMENT ON TABLE slide_images IS 'Stores image data and metadata for slides';
COMMENT ON TABLE slide_charts IS 'Stores chart data and metadata for slides';
