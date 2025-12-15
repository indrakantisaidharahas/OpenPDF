import pytesseract
from PIL import Image
# Often found in /usr/local/bin/ on macOS/Linux
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv() 
file=os.getenv("imgfile")

pytesseract.pytesseract.tesseract_cmd = r'/usr/bin/tesseract'
print(pytesseract.get_tesseract_version())
#print(pytesseract.image_to_string(Image.open(file)))
pdf = pytesseract.image_to_pdf_or_hocr(file, extension='pdf')