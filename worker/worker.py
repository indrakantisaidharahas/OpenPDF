import os
import redis
import requests
import traceback
from datetime import datetime, timezone
from paddleocr import PaddleOCR
from pymongo import MongoClient

print("BOOTING WORKER")
# Environment variables (must be set in Railway Variables)
REDIS_URL = os.environ["REDIS_URL"]
MONGO_URI = os.environ["MONGO_URI"]
NODE_URL  = os.environ["NODE_URL"]

# Connections
r = redis.from_url(REDIS_URL, decode_responses=True)
mongo = MongoClient(MONGO_URI)
db = mongo["openpdf"]
jobs_col = db["jobs"]

# Lazy OCR initialization
ocr = None
if ocr is None:
        print("Initializing PaddleOCR...")
        ocr = PaddleOCR(lang="en")

def run_ocr(path):
    global ocr
    result = ocr.predict(path)
    text = []
    for page in result:
        for line in page.get("rec_texts", []):
            text.append(line)
    return "\n".join(text)

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

        input_path = r.hget(f"job:{jobid}", "path")
        text = run_ocr(input_path)

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
