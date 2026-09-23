  let currentTur = 'genel'; // app.js'in acilista cagirdigi switchTur('genel') ile ayni olmali
  let DATA, MAJOR, ilByPlaka, districtsByPlaka, districtByGeomId, currentYear;

  function partyColor(name){
    const cur = document.documentElement.getAttribute('data-theme');
    const dark = cur === 'dark' || (cur !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
    const meta = PARTY[name] || PARTY['Diğer'];
    return dark ? meta.dark : meta.light;
  }

