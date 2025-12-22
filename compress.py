import sys
from pypdf import PdfWriter

input_path = sys.argv[1]
output_path = sys.argv[2]

writer = PdfWriter(clone_from=input_path)

for page in writer.pages:
    for img in page.images:
        img.replace(img.image, quality=80)

writer.write(output_path)
