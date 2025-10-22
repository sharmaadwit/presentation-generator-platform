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
        
        # Check what tables exist
        tables = await conn.fetch("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        
        print("📊 Existing tables:")
        for table in tables:
            print(f"   - {table['table_name']}")
        
        # Clear existing data from tables that exist
        print("🗑️ Clearing existing data...")
        
        # Clear slide_embeddings if it exists
        try:
            await conn.execute("DELETE FROM slide_embeddings")
            print("   ✅ Cleared slide_embeddings")
        except Exception as e:
            print(f"   ⚠️ slide_embeddings: {e}")
        
        # Clear source_slides if it exists
        try:
            await conn.execute("DELETE FROM source_slides")
            print("   ✅ Cleared source_slides")
        except Exception as e:
            print(f"   ⚠️ source_slides: {e}")
        
        # Clear presentation_sources if it exists
        try:
            await conn.execute("DELETE FROM presentation_sources WHERE source_type = 'uploaded'")
            print("   ✅ Cleared presentation_sources (uploaded)")
        except Exception as e:
            print(f"   ⚠️ presentation_sources: {e}")
        
        # Add industry columns to existing tables
        print("🔧 Adding industry columns...")
        
        # Add to source_slides if it exists
        try:
            await conn.execute("ALTER TABLE source_slides ADD COLUMN IF NOT EXISTS industry VARCHAR(50)")
            print("   ✅ Added industry column to source_slides")
        except Exception as e:
            print(f"   ⚠️ source_slides industry column: {e}")
        
        # Add to slide_embeddings if it exists
        try:
            await conn.execute("ALTER TABLE slide_embeddings ADD COLUMN IF NOT EXISTS industry VARCHAR(50)")
            print("   ✅ Added industry column to slide_embeddings")
        except Exception as e:
            print(f"   ⚠️ slide_embeddings industry column: {e}")
        
        # Add to presentation_sources if it exists
        try:
            await conn.execute("ALTER TABLE presentation_sources ADD COLUMN IF NOT EXISTS industry VARCHAR(50)")
            print("   ✅ Added industry column to presentation_sources")
        except Exception as e:
            print(f"   ⚠️ presentation_sources industry column: {e}")
        
        # Create indexes for faster industry-based queries
        print("📊 Creating indexes...")
        
        try:
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_source_slides_industry ON source_slides(industry)")
            print("   ✅ Created index on source_slides.industry")
        except Exception as e:
            print(f"   ⚠️ source_slides index: {e}")
        
        try:
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_slide_embeddings_industry ON slide_embeddings(industry)")
            print("   ✅ Created index on slide_embeddings.industry")
        except Exception as e:
            print(f"   ⚠️ slide_embeddings index: {e}")
        
        try:
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_presentation_sources_industry ON presentation_sources(industry)")
            print("   ✅ Created index on presentation_sources.industry")
        except Exception as e:
            print(f"   ⚠️ presentation_sources index: {e}")
        
        # Verify tables are empty
        print("✅ Verifying cleanup...")
        
        try:
            slides_count = await conn.fetchval("SELECT COUNT(*) FROM source_slides")
            print(f"   - source_slides: {slides_count} records")
        except Exception as e:
            print(f"   - source_slides: Error - {e}")
        
        try:
            embeddings_count = await conn.fetchval("SELECT COUNT(*) FROM slide_embeddings")
            print(f"   - slide_embeddings: {embeddings_count} records")
        except Exception as e:
            print(f"   - slide_embeddings: Error - {e}")
        
        try:
            sources_count = await conn.fetchval("SELECT COUNT(*) FROM presentation_sources WHERE source_type = 'uploaded'")
            print(f"   - presentation_sources (uploaded): {sources_count} records")
        except Exception as e:
            print(f"   - presentation_sources: Error - {e}")
        
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