# ダッシュボード版の公開用に、コメント・字下げ・空行をとる（読みやすい元の index.html はそのまま残す）
# 使い方：python3 -I minify_dash.py 元のindex.html 出力先
import sys, re
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()

def css_min(css):
    css = re.sub(r'/\*[\s\S]*?\*/', '', css)
    lines = [l.strip() for l in css.split('\n')]
    return '\n'.join(l for l in lines if l)

def js_min(js):
    # 複数行のテンプレート文字列の中は触らない：バッククォートの数が奇数の行をまたぐ範囲は残す
    out, in_tpl, in_block = [], False, False
    for line in js.split('\n'):
        st = line.strip()
        if not in_tpl:
            if in_block:
                if '*/' in st: in_block = False
                continue
            if st.startswith('/*') and '*/' not in st: in_block = True; continue
            if re.fullmatch(r'/\*.*\*/', st) or st.startswith('//') or st == '': continue
            line = st
        out.append(line)
        if line.count('`') % 2 == 1: in_tpl = not in_tpl
    return '\n'.join(out)

s = re.sub(r'<style>([\s\S]*?)</style>', lambda m: '<style>' + css_min(m.group(1)) + '</style>', s)
s = re.sub(r'<script>([\s\S]*?)</script>', lambda m: '<script>' + js_min(m.group(1)) + '</script>', s)
s = re.sub(r'<!--[\s\S]*?-->\n?', '', s)
open(out, 'w', encoding='utf-8').write(s)
print(len(open(src, encoding='utf-8').read().encode()), '->', len(s.encode()))
