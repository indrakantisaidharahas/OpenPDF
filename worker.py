import redis
import time
from paddleocr import PaddleOCR
import uuid
import os
import traceback

# Connect to Redis server
r = redis.Redis(host='localhost', port=6379)

# Initialize PaddleOCR
ocr = PaddleOCR(use_textline_orientation=True, lang='en')

def worker(in_path, out_path):
    result = ocr.predict(in_path)

    contxt = ""

    for page in result:
        texts = page.get("rec_texts", [])
        for line in texts:
            contxt += line + "\n"

    with open(out_path, "w") as file:
        file.write(contxt)


while True:
    try:
        # Blocking pop from 'job_queue' list
        jobid = r.brpop('job_queue')[1].decode()

        status = r.hget(f'job:{jobid}', 'status')
        if status != b'pending':
            continue

        r.hset(f'job:{jobid}', 'status', 'processing')
        print("processing one job")
        inpath = r.hget(f'job:{jobid}', 'path').decode()

        filename = f"{uuid.uuid4().hex}.txt"
        outpath = os.path.join("/home/saidharahas/buzzdoc/backend/uploads", filename)

        worker(inpath, outpath)

        r.hset(f'job:{jobid}', mapping={
            'status': 'done',
            'output_path': outpath
        })

    except Exception as e:
        traceback.print_exc()
        if 'jobid' in locals():
            r.hset(f'job:{jobid}', 'status', 'failed')
        else:
            # If no jobid yet, just sleep and continue
            time.sleep(1)

    # Optional: small delay to prevent high CPU usage when idle
    time.sleep(0.1)
