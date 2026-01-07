from paddleocr import PaddleOCR
import sys

ocr = PaddleOCR(use_textline_orientation=True, lang='en')

#img_path = "/home/saidharahas/Pictures/Screenshots/Screenshot from 2025-11-27 19-01-10.png"
in_path=sys.argv[1]
out_path=sys.argv[2]

result = ocr.predict(in_path)
contxt=""
# Extract text safely
for page in result:
    for line in page["rec_texts"]:
        contxt+=line 
        contxt+='\n' 
with open(out_path,"w") as file:
      file.write(contxt)
print("done")      