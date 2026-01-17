import redis
import uuid
import os
import traceback
from paddleocr import PaddleOCR

r = redis.Redis(host='localhost', port=6379, decode_responses=True)
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

while True:
    try:
        jobid = r.brpop('job_queue')[1]
        r.hset(f'job:{jobid}', 'status', 'processing')

        inpath = r.hget(f'job:{jobid}', 'path')
        outpath = os.path.join(UPLOAD_DIR, f"{uuid.uuid4().hex}.txt")

        worker(inpath, outpath)

        r.hset(f'job:{jobid}', mapping={
            'status': 'done',
            'output_path': outpath
        })

        userid = r.hget(f'job:{jobid}', 'userid')
        r.publish(f'job_done:{userid}', jobid)

    except Exception:
        traceback.print_exc()
        if 'jobid' in locals():
            r.hset(f'job:{jobid}', 'status', 'failed')
