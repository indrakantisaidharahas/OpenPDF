import pdfplumber
import os
from dotenv import load_dotenv
from pdf2image import convert_from_path

# Load environment variables from .env file
load_dotenv() 
file=os.getenv("file")
# with pdfplumber.open(file) as pdf:
#     full_text = ""
#     for page in pdf.pages:
#         text = page.extract_text()
#         if text:
#             full_text += text + "\n"


# print(full_text)
# print(len(full_text))


# with pdfplumber.open(file) as pdf:
#        page=pdf.pages[0]\
#        img_obj=page.to_image(resolution=300)
#        img_obj.save("ouput.png")



pages = convert_from_path(file)

# 2. Save each page as a JPEG file
for i, page in enumerate(pages):
    page.save(f'page_{i}.jpg', 'JPEG')