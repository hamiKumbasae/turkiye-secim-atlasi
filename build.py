"""
src/index.template.html + src/styles/main.css + src/js/*.js kaynaklarindan
index.html uretir - turkiye-secim-haritasi/scripts/build.py'nin KUCUK bir
turevi: CSS/JS'i AYNI sekilde tek dosyaya gomer, ama VERI GOMMEZ (veri artik
data/ ve geo/ altindaki ayri statik JSON dosyalarindan fetch() ile okunuyor,
bkz. src/js/data-loader.js). Bu yuzden bu build'in ciktisi ~birkac yuz KB'dir,
eski projenin ~20MB'lik tek-dosyasindan cok daha kucuk.

Kullanim:
  python3 build.py
"""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent
TEMPLATE = ROOT / "src" / "index.template.html"
STYLES = ROOT / "src" / "styles" / "main.css"
JS_DIR = ROOT / "src" / "js"
OUT = ROOT / "index.html"

CSS_PLACEHOLDER = "/*__BUILD_WILL_INSERT_CSS__*/"
JS_PLACEHOLDER = "//__BUILD_WILL_INSERT_JS__"

# Sira onemli: alt bolumler ustteki let/const'lari referans alir (ayni async
# IIFE govdesinde calisir, fonksiyon hoisting'i sayesinde FONKSIYON sirasi
# onemli degil ama ilk calisan top-level kod olan data-loader.js'in en basta
# olmasi gerekir) - turkiye-secim-haritasi/scripts/build.py ile AYNI sira.
JS_FILES = [
    "data-loader.js", "election-config.js", "state.js", "result-utils.js", "seatbar.js",
    "summary.js", "map.js", "tooltip.js", "detail-panel.js", "search.js", "nav.js",
    "table.js", "app.js",
]


def main():
    html = TEMPLATE.read_text(encoding="utf-8")
    css = STYLES.read_text(encoding="utf-8")
    js = "\n".join((JS_DIR / name).read_text(encoding="utf-8") for name in JS_FILES)

    html = html.replace(CSS_PLACEHOLDER, css)
    html = html.replace(JS_PLACEHOLDER, js)

    OUT.write_text(html, encoding="utf-8")
    print(f"yazıldı: {OUT} ({OUT.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    main()
