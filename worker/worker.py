import os
import redis
import requests
import traceback
from datetime import datetime, timezone
from pymongo import MongoClient

print("BOOTING WORKER", flush=True)

# Environment variables
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

def run_ocr(path):
    global ocr
    if ocr is None:
        print("Initializing PaddleOCR...", flush=True)
        from paddleocr import PaddleOCR   # ✅ lazy import
        ocr = PaddleOCR(lang="en", use_angle_cls=False)

    result = ocr.predict(path)
    text = []
    for page in result:
        for line in page.get("rec_texts", []):
            text.append(line)
    return "\n".join(text)

print("OCR Worker started", flush=True)

while True:
    try:
        item = r.brpop("job_queue", timeout=30)
        if not item:
            continue

        _, jobid = item
        print("Processing job:", jobid, flush=True)

        r.hset(f"job:{jobid}", "status", "processing")
        jobs_col.update_one(
            {"jobid": jobid},
            {"$set": {"status": "processing", "updated_at": datetime.now(timezone.utc)}}
        )

        input_path = r.hget(f"job:{jobid}", "path")
        if not input_path:
            raise Exception("Input path missing")

        text = run_ocr(input_path)

        response = requests.post(
            f"{NODE_URL}/worker/result",
            json={"jobid": jobid, "text": text},
            timeout=60
        )

        if response.status_code != 200:
            raise Exception("Failed to send result to Node service")

        print("Job completed:", jobid, flush=True)

    except Exception:
        traceback.print_exc()
        if "jobid" in locals():
            r.hset(f"job:{jobid}", "status", "failed")
            jobs_col.update_one(
                {"jobid": jobid},
                {"$set": {"status": "failed", "updated_at": datetime.now(timezone.utc)}}
            )
