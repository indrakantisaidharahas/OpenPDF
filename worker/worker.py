import os
import redis
import requests
import traceback
from datetime import datetime, timezone
from paddleocr import PaddleOCR
from pymongo import MongoClient

REDIS_URL = os.environ["REDIS_URL"]
MONGO_URI = os.environ["MONGO_URI"]
NODE_URL  = os.environ["NODE_URL"]

r = redis.from_url(REDIS_URL, decode_responses=True)
mongo = MongoClient(MONGO_URI)
db = mongo["openpdf"]
jobs_col = db["jobs"]

ocr = None

def run_ocr(path):
    global ocr
    if ocr is None:
        print("🔄 Initializing PaddleOCR...")
        ocr = PaddleOCR(lang="en")
    result = ocr.predict(path)
    text = []
    for page in result:
        for line in page.get("rec_texts", []):
            text.append(line)
    return "\n".join(text)

print("✅ OCR Worker started")

while True:
    try:
        res = r.brpop("job_queue", timeout=30)
        if res is None:
            continue

        _, jobid = res
        print("➡ Processing", jobid)

        r.hset(f"job:{jobid}", "status", "processing")
        jobs_col.update_one(
            {"jobid": jobid},
            {"$set": {"status": "processing", "updated_at": datetime.now(timezone.utc)}}
        )

        input_path = r.hget(f"job:{jobid}", "path")
        text = run_ocr(input_path)

        res = requests.post(
            f"{NODE_URL}/worker/result",
            json={"jobid": jobid, "text": text},
            timeout=60
        )

        if res.status_code != 200:
            raise Exception("Failed to send result to Node")

        print("✅ Job completed", jobid)

    except Exception:
        traceback.print_exc()
