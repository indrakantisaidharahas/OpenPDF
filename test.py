# import random
# from PIL import Image, ImageDraw, ImageFont
# import pytesseract

# epochs = 10
# chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz \n"
# pytesseract.pytesseract.tesseract_cmd = "/usr/bin/tesseract"

# def convert(text):
#     img = Image.new("RGB", (1200, 600), "white")
#     draw = ImageDraw.Draw(img)

#     font = ImageFont.load_default()
#     draw.multiline_text((10, 10), text, fill="black", font=font)

#     return img

# def normalize(s):
#     return " ".join(s.split())

# correct = 0

# for i in range(epochs):
#     f_con = ""
#     for j in range(300):
#         f_con += random.choice(chars)

#     img = convert(f_con)
#     out = pytesseract.image_to_string(img)

#     if normalize(out) == normalize(f_con):
#         correct += 1

# print("Correct OCR count:", correct)




import random
import nltk
from nltk.corpus import words
from PIL import Image, ImageDraw, ImageFont
import pytesseract
import editdistance
import textwrap

# ---------- SETUP ----------
nltk.download('words')

pytesseract.pytesseract.tesseract_cmd = "/usr/bin/tesseract"

VOCAB = [
    w.lower() for w in words.words()
    if w.isalpha() and 3 <= len(w) <= 8
]

EPOCHS = 10
WORDS_PER_SAMPLE = 120

FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_SIZE = 32

# ---------- METRICS ----------
def CER(gt, ocr):
    gt = gt.replace("\n", " ").strip()
    ocr = ocr.replace("\n", " ").strip()
    return editdistance.eval(gt, ocr) / max(1, len(gt))

def WER(gt, ocr):
    gt_words = gt.split()
    ocr_words = ocr.split()
    return editdistance.eval(gt_words, ocr_words) / max(1, len(gt_words))

# ---------- IMAGE ----------
def text_to_image(text):
    font = ImageFont.truetype(FONT_PATH, FONT_SIZE)

    wrapped_text = textwrap.fill(text, width=60)

    dummy = Image.new("RGB", (1600, 10))
    draw = ImageDraw.Draw(dummy)
    _, _, _, h = draw.multiline_textbbox((0, 0), wrapped_text, font=font)

    img = Image.new("RGB", (1600, h + 40), "white")
    draw = ImageDraw.Draw(img)
    draw.multiline_text((20, 20), wrapped_text, fill="black", font=font)

    #img.show()
    return img

# ---------- BENCHMARK ----------
cer_total = 0
wer_total = 0

for i in range(EPOCHS):
    gt_text = " ".join(random.choice(VOCAB) for _ in range(WORDS_PER_SAMPLE))

    img = text_to_image(gt_text)

    ocr_text = pytesseract.image_to_string(
        img,
        config="--oem 3 --psm 6"
    )

    cer = CER(gt_text, ocr_text)
    wer = WER(gt_text, ocr_text)

    print("OCR OUTPUT SAMPLE:\n", ocr_text[:200])

    cer_total += cer
    wer_total += wer

    print(f"Epoch {i+1}: CER={cer:.3f}, WER={wer:.3f}")

print("\nAverage CER:", cer_total / EPOCHS)
print("Average WER:", wer_total / EPOCHS)
