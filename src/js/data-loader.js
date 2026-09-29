  const $ = (s,el=document) => el.querySelector(s);
  const $$ = (s,el=document) => [...el.querySelectorAll(s)];
  const fmt = n => n==null ? '—' : n.toLocaleString('tr-TR');
  // Veri kaynagi (YSK/TUIK/vb.) su an her zaman temiz (< > & " icermiyor,
  // dogrulandi), ama isim/parti alanlarini innerHTML'e gomerken yine de
  // kacis uygulanir - veri kaynagi ileride degisirse bu tek satir korur.
  const ESCAPE_MAP = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
  const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ESCAPE_MAP[c]);

  // Veri ayri statik JSON dosyalari olarak fetch() ile okunuyor. Yollar
  // sayfaya gore (relative, basinda / yok) - boylece hem yerelde hem GitHub
  // Pages'in bir alt dizin (repo-adi) altinda servis etmesiyle de calisir.
  // VERI_SURUMU: build.py'nin data/ + geo/ iceriginden hesapladigi ozet. Her istege ?v= olarak
  // eklenir: GitHub Pages dosyalari max-age=600 ile verdigi icin, yeni yayindan sonra sayfa
  // yenilendiginde tarayici eski (onbellekteki) veriyi kullanmasin.
  const VERI_SURUMU = '__VERI_SURUMU__';
  const FETCH_CACHE = {};
  function fetchJSON(path, fallback){
    if(!(path in FETCH_CACHE)){
      FETCH_CACHE[path] = (async () => {
        const res = await fetch(path + '?v=' + VERI_SURUMU);
        if(!res.ok){
          if(res.status === 404 && fallback !== undefined) return fallback;
          throw new Error('Veri alınamadı: '+path+' ('+res.status+')');
        }
        return res.json();
      })().catch(error => {
        delete FETCH_CACHE[path]; // A failed request must be retryable.
        throw error;
      });
    }
    return FETCH_CACHE[path];
  }

  // Shared status UI also works before the rest of the app has initialized.
  function showLoadStatus(message, retry = null){
    const box = $('#loadStatus');
    box.hidden = false;
    box.dataset.state = retry ? 'error' : 'loading';
    $('#loadMessage').textContent = message;
    $('#retryLoad').hidden = !retry;
    $('#retryLoad').onclick = retry;
  }
  function clearLoadStatus(){
    $('#loadStatus').hidden = true;
    $('#retryLoad').onclick = null;
  }
  function setResultsBusy(busy){
    $('#results').inert = busy;
    $('#results').setAttribute('aria-busy', String(busy));
  }

  let BUNDLE, GEO, GEO_ILCE, GEO_ILCE_HIST, MECLIS_2024, MAHALLE_COVERAGE, DISTRICT_SPLITS, HARITA_NOTLARI;
  setResultsBusy(true);
  // Keep initialization retryable without reloading the page or attaching handlers twice.
  while(!BUNDLE){
    showLoadStatus('Harita verileri yükleniyor…');
    try{
      const [partiler, il, ilce, ilceHist, meclis, mahalleCoverage, districtSplits, haritaNotlari] = await Promise.all([
        fetchJSON("data/parties.json"),
        fetchJSON("geo/il_sinirlari.geojson"),
        fetchJSON("geo/ilce_sinirlari.geojson"),
        fetchJSON("geo/ilce_sinirlari_hist.geojson"),
        fetchJSON("geo/meclis_2024.json", {}),
        fetchJSON("geo/mahalle_coverage.json", {}),
        fetchJSON("geo/district_splits.json", {}),
        fetchJSON("geo/harita_notlari.json", {}),
      ]);
      GEO = il; GEO_ILCE = ilce; GEO_ILCE_HIST = ilceHist;
      MECLIS_2024 = meclis; MAHALLE_COVERAGE = mahalleCoverage; DISTRICT_SPLITS = districtSplits; HARITA_NOTLARI = haritaNotlari;
      BUNDLE = {partiler, secimler: {}};
    }catch(error){
      await new Promise(resolve => showLoadStatus('Harita verileri yüklenemedi. Bağlantınızı kontrol edip yeniden deneyin.', () => {
        $('#retryLoad').onclick = null;
        resolve();
      }));
    }
  }
  function loadMahalleGeometry(){
    return fetchJSON("geo/mahalle_geo.json");
  }
  async function fetchElection(year){
    if(!(year in BUNDLE.secimler)) BUNDLE.secimler[year] = await fetchJSON("data/elections/"+year+".json");
    return BUNDLE.secimler[year];
  }
  function loadMahalleVotesForYear(year){
    // Mahalle verisi olmayan yillarda (ornegin 1968 yerel) istek hic atilmaz.
    if(!(year in MAHALLE_COVERAGE)) return Promise.resolve({});
    return fetchJSON("data/mahalle_votes/"+year+".json", {});
  }
  const geoFeatureById = {};
  for(const f of GEO_ILCE.features){ geoFeatureById[f.properties.id] = f; }
  for(const f of GEO_ILCE_HIST.features){ geoFeatureById[f.properties.id] = f; }

  // Ilcenin gosterilecegi poligon, o ilcenin BUGUNKU plaka koduna gore degil, o secim
  // yilinda DATA.ilceler'de kayitli gercek idari bagliliga (plaka) ve o kaydin geomId'sine
  // gore bulunur. Orn. Kirikkale/Karaman/Bartin/Ardahan/Safranbolu gibi sonradan il olan ya
  // da baska bir ile baglanan ilceler, o donemde baska bir ile bagliyken (1984/89'da
  // Kirikkale Ankara'ya, Safranbolu Zonguldak'a bagliydi) o eski ilin haritasinda kendi
  // (dogru sekilli) modern poligonuyla gosterilir - bugunku plaka koduna gore filtrelemek
  // bu ilceleri (ve Antalya Merkez gibi sonradan bolunen ilceleri) haritadan tamamen
  // dusuruyordu, oysa veri seti zaten dogru donemin ilce/geomId eslesmesini iceriyor.
  function districtFeaturesForProvince(plaka){
    const rows = districtsByPlaka[plaka] || [];
    const feats = [];
    const seen = new Set();
    for(const d of rows){
      if(!d.geomId || seen.has(d.geomId)) continue;
      const f = geoFeatureById[d.geomId];
      if(f){ seen.add(d.geomId); feats.push(f); }
    }
    return feats;
  }
  // yerel secim meclis kayitlari (il genel meclisi / belediye meclisi): bkz. election-config.js
  function loadOylama(year, kisa){
    return fetchJSON("data/meclis_harita/"+year+"_"+kisa+".json", null);
  }
