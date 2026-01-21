FROM python:3.10-slim

# System dependencies for PaddleOCR / OpenCV
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Pre-download PaddleOCR models
RUN python - <<EOF
from paddleocr import PaddleOCR
PaddleOCR(lang="en", use_angle_cls=False)
print("PaddleOCR models cached")
EOF

COPY . .

CMD ["python", "worker.py"]
