#!/usr/bin/env python3
"""
Test script to verify GPT-5 with low thinking mode configuration
"""
import os
import openai
from dotenv import load_dotenv
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_gpt5_configuration():
    """Test GPT-5 with low thinking mode configuration"""
    
    # Load environment variables
    load_dotenv()
    
    # Get OpenAI API key
    openai_key = os.getenv('OPENAI_API_KEY')
    
    if not openai_key:
        logger.error("OPENAI_API_KEY not found in environment variables")
        return False
    
    try:
        # Initialize OpenAI client
        client = openai.OpenAI(api_key=openai_key)
        logger.info("OpenAI client initialized successfully")
        
        # Test GPT-5 with low thinking mode
        logger.info("Testing GPT-5 with low thinking mode...")
        
        response = client.chat.completions.create(
            model="gpt-5",
            messages=[
                {
                    "role": "user", 
                    "content": "Hello! Please respond with 'GPT-5 with low thinking mode is working correctly!' and nothing else."
                }
            ],
            temperature=0.3,
            max_tokens=50,
            extra_body={
                "thinking_mode": "low"
            }
        )
        
        # Check response
        if response.choices and len(response.choices) > 0:
            message_content = response.choices[0].message.content
            logger.info(f"GPT-5 Response: {message_content}")
            
            if "GPT-5 with low thinking mode is working correctly" in message_content:
                logger.info("✅ GPT-5 with low thinking mode is working correctly!")
                return True
            else:
                logger.warning("⚠️ GPT-5 responded but not as expected")
                return False
        else:
            logger.error("❌ No response from GPT-5")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error testing GPT-5: {e}")
        return False

if __name__ == "__main__":
    success = test_gpt5_configuration()
    if success:
        print("\n🎉 GPT-5 configuration test passed!")
        exit(0)
    else:
        print("\n💥 GPT-5 configuration test failed!")
        exit(1)
