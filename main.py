import pdfplumber
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv() 
file=os.getenv("file")
with pdfplumber.open(file) as pdf:
    full_text = ""
    for page in pdf.pages:
        text = page.extract_text()
        if text:
            full_text += text + "\n"


print(full_text)
print(len(full_text))

