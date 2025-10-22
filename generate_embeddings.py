#!/usr/bin/env python3

import asyncio
import asyncpg
import json
import os
import requests
from typing import List, Dict, Any

async def generate_embeddings_for_all_slides():
    """Generate embeddings for all slides in the database"""
    
    # Database connection
    database_url = os.getenv('DATABASE_URL', 'postgresql://app_user:your_password@127.0.0.1:5432/presentation_generator')
    
    try:
        # Connect to database
        conn = await asyncpg.connect(database_url)
        print("✅ Connected to database")
        
            # Get all slides with industry information
            slides = await conn.fetch("""
                SELECT ss.id, ss.title, ss.content, ss.slide_type, ps.industry
                FROM source_slides ss
                LEFT JOIN presentation_sources ps ON ss.source_id = ps.id
                WHERE ss.content IS NOT NULL AND ss.content != ''
                ORDER BY ss.id
            """)
        
        print(f"📊 Found {len(slides)} slides to process")
        
        # AI service URL
        ai_service_url = "http://localhost:8000"
        
        processed = 0
        for slide in slides:
            try:
                # Prepare content for embedding
                content = f"{slide['title']} {slide['content']}".strip()
                
                if not content:
                    continue
                
                # Generate embedding via AI service
                response = requests.post(
                    f"{ai_service_url}/embeddings/generate",
                    json={"content": content},
                    timeout=30
                )
                
                if response.status_code == 200:
                    embedding_data = response.json()
                    embedding = embedding_data['embedding']
                    
                        # Store in database with industry information
                        await conn.execute("""
                            INSERT INTO slide_embeddings (slide_id, content, embedding, industry)
                            VALUES ($1, $2, $3, $4)
                            ON CONFLICT (slide_id) DO UPDATE SET
                            content = EXCLUDED.content,
                            embedding = EXCLUDED.embedding,
                            industry = EXCLUDED.industry
                        """, slide['id'], content, json.dumps(embedding), slide.get('industry', 'General'))
                    
                    processed += 1
                    print(f"✅ Processed slide {processed}/{len(slides)}: {slide['title'][:50]}...")
                    
                else:
                    print(f"❌ Failed to generate embedding for slide {slide['id']}: {response.status_code}")
                    
            except Exception as e:
                print(f"❌ Error processing slide {slide['id']}: {e}")
                continue
        
        # Check results
        count = await conn.fetchval("SELECT COUNT(*) FROM slide_embeddings")
        print(f"🎉 Generated {count} embeddings successfully!")
        
        await conn.close()
        
    except Exception as e:
        print(f"❌ Database error: {e}")

if __name__ == "__main__":
    asyncio.run(generate_embeddings_for_all_slides())
