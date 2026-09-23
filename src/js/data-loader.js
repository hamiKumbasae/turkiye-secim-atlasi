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
  const FETCH_CACHE = {};
  function fetchJSON(path, fallback){
    if(!(path in FETCH_CACHE)){
      FETCH_CACHE[path] = (async () => {
        const res = await fetch(path);
        if(!res.ok){
          if(res.status === 404 && fallback !== undefined) return fallback;
          throw new Error('Veri alınamadı: '+path+' ('+res.status+')');
        }
        return res.json();
      })();
    }
    return FETCH_CACHE[path];
  }

  let BUNDLE, GEO, GEO_ILCE, GEO_ILCE_HIST, MAHALLE_GEO, MECLIS_2024, MAHALLE_COVERAGE, DISTRICT_SPLITS;
  try{
    // Paylasimli/nispeten kucuk dosyalar (geo, mahalle poligonlari, parti
    // renkleri) burada eager yukleniyor. Secimler ve mahalle oy verisi ise
    // lazy - her yil sadece secildiginde fetchElection()/loadMahalleVotesForYear()
    // ile indirilir (bkz. app.js: loadYear).
    const [partiler, il, ilce, ilceHist, mahalleGeo, meclis, mahalleCoverage, districtSplits] = await Promise.all([
      fetchJSON("data/parties.json"),
      fetchJSON("geo/il_sinirlari.geojson"),
      fetchJSON("geo/ilce_sinirlari.geojson"),
      fetchJSON("geo/ilce_sinirlari_hist.geojson"),
      fetchJSON("geo/mahalle_geo.json", {}),
      fetchJSON("geo/meclis_2024.json", {}),
      fetchJSON("geo/mahalle_coverage.json", {}),
      fetchJSON("geo/district_splits.json", {}),
    ]);
    BUNDLE = {partiler, secimler: {}};
    GEO = il; GEO_ILCE = ilce; GEO_ILCE_HIST = ilceHist; MAHALLE_GEO = mahalleGeo;
    MECLIS_2024 = meclis; MAHALLE_COVERAGE = mahalleCoverage; DISTRICT_SPLITS = districtSplits;
  }catch(e){
    document.body.innerHTML = '<div class="wrap"><p>Veri yüklenemedi: '+e+'</p></div>';
    return;
  }
  async function fetchElection(year){
    if(!(year in BUNDLE.secimler)) BUNDLE.secimler[year] = await fetchJSON("data/elections/"+year+".json");
    return BUNDLE.secimler[year];
  }
  function loadMahalleVotesForYear(year){
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
