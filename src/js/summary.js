  // ---------------- kaynak siniflandirmasi ----------------
  // Ust bardaki ve "Kaynaklar" panelindeki rozet icin genel kategori -
  // hangi ozel arsiv/sayfanin kullanildigi burada degil, veri deposunun
  // kendi belgelerinde tutuluyor.
  const SHORT_BADGE = {
    'YSK Resmî Veri': 'YSK Resmî',
    'YSK Resmî Veri (İl)': 'YSK Resmî',
    'YSK (İl) + İkincil (İlçe)': 'YSK + İkincil',
    'YSK + İkincil Kaynak': 'YSK + İkincil',
    'İkincil Kaynak': 'İkincil Kaynak',
  };

  function sourceInfo(){
    if(currentYear==='2014cb' || currentYear==='2007referandum')
      return {cat:'full', badge:'YSK Resmî Veri'};
    if(YEARS_YSK_OFFICIAL_IL.has(currentYear))
      return {cat:'full', badge:'YSK Resmî Veri (İl)'};
    if(YEARS_IL_YSK_ILCE_GITHUB.has(currentYear) || YEARS_YEREL_IL_YSK_ILCE_WIKI.has(currentYear) || currentYear==='2009yerel' || currentYear==='2004yerel')
      return {cat:'mixed', badge:'YSK (İl) + İkincil (İlçe)'};
    if(YEARS_YEREL_1950_1977.has(currentYear) || YEARS_IL_ONLY.has(currentYear))
      return {cat:'secondary', badge:'İkincil Kaynak'};
    return {cat:'full', badge:'YSK Resmî Veri'};
  }

  function computeLevels(){
    const ilceTotal = DATA.ilceler.length;
    const ilceWithData = DATA.ilceler.filter(d=>d.oy && Object.keys(d.oy).length>0).length;
    // MAHALLE_GEO sadece poligon var mi'yi soyler (yildan bagimsiz, hep yuklu) -
    // bu yilin GERCEKTEN mahalle-duzeyi oy verisi olup olmadigini (build.py'nin
    // her yil icin data/normalized/mahalle/<yil>.json'daki ilce sayisini onceden
    // hesaplayip gomdugu MAHALLE_COVERAGE) ayrica kontrol ediyoruz - yoksa
    // "Mahalleye kadar" rozeti, o yil hic mahalle oyu olmasa bile sadece
    // geometri var diye yanlislikla gorunebilirdi.
    const mahalleDistricts = MAHALLE_COVERAGE[currentYear] || 0;
    return {ilceTotal, ilceWithData, ilceOn: ilceWithData>0, mahalleDistricts, mahalleOn: mahalleDistricts>0};
  }

  function renderElectionBar(){
    const isRef = DATA.tur === 'referandum';
    const isYerel = DATA.tur === 'yerel';
    const isCB = DATA.tur === 'cumhurbaskanligi';
    const typeLabel = isRef ? 'Referandum' : (isYerel ? 'Yerel Seçim' : (isCB ? 'Cumhurbaşkanlığı Seçimi' : 'Milletvekili Genel Seçimi'));
    $('#eyebrowText').textContent = (isRef ? 'REFERANDUM' : (isYerel ? 'YEREL SEÇİM' : (isCB ? 'CUMHURBAŞKANLIĞI' : 'GENEL SEÇİM')));
    $('#pageTitle').textContent = DATA.ad+' '+typeLabel;

    const src = sourceInfo();
    const dot = $('#sourceBadgeDot');
    dot.className = 'dot' + (src.cat==='secondary' ? ' secondary' : src.cat==='mixed' ? ' mixed' : '');

    const lv = computeLevels();
    const detailLevel = lv.mahalleOn ? 'Mahalleye kadar' : (lv.ilceOn ? 'İlçe' : 'İl düzeyi');
    $('#sourceBadgeText').textContent = (SHORT_BADGE[src.badge] || src.badge) + ' · Ayrıntı: ' + detailLevel;
  }

  function renderNationalSummary(){
    const iller = DATA.iller;
    const secmen = iller.reduce((s,i)=>s+(i.secmen||0),0);
    const gecerli = iller.reduce((s,i)=>s+(i.gecerliOy||0),0);
    const katilimNum = iller.reduce((s,i)=> s + (i.katilim!=null && i.secmen!=null ? i.katilim*i.secmen : 0), 0);
    const katilimDen = iller.reduce((s,i)=> s + (i.katilim!=null && i.secmen!=null ? i.secmen : 0), 0);
    const katilim = katilimDen>0 ? katilimNum/katilimDen : null;

    // Bu toplamlar sadece il kayitlarindan (DATA.iller) geliyor - yurtdisi
    // secmen ayri bir kapsamda tutuluyor (hicbir ile bagli degil, bkz.
    // renderYurtdisiCard). O yuzden bu secimde yurtdisi verisi VARSA
    // etiketleri "Yurt İçi ..." yaparak yaniltici bir "ulusal toplam"
    // izlenimi vermiyoruz.
    const hasYurtdisi = !!(DATA.yurtdisi && DATA.yurtdisi.oy && Object.keys(DATA.yurtdisi.oy).length);
    const items = [
      [hasYurtdisi ? 'Yurt İçi Katılım' : 'Katılım', katilim!=null ? '%'+katilim.toFixed(2) : '—'],
      [hasYurtdisi ? 'Yurt İçi Seçmen' : 'Seçmen', secmen ? fmt(secmen) : '—'],
      [hasYurtdisi ? 'Yurt İçi Geçerli Oy' : 'Geçerli Oy', gecerli ? fmt(gecerli) : '—'],
    ];
    if(DATA.tur === 'genel' && DATA.toplamSandalye!=null) items.push(['Sandalye', fmt(DATA.toplamSandalye)]);
    items.push(['İl', iller.length]);

    $('#nationalSummary').innerHTML = items.map(([l,v])=>
      '<div class="ns-item"><div class="l">'+l+'</div><div class="v num">'+v+'</div></div>'
    ).join('');
  }

  // ---------------- kaynaklar drawer ----------------
  function renderDrawerBody(){
    const src = sourceInfo();
    const lv = computeLevels();
    let html = '';
    html += '<div class="drawer-section-title">Bu seçim</div>';
    html += '<p><b>'+DATA.ad+' '+($('#eyebrowText').textContent)+'</b></p>';
    html += '<div class="dr-row"><span>Kaynak durumu</span><span class="dr-badge"><span class="dot" style="background:'+(src.cat==='secondary'?'var(--ink-3)':src.cat==='mixed'?'var(--ink-3)':'var(--ok)')+'"></span>'+src.badge+'</span></div>';
    html += '<div class="dr-row"><span>İl kayıtları</span><span>'+DATA.iller.length+'</span></div>';
    html += '<div class="dr-row"><span>İlçe kayıtları (oy verisiyle)</span><span>'+lv.ilceWithData+' / '+lv.ilceTotal+'</span></div>';
    html += '<div class="dr-row"><span>Mahalle kırılımı olan ilçe</span><span>'+lv.mahalleDistricts+'</span></div>';
    html += '<div class="drawer-section-title">Kaynak ve metodoloji</div>';
    html += '<p>Seçim sonuçları ağırlıklı olarak YSK ve diğer resmî kamu kaynaklarından derlenmiştir. Eksik tarihsel dönemlerde ikincil kaynaklardan yararlanılmıştır. Veriler yayın öncesinde normalize edilip doğrulama kontrollerinden geçirilir.</p>';
    html += '<p>Yurtdışı seçmen oyları hiçbir ile bağlı olmadığı için haritaya dahil edilmez, mevcut olduğu seçimlerde ayrı bir panelde gösterilir.</p>';
    html += '<p>Bu bir kişisel veri derleme çalışmasıdır, resmî bir YSK yayını değildir. Kaynak kodu:<br><a class="link-btn" href="https://github.com/hamiKumbasae/turkiye-secim-atlasi" target="_blank" rel="noopener" style="text-decoration:underline;">github.com/hamiKumbasae/turkiye-secim-atlasi</a></p>';
    $('#drawerBody').innerHTML = html;
  }

  function openDrawer(){
    renderDrawerBody();
    $('#kaynaklarDrawer').classList.add('open');
    $('#drawerOverlay').classList.add('open');
  }
  function closeDrawer(){
    $('#kaynaklarDrawer').classList.remove('open');
    $('#drawerOverlay').classList.remove('open');
  }
  $('#sourceBadgeBtn').addEventListener('click', openDrawer);
  $('#btnKaynaklar').addEventListener('click', openDrawer);
  $('#footerKaynaklar').addEventListener('click', openDrawer);
  $('#drawerClose').addEventListener('click', closeDrawer);
  $('#drawerOverlay').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeDrawer(); });

