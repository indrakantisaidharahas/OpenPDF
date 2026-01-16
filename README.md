
Trying to Test the Security Using OWASP ZAP 

and also i have tried to test thest the accuracy of tessereact ocr by genrating text images using pillow the metrics used for evaluation were avg CER and avg WER

Average CER: 0.0025130318540632058
Average WER: 0.0016666666666666666

the accuracy seems to be  good 


# PDF to Text Conversion Pipeline

This project implements a full-fledged PDF to text conversion pipeline leveraging a job queue for efficient task processing using Redis.

## Features

- **Asynchronous Job Queue:** Uses Redis to manage and process PDF conversion jobs in the background.
- **Duplicate Request Prevention:** Implements file content hashing to detect and avoid processing duplicate PDF files, saving time and resources.
- **Secure Authentication:** User sessions managed securely with session IDs stored in Redis and user credentials hashed in MongoDB.
- **Status Tracking:** Users can monitor the status of their conversion jobs via API endpoints.
- **Download Results:** Once processing is complete, users can download the converted text files seamlessly.

## How It Works

1. **Upload PDF:** User uploads a PDF file through the frontend.
2. **Hash Check:** The backend hashes the PDF content to check if an identical file has already been processed or is in the queue.
3. **Job Queue:** If the file is new, the job is pushed to a Redis queue.
4. **Worker Process:** A worker consumes jobs from the queue, runs OCR on the PDF, and stores the converted text output.
5. **Status Updates:** Users can poll the job status via an API endpoint.
6. **Download:** Upon completion, the converted text file is available for download.

---

