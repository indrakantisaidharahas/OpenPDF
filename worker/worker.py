import os
import redis
import requests
import traceback
import tempfile
from datetime import datetime, timezone
from pymongo import MongoClient
from pdf2image import convert_from_path
import easyocr

print("BOOTING WORKER")

# Environment variables
REDIS_URL = os.environ["REDIS_URL"]
MONGO_URI = os.environ["MONGO_URI"]
NODE_URL = os.environ["NODE_URL"]

# Connections
r = redis.from_url(REDIS_URL, decode_responses=True)
mongo = MongoClient(MONGO_URI)
db = mongo["openpdf"]
jobs_col = db["jobs"]

# Initialize EasyOCR (CPU safe)
print("Initializing EasyOCR...")
reader = easyocr.Reader(['en'], gpu=False)

def run_ocr(url):
    print(f"Downloading file from: {url}")
    response = requests.get(url)
    response.raise_for_status()

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
        f.write(response.content)
        pdf_path = f.name

    try:
        images = convert_from_path(pdf_path)
        all_text = []

        for img in images:
            result = reader.readtext(img, detail=0)
            all_text.extend(result)

        return "\n".join(all_text)

    finally:
        os.unlink(pdf_path)

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

        file_url = r.hget(f"job:{jobid}", "path")
        print("File URL:", file_url)

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
