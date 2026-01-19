import os
import redis
import requests
import traceback
import redis
from datetime import datetime
from paddleocr import PaddleOCR
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()
REDIS_URL = os.environ["REDIS_URL"]
MONGO_URI = os.environ["MONGO_URI"]
NODE_URL  = os.environ["NODE_URL"]  

r = redis.from_url(REDIS_URL, decode_responses=True)
mongo = MongoClient(MONGO_URI)
db = mongo["openpdf"]
jobs_col = db["jobs"]

ocr = PaddleOCR(lang="en")

def run_ocr(path):
    result = ocr.predict(path)
    text = []
    for page in result:
        for line in page.get("rec_texts", []):
            text.append(line)
    return "\n".join(text)

print("✅ OCR Worker started")

while True:
    try:
        _, jobid = r.brpop("job_queue")
        print("➡ Processing", jobid)

        r.hset(f"job:{jobid}", "status", "processing")
        jobs_col.update_one(
            {"jobid": jobid},
            {"$set": {"status": "processing", "updated_at": datetime.utcnow()}}
        )

        input_path = r.hget(f"job:{jobid}", "path")
        text = run_ocr(input_path)

        # ✅ SEND TO NODE (NOT REDIS)
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
        if "jobid" in locals():
            r.hset(f"job:{jobid}", "status", "failed")
            jobs_col.update_one(
                {"jobid": jobid},
                {"$set": {"status": "failed", "updated_at": datetime.utcnow()}}
            )
