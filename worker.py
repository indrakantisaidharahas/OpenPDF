import redis
import uuid
import os
import traceback
from datetime import datetime,UTC
from paddleocr import PaddleOCR
from pymongo import MongoClient

# ================= REDIS =================
r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# ================= MONGO =================
mongo = MongoClient("mongodb://localhost:27017")
db = mongo["openpdf"]
jobs_col = db["jobs"]

# ================= OCR =================
ocr = PaddleOCR(lang='en')

UPLOAD_DIR = "/home/saidharahas/buzzdoc/backend/uploads"

def worker(inp, outp):
    result = ocr.predict(inp)
    text = ""
    for page in result:
        for line in page.get("rec_texts", []):
            text += line + "\n"

    with open(outp, "w") as f:
        f.write(text)

print("✅ Worker started")

while True:
    try:
        jobid = r.brpop('job_queue')[1]
        print(f"➡ Processing job {jobid}")

        # Redis: processing
        r.hset(f'job:{jobid}', 'status', 'processing')

        # Mongo: processing
        jobs_col.update_one(
            {"jobid": jobid},
            {"$set": {
                "status": "processing",
                "updated_at": datetime.utcnow()
            }}
        )

        inpath = r.hget(f'job:{jobid}', 'path')
        outpath = os.path.join(UPLOAD_DIR, f"{uuid.uuid4().hex}.txt")

        worker(inpath, outpath)

        # Redis: done
        r.hset(f'job:{jobid}', mapping={
            'status': 'done',
            'output_path': outpath
        })

        # Mongo: done
        jobs_col.update_one(
            {"jobid": jobid},
            {"$set": {
                "status": "done",
                "output_path": outpath,
                "updated_at": datetime.utcnow()
            }}
        )

        userid = r.hget(f'job:{jobid}', 'userid')
        r.publish(f'job_done:{userid}', jobid)

        print(f"✅ Job {jobid} completed")

    except Exception:
        traceback.print_exc()

        if 'jobid' in locals():
            # Redis: failed
            r.hset(f'job:{jobid}', 'status', 'failed')

            # Mongo: failed
            jobs_col.update_one(
                {"jobid": jobid},
                {"$set": {
                    "status": "failed",
                    "updated_at": datetime.utcnow()
                }}
            )

            print(f"❌ Job {jobid} failed")
