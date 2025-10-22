#!/usr/bin/env python3

import asyncio
import asyncpg
import os

async def clear_and_migrate_database():
    """Clear all existing data and run migration"""
    
    # Database connection
    database_url = os.getenv('DATABASE_URL', 'postgresql://app_user:your_password@127.0.0.1:5432/presentation_generator')
    
    try:
        # Connect to database
        conn = await asyncpg.connect(database_url)
        print("✅ Connected to database")
        
        # Clear all existing mixed-industry data
        print("🗑️ Clearing existing data...")
        await conn.execute("DELETE FROM slide_embeddings")
        await conn.execute("DELETE FROM source_slides")
        await conn.execute("DELETE FROM controlled_sources")
        await conn.execute("DELETE FROM presentation_sources WHERE source_type = 'uploaded'")
        
        # Add industry columns if they don't exist
        print("🔧 Adding industry columns...")
        await conn.execute("ALTER TABLE controlled_sources ADD COLUMN IF NOT EXISTS industry VARCHAR(50)")
        await conn.execute("ALTER TABLE source_slides ADD COLUMN IF NOT EXISTS industry VARCHAR(50)")
        await conn.execute("ALTER TABLE slide_embeddings ADD COLUMN IF NOT EXISTS industry VARCHAR(50)")
        
        # Create indexes for faster industry-based queries
        print("📊 Creating indexes...")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_controlled_sources_industry ON controlled_sources(industry)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_source_slides_industry ON source_slides(industry)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_slide_embeddings_industry ON slide_embeddings(industry)")
        
        # Verify tables are empty
        print("✅ Verifying cleanup...")
        controlled_count = await conn.fetchval("SELECT COUNT(*) FROM controlled_sources")
        slides_count = await conn.fetchval("SELECT COUNT(*) FROM source_slides")
        embeddings_count = await conn.fetchval("SELECT COUNT(*) FROM slide_embeddings")
        
        print(f"📊 Database status:")
        print(f"   - controlled_sources: {controlled_count} records")
        print(f"   - source_slides: {slides_count} records")
        print(f"   - slide_embeddings: {embeddings_count} records")
        
        print("🎉 Database migration completed successfully!")
        print("📝 Next steps:")
        print("   1. Upload industry-specific files via Admin UI")
        print("   2. Specify industry when uploading")
        print("   3. Generate embeddings for new industry-specific content")
        print("   4. Test presentation generation with industry filtering")
        
        await conn.close()
        
    except Exception as e:
        print(f"❌ Database error: {e}")

if __name__ == "__main__":
    asyncio.run(clear_and_migrate_database())
