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
geo/mahalle/<ilçe>.json (ilçe başına mahalle poligonları, o ilçeye inilince yüklenir),
geo/district_splits.json, geo/meclis_2024.json,
geo/mahalle_coverage.json, geo/eras/<dönem>.geojson  Harita geometrisi.

index.html (repo kökü)      build.py'nin çıktısı, commit'lenir.
```

`data/` ve `geo/` altındaki dosyalar, veri deposundaki
`scripts/export_static.py` ile üretilir ve buraya kopyalanır — güncelleme
akışı için o deponun README'sine bakın.

## Site özellikleri

- **Harita modları:** Kazanan, Katılım, Parti (oy oranı) ve **Değişim** (seçilen partinin aynı
  türdeki önceki seçime göre oy oranı farkı, yüzde puan; sınırı değişen ilçe karşılaştırılmaz).
- **Paylaşılabilir bağlantı:** seçim, il, ilçe/mahalle, mod, parti ve oylama türü adresin `#`
  kısmında (`#secim=1977&il=6&mod=parti&parti=CHP`); "Bağlantıyı kopyala" düğmesi.
- **Kaynaklar ve yöntem:** [`yontem.html`](yontem.html) — kaynaklar, tarihsel sınırlar, harita
  okuma, bilinen eksikler; sade dille.
- **CSV indirme:** tablo görünümünde ve Kaynaklar çekmecesinde; açık seçimin il ve ilçe sonuçları.
- **Erişilebilirlik:** renk körü dostu palet (Okabe–Ito), klavyeyle gezinme ve ekran okuyucu
  etiketleri, telefonda yatay kayma yok.

## Veri kaynakları

Veriler YSK, TÜİK, TBMM ve belgelenmiş diğer kaynaklardan derlenmiştir.
Resmî YSK yayını değildir. Kaynak ayrıntıları ve metodoloji için sitedeki
"Kaynaklar" panelini kullanın.

## Lisans

- **Kod:** MIT — bkz. [LICENSE](LICENSE).
- **Veri** (`data/`, `geo/`): CC BY-SA 4.0; OpenStreetMap'ten türetilen mahalle sınırları ODbL
  (© OpenStreetMap katkıcıları) — bkz. [LICENSE-DATA.md](LICENSE-DATA.md).

## Yükleme ve hata durumları

Seçim sonucu ve dönem geometrisi birlikte yüklenir; hızlı seçim değişikliklerinde
sadece son isteğin verileri ekrana uygulanır. Yükleme sırasında eski sonuçlar
soluk ve etkileşimsiz tutulur; başka yıl veya seçim türü seçilebilir.
Bağlantı hatalarında **Yeniden dene** aynı isteği sayfayı yenilemeden tekrarlar.

Açılışta yalnız il sınırları ve seçilen seçimin sonuçları indirilir (~170 KB
sıkıştırılmış); harita bunlarla hemen çizilir. İlçe sınırları (~1 MB) ardından arka
planda yüklenir; kullanıcı daha önce bir ile tıklarsa "İlçe sınırları yükleniyor…"
gösterilir.

Mahalle poligonları ilçe başına ayrı dosyadadır (`geo/mahalle/<ilçe>.json`, en büyüğü
~150 KB). Önce tıklanan ilçenin seçilen yılda mahalle oy verisi olup olmadığı kontrol
edilir; varsa yalnız o ilçenin poligonları indirilir ve oturum boyunca önbellekte tutulur.

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

### 1961–2007 ilçe ve il sınırları

- 1961–2007 genel seçimleri, 1961/1982/1987/1988/2007 referandumları ve 1963–2004 yerel
  seçimlerinde (26 seçim) hiçbir bugünkü ilçe sonuçsuz (taralı) kalmıyor: sonradan kurulan
  ilçeler o seçimdeki ilçelerinin poligonuna katılır. Kesin olmayan eşlemeler (birim
  çoğunluğu, en büyük pay, komşuluk) kaynak depodaki tablolarda işaretlidir.
- İstanbul 1961–1991 eski ilçe sınırlarıyla çizilir (mahalle düzeyinde; bir kısmı 1960 nüfus
  sayımına göre yaklaşık).
- Dönem il sınırları (`geo/eras/`) seçim verisindeki ilçe-il bağlılığından üretilir; il ve ilçe
  haritası birebir örtüşür. Yanlış ilde görünen 13 ilçe düzeldi (ör. Cizre, İdil, Silopi →
  Mardin; Beytüşşebap, Uludere → Hakkâri). Yeni dönemler: `era1957_1965` (Kaynarca Kocaeli'de)
  ve `era1994` (Ardahan ve Iğdır ayrı il).
- Veri düzeltmeleri: 1994/1999/2004 yerelde Artvin Hopa'nın çift satırı kaldırıldı; 1994 ve
  1999 yerelde Kaynaşlı Bolu'da.

### Bilinen eksikler

- Her seçimde 15–20 civarı çok kaynaklı ilçe kaba kuralla tek ilçeye bağlı (köy düzeyinde
  kaynak bulunursa bölünebilir).
- Ankara Merkez (1961–1983) ayrı ilçeydi ama sınırı kaynakta yok; haritada poligonu yok.
- 1984 ve 1994 yerel meclis haritalarında oy verisi eksik ilçeler var.
- 1950–1957 il sınırları ve 2009 sonrası ilçe haritaları bu çalışmada denetlenmedi.
- Veri kaynak depoda (`turkiye-secim-haritasi`) üretilir; orada değişince buraya
  `export_static.py --public` ile ayrıca aktarılır.
