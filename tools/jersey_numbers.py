"""選手の背番号入りシャツのイラスト（透過PNG）を全員分作る。
元の絵：tools/assets/jersey-base.png（このサイト用に作成したシャツの線画）
数字の書体：Oswald Bold（SIL Open Font License、tools/assets/oswald-OFL.txt）
使い方：python3 tools/jersey_numbers.py  → public/chars/numbers/<背番号>.png
"""
import csv, os
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.path.join(ROOT, 'tools/assets/jersey-base.png')
FONT = os.path.join(ROOT, 'tools/assets/oswald-700.woff')
OUT = os.path.join(ROOT, 'public/chars/numbers')
ERASE = (490, 485, 765, 735)      # 元の絵の「10」を消す範囲
AREA = (440, 485, 815, 740)       # 数字を置ける範囲（胴の内側）
CENTER = (627, 612)               # 数字の中心
HEIGHT = 230                      # 数字の高さ（px）
STROKE = 8                        # 数字のふちの太さ（シャツの線に合わせる）
SIZE = 512                        # 書き出しサイズ

def make(no):
    im = Image.open(BASE).convert('L')
    d = ImageDraw.Draw(im)
    d.rectangle(ERASE, fill=255)
    size = 200
    font = ImageFont.truetype(FONT, size)
    # 高さが HEIGHT になるように文字サイズを合わせる（2桁で幅が広すぎるときは幅に合わせる）
    l, t, r, b = font.getbbox(no, stroke_width=0)
    scale = HEIGHT / (b - t)
    maxw = (AREA[2] - AREA[0]) - 2 * STROKE
    if (r - l) * scale > maxw: scale = maxw / (r - l)
    font = ImageFont.truetype(FONT, int(size * scale))
    l, t, r, b = font.getbbox(no)
    x = CENTER[0] - (l + r) / 2
    y = CENTER[1] - (t + b) / 2
    d.text((x, y), no, font=font, fill=255, stroke_width=STROKE, stroke_fill=0)
    # 白を透過、線を黒に
    alpha = ImageOps.invert(im)
    alpha = alpha.point(lambda v: 0 if v < 40 else min(255, int((v - 40) * 255 / 175)))
    out = Image.new('RGBA', im.size, (17, 17, 17, 0))
    out.putalpha(alpha)
    out = out.crop(out.getbbox()) if out.getbbox() else out
    # 正方形の余白付きにそろえる
    w, h = out.size; s = max(w, h) + 40
    sq = Image.new('RGBA', (s, s), (0, 0, 0, 0)); sq.paste(out, ((s - w) // 2, (s - h) // 2))
    return sq.resize((SIZE, SIZE), Image.LANCZOS)

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    nos = sorted({r['no'] for r in csv.DictReader(open(os.path.join(ROOT, 'src/data/profiles.csv'), encoding='utf-8')) if r['no']}, key=int)
    for no in nos:
        make(no).save(os.path.join(OUT, f'{no}.png'), optimize=True)
    print(len(nos), 'images')
