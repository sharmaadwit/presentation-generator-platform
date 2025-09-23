import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const connectDatabase = async (): Promise<void> => {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL database');
    
    // Test the connection
    await client.query('SELECT NOW()');
    client.release();
    
    // Initialize database tables
    await initializeTables();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
};

const initializeTables = async (): Promise<void> => {
  const client = await pool.connect();
  
  try {
    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        subscription_tier VARCHAR(50) DEFAULT 'free',
        presentations_generated INTEGER DEFAULT 0,
        monthly_limit INTEGER DEFAULT 5,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Presentations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS presentations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'generating',
        use_case TEXT NOT NULL,
        customer VARCHAR(255) NOT NULL,
        industry VARCHAR(255) NOT NULL,
        target_audience VARCHAR(255),
        presentation_length VARCHAR(50),
        style VARCHAR(50),
        additional_requirements TEXT,
        download_url VARCHAR(500),
        preview_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Slides table
    await client.query(`
      CREATE TABLE IF NOT EXISTS slides (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        presentation_id UUID REFERENCES presentations(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        image_url VARCHAR(500),
        slide_type VARCHAR(50) NOT NULL,
        source_presentation VARCHAR(500),
        relevance_score DECIMAL(3,2) DEFAULT 0.0,
        extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        order_index INTEGER NOT NULL
      )
    `);

    // Scraping results table
    await client.query(`
      CREATE TABLE IF NOT EXISTS scraping_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        presentation_id UUID REFERENCES presentations(id) ON DELETE CASCADE,
        url VARCHAR(500) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        slide_count INTEGER DEFAULT 0,
        industry VARCHAR(255),
        relevance_score DECIMAL(3,2) DEFAULT 0.0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Generation progress table
    await client.query(`
      CREATE TABLE IF NOT EXISTS generation_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        presentation_id UUID REFERENCES presentations(id) ON DELETE CASCADE,
        stage VARCHAR(50) NOT NULL,
        progress INTEGER DEFAULT 0,
        message TEXT,
        estimated_time_remaining INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Uploaded presentations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS uploaded_presentations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        original_filename VARCHAR(255) NOT NULL,
        stored_filename VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size BIGINT NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        title VARCHAR(255),
        description TEXT,
        industry VARCHAR(100),
        tags TEXT[],
        status VARCHAR(50) DEFAULT 'uploaded',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP
      )
    `);

    // Presentation sources table (controlled source management)
    await client.query(`
      CREATE TABLE IF NOT EXISTS presentation_sources (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        industry VARCHAR(100) NOT NULL,
        tags TEXT[],
        file_path VARCHAR(500) NOT NULL,
        source_type VARCHAR(50) NOT NULL, -- 'uploaded', 'manual', 'approved'
        metadata JSONB,
        status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
        uploaded_by UUID REFERENCES users(id),
        approved_by UUID REFERENCES users(id),
        approval_notes TEXT,
        approved_at TIMESTAMP,
        relevance_score DECIMAL(3,2) DEFAULT 0.0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Source slides table (extracted slides from approved sources)
    await client.query(`
      CREATE TABLE IF NOT EXISTS source_slides (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_id UUID REFERENCES presentation_sources(id) ON DELETE CASCADE,
        slide_index INTEGER NOT NULL,
        title VARCHAR(255),
        content TEXT,
        image_url VARCHAR(500),
        slide_type VARCHAR(50) NOT NULL,
        extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB,
        images JSONB,
        formatting JSONB,
        layout_info JSONB
      )
    `);

    // Add admin user type to users table
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS user_type VARCHAR(50) DEFAULT 'user'
    `);

    // Add enhanced visual data columns to source_slides table
    await client.query(`
      ALTER TABLE source_slides 
      ADD COLUMN IF NOT EXISTS images JSONB,
      ADD COLUMN IF NOT EXISTS formatting JSONB,
      ADD COLUMN IF NOT EXISTS layout_info JSONB
    `);

    // Training system tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS training_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        status VARCHAR(50) NOT NULL, -- 'training', 'completed', 'failed'
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        created_by UUID REFERENCES users(id),
        total_files INTEGER DEFAULT 0,
        processed_files INTEGER DEFAULT 0,
        total_embeddings INTEGER DEFAULT 0,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS training_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        training_session_id UUID REFERENCES training_sessions(id) ON DELETE CASCADE,
        progress INTEGER NOT NULL, -- 0-100
        message TEXT,
        stage VARCHAR(50), -- 'initializing', 'processing', 'completed', 'failed'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS slide_embeddings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_id UUID REFERENCES presentation_sources(id) ON DELETE CASCADE,
        slide_id UUID REFERENCES source_slides(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        embedding JSONB NOT NULL, -- Vector embedding as JSON array
        slide_type VARCHAR(50) NOT NULL,
        relevance_score DECIMAL(3,2) DEFAULT 0.5,
        training_session_id UUID REFERENCES training_sessions(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_slide_embeddings_source_id 
      ON slide_embeddings(source_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_slide_embeddings_training_session 
      ON slide_embeddings(training_session_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_training_sessions_status 
      ON training_sessions(status)
    `);

    // Analytics tables for tracking usage patterns
    await client.query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        event_type VARCHAR(100) NOT NULL, -- 'presentation_generated', 'source_uploaded', 'login', etc.
        event_data JSONB,
        session_id VARCHAR(255),
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Presentation generation analytics
    await client.query(`
      CREATE TABLE IF NOT EXISTS presentation_analytics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        presentation_id UUID REFERENCES presentations(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        industry VARCHAR(100) NOT NULL,
        use_case TEXT NOT NULL,
        customer VARCHAR(255) NOT NULL,
        target_audience VARCHAR(255),
        presentation_length VARCHAR(50),
        style VARCHAR(50),
        kpis TEXT[],
        additional_requirements TEXT,
        generation_time_seconds INTEGER,
        slide_count INTEGER,
        source_count INTEGER,
        regional_team VARCHAR(100),
        department VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Source usage analytics
    await client.query(`
      CREATE TABLE IF NOT EXISTS source_usage_analytics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_id UUID REFERENCES presentation_sources(id) ON DELETE CASCADE,
        presentation_id UUID REFERENCES presentations(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        slides_used INTEGER DEFAULT 0,
        relevance_score DECIMAL(3,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User activity tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_activity (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        activity_type VARCHAR(100) NOT NULL,
        activity_data JSONB,
        session_duration INTEGER, -- in seconds
        page_views INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Regional team and department tracking
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS regional_team VARCHAR(100),
      ADD COLUMN IF NOT EXISTS department VARCHAR(100),
      ADD COLUMN IF NOT EXISTS manager_email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS location VARCHAR(100)
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
      CREATE INDEX IF NOT EXISTS idx_presentation_analytics_industry ON presentation_analytics(industry);
      CREATE INDEX IF NOT EXISTS idx_presentation_analytics_use_case ON presentation_analytics(use_case);
      CREATE INDEX IF NOT EXISTS idx_presentation_analytics_regional_team ON presentation_analytics(regional_team);
      CREATE INDEX IF NOT EXISTS idx_source_usage_source_id ON source_usage_analytics(source_id);
      CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
    `);

    // Create dummy user for testing/demo purposes
    await client.query(`
      INSERT INTO users (id, email, password_hash, name, subscription_tier, monthly_limit, user_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO NOTHING
    `, [
      '00000000-0000-0000-0000-000000000001',
      'dummy@example.com',
      '$2a$12$dummy.hash.for.testing.purposes.only',
      'Dummy User',
      'free',
      5,
      'user'
    ]);

    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('❌ Failed to initialize database tables:', error);
    throw error;
  } finally {
    client.release();
  }
};

export { pool };
