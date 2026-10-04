# Türkiye Seçim Atlası

**Canlı site: https://hamikumbasae.github.io/turkiye-secim-atlasi/**

1950-2024 arası tüm genel seçim, yerel seçim, referandum ve cumhurbaşkanlığı
seçimi sonuçlarını gösteren interaktif harita — 15 seçimde mahalle/muhtarlık
düzeyine kadar iniyor.

Bu repo **sadece ön yüzü** (HTML/CSS/JS) ve **statik, üretilmiş veriyi**
(`data/`, `geo/`) içerir — ham kaynaklar, PDF ayrıştırma/pipeline kodu ve
tarihsel sınır araştırmaları ayrı kaynak depoda tutulur. Bu ayrımın
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

## Ön yüzü tek HTML dosyasına derleme (opsiyonel)

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
geo/mahalle_geo.json (ilk uygun ilçe seçiminde yüklenir),
geo/district_splits.json, geo/meclis_2024.json,
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

## Yükleme ve hata durumları

Seçim sonucu ve dönem geometrisi birlikte yüklenir; hızlı seçim değişikliklerinde
sadece son isteğin verileri ekrana uygulanır. Yükleme sırasında eski sonuçlar
soluk ve etkileşimsiz tutulur; başka yıl veya seçim türü seçilebilir.
Bağlantı hatalarında **Yeniden dene** aynı isteği sayfayı yenilemeden tekrarlar.

`geo/mahalle_geo.json` açılışta indirilmez. Önce tıklanan ilçenin seçilen yılda
mahalle oy verisi olup olmadığı kontrol edilir; varsa geometri ilk kez yüklenir
ve oturum boyunca önbellekte tutulur. Şu an geometri ilçe dosyalarına bölünmüş
değildir; ilk uygun ilçe seçiminde tüm geometri dosyası indirilir.

## Otomatik testler

Node.js 22+ ve Python 3 ile:

```sh
npm ci
npx playwright install chromium
python3 build.py
npm test
```

Testler üretilmiş sayfayı Chromium'da gerçek repo verileriyle çalıştırır. Ağ
istekleri yerel dosyalardan karşılanır; gecikme, bağlantı kopması ve HTTP hatası
kontrollü olarak uygulanır. İlk yükleme, yeniden deneme, tarihsel/modern yıl
geçişi, aynı dönem için eşzamanlı istekler, mahallelerin ihtiyaç anında yüklenmesi,
eski mahalle yanıtının yeni seçimi bozmaması ve mobil hata akışı kapsanır.
GitHub Actions aynı testleri push ve pull request olaylarında çalıştırır.

## 04.10.2026 veri güncellemesi

2007 referandumu 923 ilçeye tamamlandı. İstanbul 1989/1991 tarihî
sınır katmanları, 2009/2011 ana ilçe birleşimleri ve Tillo meclis
eşleştirmeleri kaynak depodan aktarıldı. 2019/2024 belediye meclisinde
973 ilçenin tamamı sonuç içeriyor. Daha eski belirsiz sınırlar ve
başkanlık/genel hattındaki kaynak eksikleri açıklamalı kalır.
Bu yayın kopyası `export_static.py --public` ile üretilir; ham PDF ve
mahalle atama kaynak tabloları burada yayımlanmaz.

1961 genel seçimi için 21 ilçe daha kanun/sayım zincirleri ve açıklamalı
yaklaşık çoğunluk yöntemiyle bağlandı; 23 ilçe belirsiz kalır. Ankara
Merkez'in tarihî poligonu için ek kaynak gerekir.
