# Türkiye Seçim Atlası

1950-2024 arası tüm genel seçim, yerel seçim, referandum ve cumhurbaşkanlığı
seçimi sonuçlarını gösteren interaktif harita — 15 seçimde mahalle/muhtarlık
düzeyine kadar iniyor.

Bu repo **sadece ön yüzü** (HTML/CSS/JS) ve **statik, üretilmiş veriyi**
(`data/`, `geo/`) içerir — ham kaynaklar, PDF ayrıştırma/pipeline kodu ve
tarihsel sınır araştırmaları ayrı (özel) bir depoda tutulur. Bu ayrımın
amacı: bu repoyu açan birinin sadece siteyi çalıştıran kodu görmesi, veri
üretiminin iç detaylarını değil.

## Yerelde çalıştırma

Veri artık `index.html`'e gömülü değil, ayrı statik dosyalar olarak
`fetch()` ile okunuyor — bu yüzden dosyayı doğrudan çift tıklayarak açmak
(`file://`) **çalışmaz** (tarayıcılar `file://` altında `fetch`'i
engeller). Basit bir statik sunucuyla açın:

```
python3 -m http.server 8000
# sonra tarayıcıda http://localhost:8000/index.html
```

GitHub Pages, Cloudflare Pages, Netlify gibi herhangi bir statik barındırma
da doğrudan çalışır (build adımı gerekmez, `index.html` + `data/` + `geo/`
zaten hazır commit'li).

## Offline tek-dosya build (opsiyonel)

`build.py`, `src/index.template.html` + `src/styles/main.css` + `src/js/*.js`
dosyalarını tek bir `index.html`'e birleştirir (CSS/JS gömülü, ama veri
**gömülü değil** — hâlâ `data/`/`geo/`'dan fetch edilir, yani bu build'in
çıktısı da bir sunucu gerektirir, salt HTML dosyası olarak çift-tıklanamaz):

```
python3 build.py
```

## Mimari

```
src/index.template.html   HTML iskeleti (CSS/JS placeholder'lı)
src/styles/main.css        Uygulamanın tüm CSS'i
src/js/*.js                 Uygulamanın JS'i (data-loader, election-config,
                             state, seatbar, map, tooltip, detail-panel,
                             search, nav, table, app) — gerçek ES modülleri
                             DEĞİL, build.py bunları tek bir async IIFE'ye
                             birleştirir (paylaşımlı closure/scope).

data/parties.json           Parti renk/kısa-ad tablosu
data/elections/<key>.json   Her seçim (il+ilçe sonuçları) - src/js/app.js
                             sadece SEÇİLEN yılı fetch eder, hepsini birden
                             indirmez.
data/mahalle_votes/<year>.json  Mahalle/muhtarlık düzeyi oy verisi olan
                             yıllar - bir ilçeye tıklandığında lazy-fetch
                             edilir.

geo/il_sinirlari.geojson, ilce_sinirlari.geojson, ilce_sinirlari_hist.geojson,
geo/mahalle_geo.json, geo/district_splits.json, geo/meclis_2024.json,
geo/mahalle_coverage.json, geo/eras/<dönem>.geojson  Harita geometrisi.

index.html (repo kökü)      build.py'nin çıktısı, commit'lenir.
```

`data/` ve `geo/` altındaki dosyalar, veri deposundaki
`scripts/export_static.py` ile üretilir ve buraya kopyalanır — güncelleme
akışı için o deponun README'sine bakın.

## Veri kaynakları

Veriler YSK, TÜİK, TBMM ve belgelenmiş diğer kaynaklardan derlenmiştir.
Resmî YSK yayını değildir. Kaynak ayrıntıları ve metodoloji için sitedeki
"Kaynaklar" panelini kullanın.

## Lisans

MIT — bkz. [LICENSE](LICENSE).
