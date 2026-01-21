import os
import redis
import requests
import traceback
import tempfile
from datetime import datetime, timezone
from paddleocr import PaddleOCR
from pymongo import MongoClient

# DISABLE OneDNN before any imports
os.environ['FLAGS_use_onednn'] = '0'
os.environ['ONEDNN_ENABLE'] = '0'
os.environ['FLAGS_use_mkldnn'] = '0'
os.environ['FLAGS_use_cinn'] = '0'
os.environ['FLAGS_use_xpu'] = '0'

print("BOOTING WORKER")
REDIS_URL = os.environ["REDIS_URL"]
MONGO_URI = os.environ["MONGO_URI"]
NODE_URL = os.environ["NODE_URL"]

r = redis.from_url(REDIS_URL, decode_responses=True)
mongo = MongoClient(MONGO_URI)
db = mongo["openpdf"]
jobs_col = db["jobs"]

ocr = None
if ocr is None:
    print("Initializing PaddleOCR...")
    ocr = PaddleOCR(lang="en")

def run_ocr(url):
    global ocr
    
    # Download file from URL
    print(f"Downloading file from: {url}")
    response = requests.get(url)
    response.raise_for_status()  # Raise error if download fails
    
    # Save to temp file
    with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as f:
        f.write(response.content)
        temp_path = f.name
    
    try:
        # Process the downloaded file
        result = ocr.predict(temp_path)
        text = []
        for page in result:
            for line in page.get("rec_texts", []):
                text.append(line)
        return "\n".join(text)
    finally:
        # Clean up temp file
        os.unlink(temp_path)

print("OCR Worker started")

while True:
    try:
        item = r.brpop("job_queue", timeout=30)
        if item is None:
            continue

        _, jobid = item
        print("Processing job:", jobid)

        r.hset(f"job:{jobid}", "status", "processing")
        jobs_col.update_one(
            {"jobid": jobid},
            {"$set": {"status": "processing", "updated_at": datetime.now(timezone.utc)}}
        )

        # Get the URL from Redis
        file_url = r.hget(f"job:{jobid}", "path")
        print(f"File URL: {file_url}")
        
        text = run_ocr(file_url)

        response = requests.post(
            f"{NODE_URL}/worker/result",
            json={"jobid": jobid, "text": text},
            timeout=60
        )

        if response.status_code != 200:
            raise Exception("Failed to send result to Node service")

        print("Job completed:", jobid)

    except Exception:
        traceback.print_exc()
        if "jobid" in locals():
            r.hset(f"job:{jobid}", "status", "failed")
            jobs_col.update_one(
                {"jobid": jobid},
                {"$set": {"status": "failed", "updated_at": datetime.now(timezone.utc)}}
            )