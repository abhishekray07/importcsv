#!/usr/bin/env python3
"""
Test script to verify rate limiting is working with Redis storage.
"""

import asyncio
import aiohttp
import json
import redis
import time
from typing import Optional

# Configuration
API_URL = "http://localhost:8000/api/v1/imports/key/mapping-suggestions"
REDIS_HOST = "localhost"
REDIS_PORT = 6379

# Test data - you'll need to replace the importerKey with a valid one
test_payload = {
    "importerKey": "db8d92e4-5d6a-4908-84db-5f506696588e",  # Valid key from database
    "uploadColumns": [
        {"name": "email", "sample_data": ["alice@example.com", "bob@example.com"]},
        {"name": "full_name", "sample_data": ["Alice Smith", "Bob Jones"]},
        {"name": "phone", "sample_data": ["555-0100", "555-0101"]},
    ],
    "templateColumns": [
        {"key": "email", "name": "Email Address", "required": True},
        {"key": "name", "name": "Name", "required": True},
        {"key": "phone", "name": "Phone Number", "required": False},
    ]
}


async def make_request(session: aiohttp.ClientSession, request_num: int) -> Optional[int]:
    """Make a single request and return status code."""
    try:
        async with session.post(API_URL, json=test_payload) as response:
            status = response.status
            if status == 429:
                print(f"  Request {request_num:2d}: ❌ RATE LIMITED (429)")
            elif status == 200:
                print(f"  Request {request_num:2d}: ✅ SUCCESS (200)")
            else:
                body = await response.text()
                print(f"  Request {request_num:2d}: ⚠️  Status {status} - {body[:50]}...")
            return status
    except Exception as e:
        print(f"  Request {request_num:2d}: 🔥 ERROR - {e}")
        return None


def check_redis_keys(r: redis.Redis, description: str = "") -> list:
    """Check and display Redis keys."""
    keys = r.keys('*')
    if description:
        print(f"\n{description}")
    print(f"  Redis keys ({len(keys)}): {keys[:5]}..." if len(keys) > 5 else f"  Redis keys ({len(keys)}): {keys}")
    
    # Try to find rate limit specific keys
    rate_keys = [k for k in keys if any(pattern in k.lower() for pattern in ['limit', 'rate', '192.184', 'window'])]
    if rate_keys:
        print(f"  Rate limit keys found: {rate_keys}")
    
    return keys


async def test_rate_limit():
    """Test rate limiting by making multiple requests rapidly."""
    
    # Connect to Redis
    r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
    
    print("=" * 60)
    print("RATE LIMIT TEST - Redis Storage Verification")
    print("=" * 60)
    
    # Clear Redis first
    print("\n1. Clearing Redis...")
    r.flushall()
    print("   ✅ Redis cleared")
    
    initial_keys = check_redis_keys(r, "\n2. Initial Redis state:")
    
    print("\n3. Testing rate limit (20 requests/hour)...")
    print("   Making 25 requests to exceed the limit...\n")
    
    async with aiohttp.ClientSession() as session:
        results = []
        
        # Make requests in small batches to see when rate limiting kicks in
        for batch in range(5):  # 5 batches of 5 requests
            print(f"\n  Batch {batch + 1}:")
            batch_tasks = []
            
            for i in range(5):
                request_num = batch * 5 + i + 1
                task = make_request(session, request_num)
                batch_tasks.append(task)
                
            # Execute batch
            batch_results = await asyncio.gather(*batch_tasks)
            results.extend(batch_results)
            
            # Check Redis after each batch
            current_keys = r.keys('*')
            new_keys = [k for k in current_keys if k not in initial_keys]
            if new_keys:
                print(f"  📍 New Redis keys after batch {batch + 1}: {new_keys}")
            
            # Small delay between batches
            if batch < 4:
                await asyncio.sleep(1)
    
    # Final Redis check
    final_keys = check_redis_keys(r, "\n4. Final Redis state:")
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Total requests made: {len(results)}")
    print(f"Successful (200): {results.count(200)}")
    print(f"Rate limited (429): {results.count(429)}")
    print(f"Other/Errors: {len([r for r in results if r not in [200, 429]])}")
    print(f"New Redis keys created: {len([k for k in final_keys if k not in initial_keys])}")
    
    # Check specific rate limit patterns in Redis
    print("\n5. Checking for rate limit patterns in Redis...")
    
    # Try different potential key patterns
    patterns = [
        "LIMITER*",
        "*192.184*",
        "*rate*",
        "*limit*",
        "*window*",
        "*mapping-suggestions*"
    ]
    
    for pattern in patterns:
        matching_keys = r.keys(pattern)
        if matching_keys:
            print(f"  Found keys matching '{pattern}': {matching_keys}")
            # Try to get value if it's a string
            for key in matching_keys[:2]:  # Check first 2 keys
                try:
                    key_type = r.type(key)
                    if key_type == 'string':
                        value = r.get(key)
                        print(f"    {key} = {value}")
                    elif key_type == 'hash':
                        value = r.hgetall(key)
                        print(f"    {key} (hash) = {value}")
                except:
                    pass
    
    print("\n✅ Test complete!")


if __name__ == "__main__":
    print("Starting rate limit test...")
    print("Make sure your backend is running on http://localhost:8000")
    print("This will make 25 requests to test the 20/hour rate limit\n")
    
    asyncio.run(test_rate_limit())