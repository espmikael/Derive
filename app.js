/* Derivé — perca-se na cidade, encontre-se no café. */
(() => {
  'use strict';

  const CFG = window.DERIVE_CONFIG || {};
  const DEMO = !CFG.GOOGLE_MAPS_API_KEY;
  const app = document.getElementById('app');
  const reduzMovimento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- armazenamento local (só neste navegador) ---------- */
  const store = {
    get(chave, padrao) {
      try {
        const v = localStorage.getItem('derive:' + chave);
        return v == null ? padrao : JSON.parse(v);
      } catch (e) { return padrao; }
    },
    set(chave, valor) {
      try { localStorage.setItem('derive:' + chave, JSON.stringify(valor)); } catch (e) { /* sem armazenamento */ }
    }
  };

  const UF = {
    'Acre': 'AC', 'Alagoas': 'AL', 'Amapá': 'AP', 'Amazonas': 'AM', 'Bahia': 'BA', 'Ceará': 'CE',
    'Distrito Federal': 'DF', 'Espírito Santo': 'ES', 'Goiás': 'GO', 'Maranhão': 'MA', 'Mato Grosso': 'MT',
    'Mato Grosso do Sul': 'MS', 'Minas Gerais': 'MG', 'Pará': 'PA', 'Paraíba': 'PB', 'Paraná': 'PR',
    'Pernambuco': 'PE', 'Piauí': 'PI', 'Rio de Janeiro': 'RJ', 'Rio Grande do Norte': 'RN',
    'Rio Grande do Sul': 'RS', 'Rondônia': 'RO', 'Roraima': 'RR', 'Santa Catarina': 'SC',
    'São Paulo': 'SP', 'Sergipe': 'SE', 'Tocantins': 'TO'
  };

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  /* ---------- estado ---------- */
  const state = {
    cidade: store.get('cidade', null),   // { nome, rotulo, lat, lng, geo }
    user: null,                          // { lat, lng } quando usa localização
    cafes: null,
    cafesDe: null,
    carregando: null,
    erro: null,
    erroGeo: null,
    buscandoGeo: false,
    atual: null,
    fase: 'inicio',                      // inicio | sorteando | pronto | vazio
    filtros: Object.assign({ naoFui: true, aberto: true, trabalhar: false, pet: false, externa: false }, store.get('filtros', {})),
    clima: null,
    climaDe: null,
    modoGrupo: false,
    sortearAoCarregar: false,
    listaFiltro: 'todos',
    surpresa: null,
    timer: null,
    msgIndicar: null
  };

  const visitados = () => store.get('visitados', {});
  const salvarVisitados = (v) => store.set('visitados', v);
  const grupo = () => store.get('grupo', []);
  const salvarGrupo = (g) => store.set('grupo', g);

  /* ---------- ícones ---------- */
  const ico = {
    alvo: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7"/></svg>',
    sortear: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/></svg>',
    pino: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    bussola: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>',
    girar: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5"/></svg>',
    compartilhar: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/></svg>',
    check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>',
    pessoas: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6B3F1D" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.6"/><path d="M16 14.2c2.8.3 5 2.7 5 5.8"/></svg>',
    seta: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
    voltar: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
    xicara: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6B3F1D" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10h13v4a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6z"/><path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M8 3c0 1.5 1 1.5 1 3M12 3c0 1.5 1 1.5 1 3"/></svg>',
    sol: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#B5762A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    nuvem: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#5C564F" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.1 11.2 3.5 3.5 0 0 0 7 18z"/></svg>',
    chuva: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#3F5F7A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 15h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.1 8.2 3.5 3.5 0 0 0 7 15z"/><path d="M8 19l-1 2M12 19l-1 2M16 19l-1 2"/></svg>'
  };

  const ilustracaoFachada = '<svg viewBox="0 0 640 400" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Ilustração de uma fachada de café"><rect width="640" height="400" fill="#E4DDD1"/><rect y="336" width="640" height="64" fill="#CFC6B8"/><rect x="110" y="50" width="420" height="290" fill="#F4EEE4"/><rect x="220" y="78" width="200" height="40" rx="6" fill="#1E1B18"/><text x="320" y="106" text-anchor="middle" font-family="Georgia, serif" font-weight="900" font-size="24" fill="#F4EEE4" letter-spacing="4">CAFÉ</text><g fill="#6B3F1D"><rect x="130" y="140" width="40" height="40"/><rect x="210" y="140" width="40" height="40"/><rect x="290" y="140" width="40" height="40"/><rect x="370" y="140" width="40" height="40"/><rect x="450" y="140" width="40" height="40"/></g><rect x="130" y="138" width="380" height="4" fill="#4E2C13"/><rect x="145" y="200" width="200" height="124" rx="4" fill="#B9AE9E"/><rect x="243" y="200" width="4" height="124" fill="#F4EEE4"/><rect x="380" y="196" width="100" height="144" rx="4" fill="#6B3F1D"/><rect x="394" y="212" width="72" height="56" rx="3" fill="#B9AE9E"/><rect x="490" y="300" width="28" height="36" rx="3" fill="#A8322D"/><circle cx="504" cy="286" r="20" fill="#5C7A5A"/><rect x="352" y="300" width="22" height="36" rx="3" fill="#A8322D"/><circle cx="363" cy="288" r="16" fill="#5C7A5A"/></svg>';

  const painelFlanar = '<a class="painel-flanar" href="#/flanar"><svg class="fundo" viewBox="0 0 400 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g fill="none" stroke="#F2F0EB" stroke-opacity="0.16" stroke-width="2"><path d="M-20 60 L420 20"/><path d="M-20 140 L420 110"/><path d="M-20 225 L420 205"/><path d="M-20 300 L420 290"/><path d="M60 -20 L95 380"/><path d="M170 -20 L185 380"/><path d="M275 -20 L262 380"/><path d="M360 -20 L330 380"/><path d="M-20 360 Q140 250 420 80" stroke-width="7" stroke-opacity="0.1"/></g><g fill="#F2F0EB" fill-opacity="0.1"><rect x="104" y="52" width="58" height="46" rx="4"/><rect x="196" y="122" width="58" height="72" rx="4"/><rect x="20" y="152" width="58" height="58" rx="4"/><rect x="280" y="216" width="40" height="62" rx="4"/><circle cx="320" cy="62" r="26"/></g><path d="M74 214 C110 178 120 132 172 120 S238 158 262 112 S300 52 322 62" fill="none" stroke="#F2F0EB" stroke-width="3" stroke-linecap="round" stroke-dasharray="2 9"/><circle cx="74" cy="214" r="7" fill="#F2F0EB"/><circle cx="172" cy="120" r="4.5" fill="#F2F0EB" fill-opacity="0.75"/><circle cx="262" cy="112" r="4.5" fill="#F2F0EB" fill-opacity="0.75"/><circle cx="322" cy="62" r="17" fill="#F2F0EB"/><path d="M313 58h14v5a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6z" fill="#6B3F1D"/><path d="M327 59.5h2a2.5 2.5 0 0 1 0 5h-2" fill="none" stroke="#6B3F1D" stroke-width="1.8"/></svg><div class="conteudo"><span class="sobretitulo" style="color:inherit;opacity:.8">Flanar</span><span class="frase">Flanar é descobrir<br>a cidade de novo.</span><span class="sub">O café é o destino. O que vale é o caminho até ele.</span><span class="ir">Entenda o conceito <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></div></a>';

  /* ---------- utilidades ---------- */
  function distanciaM(a, b) {
    const R = 6371000, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function rumo(a, b) {
    const rad = Math.PI / 180;
    const y = Math.sin((b.lng - a.lng) * rad) * Math.cos(b.lat * rad);
    const x = Math.cos(a.lat * rad) * Math.sin(b.lat * rad) - Math.sin(a.lat * rad) * Math.cos(b.lat * rad) * Math.cos((b.lng - a.lng) * rad);
    return (Math.atan2(y, x) / rad + 360) % 360;
  }
  const direcao = (g) => ['norte', 'nordeste', 'leste', 'sudeste', 'sul', 'sudoeste', 'oeste', 'noroeste'][Math.round(g / 45) % 8];
  const minutosAPe = (m) => Math.max(1, Math.round(m / 80));
  const nomeCidade = () => (state.cidade ? state.cidade.nome : '');
  const chaveCidade = () => state.cidade
    ? state.cidade.rotulo + (state.cidade.geo && state.cidade.lat ? '@' + state.cidade.lat.toFixed(3) + ',' + state.cidade.lng.toFixed(3) : '')
    : '';
  const b64 = {
    enc: (s) => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
    dec: (s) => atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  };
  const dataBR = (iso) => { try { return new Date(iso).toLocaleDateString('pt-BR'); } catch (e) { return ''; } };
  const linkMapa = (c) => c.maps || ('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(c.nome + ' ' + (c.endereco || '') + ' ' + nomeCidade()) + (c.id && !String(c.id).startsWith('demo') ? '&query_place_id=' + encodeURIComponent(c.id) : ''));
  const linkRota = (c) => 'https://www.google.com/maps/dir/?api=1&travelmode=walking&destination=' + encodeURIComponent(c.lat != null ? c.lat + ',' + c.lng : c.nome + ' ' + nomeCidade()) + (c.id && !String(c.id).startsWith('demo') ? '&destination_place_id=' + encodeURIComponent(c.id) : '');

  /* ---------- Google Maps / Places ---------- */
  let mapsPromise = null;
  window.gm_authFailure = () => {
    state.erro = 'A chave do Google não foi aceita. Confira se ela está liberada para o endereço deste site.';
    state.carregando = null;
    render();
  };
  function carregarGoogle() {
    if (DEMO) return Promise.reject(new Error('demo'));
    if (mapsPromise) return mapsPromise;
    mapsPromise = new Promise((resolve, reject) => {
      window.__deriveMapsOk = () => resolve();
      const s = document.createElement('script');
      s.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(CFG.GOOGLE_MAPS_API_KEY) +
        '&v=weekly&language=pt-BR&region=BR&loading=async&callback=__deriveMapsOk';
      s.async = true;
      s.onerror = () => { mapsPromise = null; reject(new Error('Não foi possível carregar o Google Maps.')); };
      document.head.appendChild(s);
    });
    return mapsPromise;
  }

  const ITENS = [
    ['Pão de queijo', /p[ãa]o de queijo/gi], ['Croissant', /croissant/gi], ['Cappuccino', /cap+uc+ino/gi],
    ['Café coado', /caf[ée] coado|coado/gi], ['Espresso', /espress?o/gi], ['Latte', /\blatte\b/gi],
    ['Mocha', /\bmocha\b/gi], ['Chocolate quente', /chocolate quente/gi], ['Cheesecake', /cheesecake/gi],
    ['Brownie', /brownie/gi], ['Cookie', /cookie/gi], ['Torta', /\btortas?\b/gi], ['Bolo', /\bbolos?\b/gi],
    ['Cuca', /\bcucas?\b/gi], ['Waffle', /waffle/gi], ['Panqueca', /panquecas?/gi], ['Tostada', /tostadas?/gi],
    ['Croque', /croque/gi], ['Quiche', /quiche/gi], ['Empada', /empadas?/gi], ['Sanduíche', /sandu[íi]ches?/gi],
    ['Cinnamon roll', /cinnamon roll|rol[ée] de canela/gi], ['Pastel de nata', /pastel de nata/gi],
    ['Matcha', /matcha/gi], ['Frappé', /frapp[ée]/gi], ['Affogato', /affogato/gi], ['Cold brew', /cold brew/gi]
  ];
  function maisCitado(texto) {
    let melhor = null, max = 0;
    for (const [nome, re] of ITENS) {
      const n = (texto.match(re) || []).length;
      if (n > max) { max = n; melhor = nome; }
    }
    return melhor;
  }
  function horarioHoje(oh) {
    if (!oh || !oh.weekdayDescriptions || !oh.weekdayDescriptions.length) return null;
    const s = oh.weekdayDescriptions[(new Date().getDay() + 6) % 7] || '';
    const i = s.indexOf(':');
    return i >= 0 ? s.slice(i + 1).trim() : s;
  }

  async function mapearPlace(p) {
    let aberto = null;
    try { aberto = await p.isOpen(); } catch (e) { aberto = null; }
    const comps = p.addressComponents || [];
    const pega = (t) => comps.find((x) => (x.types || []).includes(t));
    const bairroC = pega('sublocality_level_1') || pega('sublocality') || pega('neighborhood');
    const rua = pega('route'), num = pega('street_number');
    const endereco = rua ? rua.shortText + (num ? ', ' + num.longText : '') : String(p.formattedAddress || '').split(' - ')[0];
    const textos = (p.reviews || []).map((r) => String(r.text || '')).join(' \n ');
    const foto = p.photos && p.photos[0];
    let fotoUrl = null, fotoCredito = null;
    if (foto) {
      try { fotoUrl = foto.getURI({ maxWidth: 1200 }); } catch (e) { fotoUrl = null; }
      const a = foto.authorAttributions && foto.authorAttributions[0];
      fotoCredito = a ? a.displayName : null;
    }
    const loc = p.location;
    return {
      id: p.id,
      nome: p.displayName || 'Café',
      endereco,
      bairro: bairroC ? bairroC.longText : '',
      lat: loc ? loc.lat() : null,
      lng: loc ? loc.lng() : null,
      nota: typeof p.rating === 'number' ? p.rating : null,
      avaliacoes: p.userRatingCount || 0,
      foto: fotoUrl,
      fotoCredito,
      horario: horarioHoje(p.regularOpeningHours),
      aberto,
      pet: p.allowsDogs === true,
      externa: p.outdoorSeating === true,
      trabalhar: /wi-?fi|tomadas?|notebook|trabalhar|estudar|home ?office/i.test(textos),
      pedir: maisCitado(textos),
      maps: p.googleMapsURI || null
    };
  }

  async function buscarGoogle(cidade) {
    await carregarGoogle();
    const { Place } = await google.maps.importLibrary('places');
    const fields = ['id', 'displayName', 'formattedAddress', 'location', 'rating', 'userRatingCount', 'photos',
      'regularOpeningHours', 'utcOffsetMinutes', 'addressComponents', 'allowsDogs', 'outdoorSeating',
      'reviews', 'googleMapsURI', 'businessStatus'];
    const centro = cidade.lat != null ? { lat: cidade.lat, lng: cidade.lng } : null;
    const consultas = cidade.geo ? ['cafeteria', 'café'] : ['cafeteria em ' + cidade.nome, 'café em ' + cidade.nome];
    const pedido = (q) => {
      const req = { textQuery: q, fields, language: 'pt-BR', region: 'br', maxResultCount: 20 };
      if (centro) req.locationBias = { center: centro, radius: cidade.geo ? 2500 : 8000 };
      return Place.searchByText(req);
    };
    const resp = await Promise.allSettled(consultas.map(pedido));
    const ok = resp.filter((r) => r.status === 'fulfilled');
    if (!ok.length) throw new Error('Não deu pra buscar os cafés agora. Tente de novo em instantes.');
    const vistos = new Map();
    ok.forEach((r) => (r.value.places || []).forEach((p) => { if (!vistos.has(p.id)) vistos.set(p.id, p); }));
    const lista = [...vistos.values()].filter((p) => !p.businessStatus || p.businessStatus === 'OPERATIONAL');
    return Promise.all(lista.map(mapearPlace));
  }

  async function nomeDaLocalizacao(lat, lng) {
    if (DEMO) return null;
    try {
      await carregarGoogle();
      const { Geocoder } = await google.maps.importLibrary('geocoding');
      const { results } = await new Geocoder().geocode({ location: { lat, lng } });
      for (const r of results || []) {
        const c = (r.address_components || []).find((x) => x.types.includes('administrative_area_level_2') || x.types.includes('locality'));
        if (c) {
          const uf = (r.address_components || []).find((x) => x.types.includes('administrative_area_level_1'));
          return { nome: c.long_name, uf: uf ? uf.short_name : '' };
        }
      }
    } catch (e) { /* segue sem nome */ }
    return null;
  }

  /* ---------- modo demonstração ---------- */
  function cafesDemo() {
    return [
      { id: 'demo-relicario', nome: 'O Relicário Café', endereco: 'Av. João Pessoa, 1003', bairro: 'Farroupilha', lat: -30.0399, lng: -51.2199, nota: null, avaliacoes: 0, foto: null, horario: 'ter a sex 13h–20h · sáb e dom 10h–20h', aberto: null, pet: false, externa: false, trabalhar: false, pedir: 'Mini Bolo da Vovó', demo: true },
      { id: 'demo-2', nome: 'Café de exemplo', endereco: 'Rua de exemplo, 100', bairro: 'Cidade Baixa', lat: -30.0410, lng: -51.2260, nota: null, avaliacoes: 0, foto: null, horario: null, aberto: null, pet: true, externa: true, trabalhar: true, pedir: null, demo: true },
      { id: 'demo-3', nome: 'Outro café de exemplo', endereco: 'Rua de exemplo, 200', bairro: 'Bom Fim', lat: -30.0330, lng: -51.2140, nota: null, avaliacoes: 0, foto: null, horario: null, aberto: null, pet: false, externa: true, trabalhar: false, pedir: null, demo: true },
      { id: 'demo-4', nome: 'Mais um café de exemplo', endereco: 'Rua de exemplo, 300', bairro: 'Moinhos de Vento', lat: -30.0260, lng: -51.2020, nota: null, avaliacoes: 0, foto: null, horario: null, aberto: null, pet: true, externa: false, trabalhar: true, pedir: null, demo: true }
    ];
  }

  /* ---------- dados: carregar cafés e clima ---------- */
  async function carregarCafes() {
    const chave = chaveCidade();
    if (!chave || state.carregando === chave) return;
    state.carregando = chave;
    state.erro = null;
    render();
    try {
      const lista = DEMO ? cafesDemo() : await buscarGoogle(state.cidade);
      if (chaveCidade() !== chave) return;
      state.cafes = lista;
      registrarBairros(lista);
    } catch (e) {
      if (chaveCidade() !== chave) return;
      state.cafes = [];
      if (!state.erro) state.erro = e.message || 'Algo deu errado ao buscar os cafés.';
    }
    state.cafesDe = chave;
    state.carregando = null;
    render();
    if (state.sortearAoCarregar && rota().path === '/cafe') {
      state.sortearAoCarregar = false;
      sortear();
    }
  }

  function registrarBairros(lista) {
    const todos = store.get('bairros', {});
    const nome = nomeCidade();
    const set = new Set(todos[nome] || []);
    lista.forEach((c) => { if (c.bairro) set.add(c.bairro); });
    todos[nome] = [...set];
    store.set('bairros', todos);
  }

  async function carregarClima() {
    const ref = state.user || state.cidade;
    if (!ref || ref.lat == null) return;
    const chave = ref.lat.toFixed(2) + ',' + ref.lng.toFixed(2);
    if (state.climaDe === chave) return;
    state.climaDe = chave;
    try {
      const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + ref.lat + '&longitude=' + ref.lng +
        '&current=temperature_2m,weather_code&hourly=precipitation_probability&forecast_hours=8&timezone=auto';
      const r = await fetch(url);
      if (!r.ok) throw new Error('clima');
      const j = await r.json();
      const probs = ((j.hourly && j.hourly.precipitation_probability) || []).filter((n) => n != null);
      state.clima = {
        t: Math.round(j.current.temperature_2m),
        chuva: probs.length ? Math.max(...probs) : 0,
        code: j.current.weather_code
      };
    } catch (e) {
      state.clima = null;
    }
    if (rota().path === '/cafe') render();
  }

  /* ---------- cidade e localização ---------- */
  function definirCidade(c) {
    state.cidade = c;
    store.set('cidade', c);
    state.atual = null;
    state.fase = 'inicio';
    state.cafes = null;
    state.cafesDe = null;
    state.clima = null;
    state.climaDe = null;
    state.erro = null;
  }

  async function escolherCidadePorNome(texto) {
    const limpo = String(texto || '').trim();
    if (!limpo) return;
    const termo = limpo.split(',')[0].trim();
    let cidade = { nome: termo, rotulo: limpo, lat: null, lng: null, geo: false };
    try {
      const r = await fetch('https://geocoding-api.open-meteo.com/v1/search?count=5&language=pt&format=json&name=' + encodeURIComponent(termo));
      const j = await r.json();
      const res = (j.results || []);
      const g = res.find((x) => x.country_code === 'BR') || res[0];
      if (g) {
        const uf = g.country_code === 'BR' ? UF[g.admin1] : null;
        cidade = { nome: g.name, rotulo: g.name + (uf ? ', ' + uf : (g.country ? ', ' + g.country : '')), lat: g.latitude, lng: g.longitude, geo: false };
      }
    } catch (e) { /* segue só com o nome */ }
    state.user = null;
    definirCidade(cidade);
    irPara('#/cafe');
  }

  function usarLocalizacao(destino) {
    if (!navigator.geolocation) {
      state.erroGeo = 'Seu navegador não informa a localização. Digite a cidade.';
      render();
      return;
    }
    state.buscandoGeo = true;
    state.erroGeo = null;
    render();
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude, lng = pos.coords.longitude;
      state.user = { lat, lng };
      const local = await nomeDaLocalizacao(lat, lng);
      state.buscandoGeo = false;
      if (destino === '#/surpresa' && state.cidade) {
        render();
        return;
      }
      definirCidade({
        nome: local ? local.nome : 'Perto de você',
        rotulo: local ? local.nome + (local.uf ? ', ' + local.uf : '') : 'Perto de você',
        lat, lng, geo: true
      });
      irPara(destino || '#/cafe');
    }, () => {
      state.buscandoGeo = false;
      state.erroGeo = 'Não deu pra pegar sua localização. Libere o acesso no navegador ou digite a cidade.';
      render();
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  }

  /* ---------- sorteio ---------- */
  function excluidosGrupo() {
    const s = new Set();
    if (!state.modoGrupo) return s;
    grupo().forEach((m) => (m.ids || []).forEach((id) => s.add(id)));
    return s;
  }
  function candidatos(semAtual) {
    const v = visitados();
    const f = state.filtros;
    const grupoEx = excluidosGrupo();
    const lista = (state.cafes || []).filter((c) => {
      const reg = v[c.id];
      if (reg && reg.voltaria === false) return false;
      if ((f.naoFui || state.modoGrupo) && reg) return false;
      if (grupoEx.has(c.id)) return false;
      if (f.aberto && c.aberto === false) return false;
      if (f.pet && !c.pet) return false;
      if (f.externa && !c.externa) return false;
      if (f.trabalhar && !c.trabalhar) return false;
      return true;
    });
    if (semAtual && state.atual && lista.length > 1) return lista.filter((c) => c.id !== state.atual.id);
    return lista;
  }
  function peso(c) {
    const C = 4.4, m = 15;
    const v = c.avaliacoes || 0;
    const score = c.nota == null ? C : (v * c.nota + m * C) / (v + m);
    return Math.pow(Math.max(score - 3, 0.2), 3);
  }
  function escolherPonderado(lista) {
    const total = lista.reduce((s, c) => s + peso(c), 0);
    let r = Math.random() * total;
    for (const c of lista) { r -= peso(c); if (r <= 0) return c; }
    return lista[lista.length - 1];
  }

  function sortear() {
    if (!state.cafes) { state.sortearAoCarregar = true; carregarCafes(); return; }
    clearInterval(state.timer);
    const lista = candidatos(true);
    if (!lista.length) { state.fase = 'vazio'; render(); return; }
    const escolhido = escolherPonderado(lista);
    let bairros = [...new Set((state.cafes || []).map((c) => c.bairro).filter(Boolean))];
    if (!bairros.length) bairros = [nomeCidade() || 'sua cidade'];
    state.fase = 'sorteando';
    render();
    const cartao = document.getElementById('cartao');
    if (cartao && window.innerWidth < 900) cartao.scrollIntoView({ behavior: reduzMovimento() ? 'auto' : 'smooth', block: 'start' });
    const finalizar = () => {
      clearInterval(state.timer);
      state.atual = escolhido;
      state.fase = 'pronto';
      state.animar = true;
      render();
    };
    if (reduzMovimento()) { setTimeout(finalizar, 300); return; }
    let passo = 0;
    state.timer = setInterval(() => {
      passo += 1;
      const el = document.getElementById('roleta');
      if (el) el.textContent = bairros[passo % bairros.length];
      if (passo >= 16) finalizar();
    }, 110);
  }

  /* ---------- marcações ---------- */
  function marcarVisita(c, fui) {
    const v = visitados();
    if (fui) {
      v[c.id] = Object.assign({ voltaria: null }, v[c.id], {
        nome: c.nome, bairro: c.bairro, endereco: c.endereco, cidade: nomeCidade(),
        lat: c.lat, lng: c.lng, maps: c.maps || null, data: (v[c.id] && v[c.id].data) || new Date().toISOString()
      });
    } else {
      delete v[c.id];
    }
    salvarVisitados(v);
  }
  function marcarVoltaria(id, valor) {
    const v = visitados();
    if (!v[id]) return;
    v[id].voltaria = v[id].voltaria === valor ? null : valor;
    salvarVisitados(v);
  }

  /* ---------- rotas ---------- */
  function rota() {
    const h = location.hash.replace(/^#/, '') || '/';
    const i = h.indexOf('?');
    return { path: i >= 0 ? h.slice(0, i) : h, params: new URLSearchParams(i >= 0 ? h.slice(i + 1) : '') };
  }
  function irPara(hash) {
    if (location.hash === hash) render(); else location.hash = hash;
  }

  /* ---------- views ---------- */
  function topo(path) {
    const hojeHref = state.cidade ? '#/cafe' : '#/';
    const atual = (p) => (p === path || (p === '/cafe' && ['/', '/cafe', '/surpresa', '/grupo'].includes(path))) ? ' aria-current="page"' : '';
    return '<header class="topo"><div class="wrap topo-in"><a class="marca" href="#/">Derivé</a>' +
      '<nav aria-label="Navegação principal">' +
      '<a href="' + hojeHref + '"' + atual('/cafe') + '>Hoje</a>' +
      '<a href="#/flanar"' + atual('/flanar') + '>Flanar</a>' +
      '<a href="#/meus-cafes"' + atual('/meus-cafes') + '>Meus cafés</a>' +
      '</nav></div></header>';
  }

  function viewHome() {
    const valor = state.cidade && !state.cidade.geo ? state.cidade.rotulo : '';
    return '<main class="wrap home">' +
      '<section class="hero"><h1 class="h-display">Deixa a cidade<br>escolher o café.</h1>' +
      '<p>Diga onde você está. O Derivé sorteia um café por perto, e o caminho até lá fica por sua conta.</p></section>' +
      '<form id="form-cidade" class="busca"><label for="cidade" class="rotulo">Em que cidade você está?</label>' +
      '<div class="busca-linha"><input id="cidade" name="cidade" type="text" required placeholder="Digite sua cidade" autocomplete="address-level2" value="' + esc(valor) + '">' +
      '<button class="btn btn-pri" type="submit">Ver o café de hoje</button></div>' +
      '<button type="button" class="link-ico" data-acao="geo" style="align-self:flex-start;color:var(--tinta)"' + (state.buscandoGeo ? ' disabled' : '') + '>' + ico.alvo + (state.buscandoGeo ? 'Buscando sua localização…' : 'Usar minha localização') + '</button>' +
      (state.erroGeo ? '<p class="aviso" role="alert">' + esc(state.erroGeo) + '</p>' : '') +
      '</form>' +
      '<div class="atalhos"><span class="rotulo">ou comece por</span><div class="chips">' +
      ['Porto Alegre', 'São Leopoldo', 'Novo Hamburgo'].map((n) => '<button type="button" class="chip" data-acao="cidade" data-nome="' + esc(n) + '">' + esc(n) + '</button>').join('') +
      '</div></div>' +
      '<section class="sobre"><h2 class="h2">O que é o Derivé</h2>' +
      '<p>Flanar é andar pela cidade sem pressa e sem destino, só pelo prazer de observar as ruas e as pessoas. O nome Derivé vem de uma ideia parecida, a <em>dérive</em> (deriva), criada pelos situacionistas franceses nos anos 1950: atravessar a cidade sem roteiro, deixando que as ruas decidam o caminho.</p>' +
      '<p>Aqui, isso vira um rolê simples. A gente escolhe um café perto de você, e você vai a pé, olhando a cidade no caminho.</p></section>' +
      '<div class="cards3">' +
      card(1, 'A gente escolhe por você', 'Nada de rolar lista e comparar notas. Sorteamos uma opção e a decisão já está tomada.') +
      card(2, 'Permita-se flanar', 'Vá sem pressa e sem roteiro. O café é o destino, mas o passeio começa na primeira esquina.') +
      card(3, 'Outras cidades na sua cidade', 'Cada bairro tem seu jeito. Marque onde já foi e descubra os pedaços da cidade que você ainda não conhece.') +
      '</div></main>' +
      '<footer class="rodape"><div class="wrap"><p>Perca-se na cidade,<br>encontre-se no café.</p><span>Derivé · cafés pela cidade, a pé</span></div></footer>';
  }
  const card = (n, t, d) => '<div class="card-num"><span class="n">' + n + '</span><strong>' + t + '</strong><span>' + d + '</span></div>';

  function blocoClima() {
    const c = state.clima;
    if (!c) return '';
    let icone = ico.sol, linha, dica;
    if (c.chuva >= 60) { icone = ico.chuva; linha = 'chuva provável nas próximas horas'; dica = 'Talvez seja dia de um café mais perto.'; }
    else if (c.chuva >= 25) { icone = ico.nuvem; linha = 'pode chover (' + c.chuva + '%)'; dica = 'Leve um guarda-chuva, por via das dúvidas.'; }
    else { if (c.code >= 2) icone = ico.nuvem; linha = 'sem chuva nas próximas horas'; dica = 'Dia bom pra ir a pé.'; }
    return '<div class="bloco-branco">' + icone + '<div class="txt"><strong>' + c.t + '°, ' + linha + '</strong><small>' + dica + '</small></div></div>';
  }

  function chipsFiltros() {
    const f = state.filtros;
    const itens = [['naoFui', 'Só onde ainda não fui'], ['aberto', 'Aberto agora'], ['trabalhar', 'Bom pra trabalhar'], ['pet', 'Pet friendly'], ['externa', 'Área externa']];
    return itens.map(([k, t]) => '<button type="button" class="chip" data-acao="filtro" data-f="' + k + '" aria-pressed="' + (f[k] ? 'true' : 'false') + '">' + t + '</button>').join('');
  }

  function viewCafe() {
    if (!state.cidade) { setTimeout(() => irPara('#/'), 0); return ''; }
    if (state.cafesDe !== chaveCidade() && !state.carregando) setTimeout(carregarCafes, 0);
    setTimeout(carregarClima, 0);
    const v = visitados();
    const contagem = Object.values(v).filter((x) => x.cidade === nomeCidade()).length;
    const membros = grupo();
    const blocoGrupo = state.modoGrupo
      ? '<div class="bloco-branco grupo-ativo">' + ico.pessoas + '<div class="txt"><strong>Sorteio do grupo</strong><small>Só cafés onde ninguém de vocês ' + (membros.length + 1) + ' foi ainda.</small></div><button type="button" class="link-ico" data-acao="sair-grupo">Sair</button></div>'
      : '<a class="bloco-branco" href="#/grupo">' + ico.pessoas + '<div class="txt"><strong>Vai com alguém?</strong><small>Derive em grupo e sorteie um café onde ninguém foi.</small></div>' + ico.seta + '</a>';
    return '<main class="wrap">' +
      (DEMO ? '<p class="demo">Modo demonstração: os cafés são exemplos. Configure a chave do Google em <code>config.js</code> pra ver cafés reais.</p>' : '') +
      '<div class="cafe-layout"><section class="col-esq">' +
      '<div><h1 class="h-display">' + (state.fase === 'pronto' ? 'Perca-se no<br>próximo café.' : 'Seu café<br>de hoje') + '</h1>' +
      '<div class="cidade-linha"><strong>' + esc(state.cidade.rotulo) + '</strong><a href="#/">trocar cidade</a></div></div>' +
      blocoClima() +
      '<div style="display:flex;flex-direction:column;gap:10px"><span class="rotulo">Filtros</span><div class="chips">' + chipsFiltros() + '</div></div>' +
      blocoGrupo +
      '<a class="contador" href="#/meus-cafes"><span class="num">' + contagem + '</span><span>' + (contagem === 1 ? 'café' : 'cafés') + ' de ' + esc(nomeCidade()) + ' que você já conheceu com o app</span></a>' +
      painelFlanar +
      '</section><section id="cartao" class="cartao" aria-live="polite">' + conteudoCartao() + '</section></div></main>';
  }

  function conteudoCartao() {
    if (state.carregando || (!state.cafes && !state.erro)) {
      return '<div class="cartao-estado"><div class="pontos" aria-hidden="true"><span></span><span></span><span></span></div><p>Procurando cafés em ' + esc(nomeCidade()) + '…</p></div>';
    }
    if (state.erro) {
      return '<div class="cartao-estado"><span class="titulo">Ops, não deu certo.</span><p>' + esc(state.erro) + '</p><button type="button" class="btn btn-sec" data-acao="recarregar">Tentar de novo</button></div>';
    }
    if (!state.cafes.length) {
      return '<div class="cartao-estado"><span class="titulo">Nenhum café encontrado.</span><p>Não achamos cafés em ' + esc(nomeCidade()) + '. Confira o nome da cidade.</p><a class="btn btn-sec" href="#/">Trocar cidade</a></div>';
    }
    if (state.fase === 'sorteando') {
      return '<div class="cartao-estado"><svg width="140" height="140" viewBox="0 0 140 140" aria-hidden="true"><circle cx="70" cy="70" r="64" fill="#fff" stroke="#DDD7CD" stroke-width="2"/><text x="70" y="22" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="600" fill="#5C564F">N</text><g class="girando"><path d="M70 20 L82 74 L70 66 L58 74 Z" fill="#6B3F1D"/><path d="M70 120 L80 74 L70 80 L60 74 Z" fill="#D9D3C9"/></g><circle cx="70" cy="70" r="6" fill="#1E1B18"/></svg>' +
        '<div style="display:flex;flex-direction:column;gap:6px"><span class="sobretitulo">Sorteando</span><span class="titulo">Procurando em <span id="roleta">' + esc(nomeCidade()) + '</span></span></div>' +
        '<div class="pontos" aria-hidden="true"><span></span><span></span><span></span></div></div>';
    }
    if (state.fase === 'vazio') {
      return '<div class="cartao-estado"><span class="titulo">Nenhum café com esses filtros.</span><p>Tente desligar alguns filtros' + (state.modoGrupo ? ' ou sair do sorteio do grupo' : '') + '.</p><button type="button" class="btn btn-sec" data-acao="limpar-filtros">Limpar filtros e sortear</button></div>';
    }
    if (state.fase !== 'pronto' || !state.atual) {
      return '<div class="cartao-estado"><svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="56" fill="#F2F0EB" stroke="#DDD7CD" stroke-width="2" stroke-dasharray="5 7"/><path d="M34 52h44v14a20 20 0 0 1-20 20h-4a20 20 0 0 1-20-20z" fill="#6B3F1D"/><path d="M78 55h5a8 8 0 0 1 0 16h-5" fill="none" stroke="#6B3F1D" stroke-width="5"/><path d="M46 30c0 5 4 5 4 10M58 26c0 5 4 5 4 10M70 30c0 5 4 5 4 10" fill="none" stroke="#B9B2A8" stroke-width="3" stroke-linecap="round"/></svg>' +
        '<span class="titulo">Um café novo, escolhido pra você.</span><p>Ajuste os filtros, se quiser, e deixa a sorte decidir.</p>' +
        '<button type="button" class="btn btn-pri btn-grande" data-acao="sortear">' + ico.sortear + 'Sortear café</button></div>';
    }
    return cartaoPronto(state.atual);
  }

  function cartaoPronto(c) {
    const reg = visitados()[c.id];
    const fui = !!reg;
    const dist = state.user && c.lat != null ? minutosAPe(distanciaM(state.user, c)) : null;
    const meta2 = [dist ? dist + ' min a pé' : null, c.avaliacoes ? c.avaliacoes.toLocaleString('pt-BR') + ' avaliações' : null].filter(Boolean).join(' · ');
    const nota = c.nota != null ? '<span class="nota">★ ' + c.nota.toFixed(1).replace('.', ',') + '</span>' : '';
    const tags = [
      c.aberto === true ? '<span class="aberto">Aberto agora</span>' : '',
      c.aberto === false ? '<span class="fechado">Fechado agora</span>' : '',
      c.horario ? '<span class="tag">Hoje: ' + esc(c.horario) + '</span>' : '',
      c.pet ? '<span class="tag">Pet friendly</span>' : '',
      c.externa ? '<span class="tag">Área externa</span>' : '',
      c.trabalhar ? '<span class="tag">Bom pra trabalhar</span>' : ''
    ].join('');
    const pedir = c.pedir
      ? '<div class="pedir">' + ico.xicara + '<div><span class="sobretitulo">O que pedir</span><strong>' + esc(c.pedir) + '</strong><small>' + (c.demo ? 'Exemplo para a demonstração.' : 'O mais citado nas avaliações do Google.') + '</small></div></div>'
      : '';
    const voltaria = fui
      ? '<div class="voltaria"><span class="rotulo">Voltaria?</span>' +
        '<button type="button" class="chip" data-acao="voltaria" data-v="sim" aria-pressed="' + (reg.voltaria === true) + '">Voltaria</button>' +
        '<button type="button" class="chip" data-acao="voltaria" data-v="nao" aria-pressed="' + (reg.voltaria === false) + '">Não voltaria</button></div>'
      : '';
    const textoWhats = 'Bora flanar até o ' + c.nome + '? ' + [c.endereco, c.bairro].filter(Boolean).join(' · ') + ' ' + linkMapa(c);
    const foto = c.foto
      ? '<img src="' + esc(c.foto) + '" alt="Foto de ' + esc(c.nome) + '" loading="lazy" referrerpolicy="no-referrer">' + (c.fotoCredito ? '<span class="credito">Foto: ' + esc(c.fotoCredito) + '</span>' : '')
      : ilustracaoFachada;
    return '<div class="' + (state.animar ? 'surge' : '') + '"><div class="foto">' + foto +
      (fui ? '<span class="selo">Já fui</span>' : '') +
      (state.modoGrupo ? '<span class="selo selo-grupo">Ninguém do grupo foi</span>' : '') +
      '</div><div class="cartao-corpo">' +
      '<div class="info"><div class="nome-linha"><h2>' + esc(c.nome) + '</h2>' + nota + '</div>' +
      '<p class="meta">' + esc([c.endereco, c.bairro].filter(Boolean).join(' · ')) + '</p>' +
      (meta2 ? '<p class="meta">' + meta2 + '</p>' : '') +
      (tags ? '<div class="tags">' + tags + '</div>' : '') + '</div>' +
      pedir +
      '<div class="ja-fui"><span class="rotulo">Você já foi aqui?</span><div class="segmentado">' +
      '<button type="button" data-acao="fui" data-v="nao" aria-pressed="' + !fui + '">Ainda não</button>' +
      '<button type="button" class="sim" data-acao="fui" data-v="sim" aria-pressed="' + fui + '">' + ico.check + 'Já fui</button></div>' + voltaria + '</div>' +
      '<div class="acoes"><a class="btn btn-pri" href="' + esc(linkRota(c)) + '" target="_blank" rel="noopener">' + ico.pino + 'Como chegar a pé</a>' +
      '<a class="btn btn-sec" href="#/surpresa">' + ico.bussola + 'Ir no modo surpresa</a></div>' +
      '<div class="acoes2"><button type="button" class="link-ico" data-acao="sortear">' + ico.girar + 'Hoje não, sorteia outro</button>' +
      '<a class="link-ico" href="https://wa.me/?text=' + encodeURIComponent(textoWhats) + '" target="_blank" rel="noopener">' + ico.compartilhar + 'Chamar a galera</a></div>' +
      (c.demo ? '' : '<p class="atrib">Dados e fotos: Google Maps</p>') +
      '</div></div>';
  }

  function viewSurpresa() {
    const c = state.atual;
    if (!c) { setTimeout(() => irPara(state.cidade ? '#/cafe' : '#/'), 0); return ''; }
    const voltar = '<a class="voltar" href="#/cafe">' + ico.voltar + 'Sair do modo surpresa</a>';
    if (!state.user || c.lat == null) {
      return '<main class="wrap">' + voltar + '<div class="centro"><span class="sobretitulo">Modo surpresa</span>' +
        '<h1 class="h-display">Siga a bússola.</h1>' +
        '<p class="texto-suave">No modo surpresa você só vê a direção e o tempo de caminhada. O nome do café aparece quando você chegar perto. Pra isso, o Derivé precisa da sua localização.</p>' +
        '<button type="button" class="btn btn-pri" data-acao="geo-surpresa"' + (state.buscandoGeo ? ' disabled' : '') + '>' + ico.alvo + (state.buscandoGeo ? 'Buscando…' : 'Usar minha localização') + '</button>' +
        (state.erroGeo ? '<p class="aviso" role="alert">' + esc(state.erroGeo) + '</p>' : '') +
        '<a class="link-ico" href="#/cafe">Prefiro ver o café agora</a></div></main>';
    }
    const s = state.surpresa && state.surpresa.id === c.id ? state.surpresa : iniciarSurpresa(c);
    if (s.revelado) {
      return '<main class="wrap">' + voltar + '<div class="centro surge"><span class="sobretitulo">Modo surpresa</span><h1 class="h-display">Você chegou.</h1>' +
        '<div class="revelado"><span class="sobretitulo">O café de hoje é</span><span class="nome">' + esc(c.nome) + '</span>' +
        '<span class="texto-suave">' + esc([c.endereco, c.bairro].filter(Boolean).join(' · ')) + '</span>' +
        (c.pedir ? '<span><strong>O que pedir:</strong> ' + esc(c.pedir) + '</span>' : '') + '</div>' +
        '<a class="btn btn-pri" href="#/cafe">Ver detalhes do café</a></div></main>';
    }
    const d = distanciaM(state.user, c);
    const prog = Math.min(100, Math.max(4, Math.round((1 - d / s.inicial) * 100)));
    const g = rumo(state.user, c);
    return '<main class="wrap">' + voltar + '<div class="centro"><span class="sobretitulo">Modo surpresa</span>' +
      '<svg width="220" height="220" viewBox="0 0 220 220" role="img" aria-label="Bússola apontando a direção do café"><circle cx="110" cy="110" r="104" fill="#fff" stroke="#DDD7CD" stroke-width="2"/><circle cx="110" cy="110" r="80" fill="none" stroke="#ECE6DC" stroke-width="1.5" stroke-dasharray="4 6"/><text x="110" y="30" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="600" fill="#5C564F">N</text>' +
      '<g id="seta" style="transform:rotate(' + Math.round(g) + 'deg)"><path d="M110 34 L128 116 L110 104 L92 116 Z" fill="#6B3F1D"/><path d="M110 186 L124 116 L110 124 L96 116 Z" fill="#D9D3C9"/></g><circle cx="110" cy="110" r="7" fill="#1E1B18"/></svg>' +
      '<div style="display:flex;flex-direction:column;align-items:center;gap:8px"><h1 class="h-display" id="s-min">' + minutosAPe(d) + ' min a pé</h1>' +
      '<span id="s-dir" style="font-size:17px;color:var(--cinza-escuro)">Siga rumo ao ' + direcao(g) + (c.bairro ? ', pros lados de ' + esc(c.bairro) : '') + '.</span></div>' +
      '<div class="barra" aria-hidden="true"><div id="s-barra" style="width:' + prog + '%"></div></div>' +
      '<span id="s-falta" class="texto-suave" style="font-size:13px">Faltam ' + Math.round(d) + ' m. O nome do café aparece quando você estiver a menos de 100 m.</span>' +
      '<p class="texto-suave" style="font-size:13px;margin:0">A seta aponta a direção em relação ao norte (o N da bússola).</p>' +
      '<a class="link-ico" href="#/cafe">Não aguento de curiosidade, mostra o café</a></div></main>';
  }

  function iniciarSurpresa(c) {
    pararSurpresa();
    const s = { id: c.id, inicial: Math.max(distanciaM(state.user, c), 150), revelado: false, watch: null };
    state.surpresa = s;
    if (distanciaM(state.user, c) < 100) s.revelado = true;
    if (navigator.geolocation && !s.revelado) {
      s.watch = navigator.geolocation.watchPosition((pos) => {
        state.user = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const d = distanciaM(state.user, c);
        if (d < 100) { s.revelado = true; pararSurpresa(true); render(); return; }
        const g = rumo(state.user, c);
        const set = (id, fn) => { const el = document.getElementById(id); if (el) fn(el); };
        set('s-min', (el) => { el.textContent = minutosAPe(d) + ' min a pé'; });
        set('s-dir', (el) => { el.textContent = 'Siga rumo ao ' + direcao(g) + (c.bairro ? ', pros lados de ' + c.bairro : '') + '.'; });
        set('s-falta', (el) => { el.textContent = 'Faltam ' + Math.round(d) + ' m. O nome do café aparece quando você estiver a menos de 100 m.'; });
        set('s-barra', (el) => { el.style.width = Math.min(100, Math.max(4, Math.round((1 - d / s.inicial) * 100))) + '%'; });
        set('seta', (el) => { el.style.transform = 'rotate(' + Math.round(g) + 'deg)'; });
      }, () => { /* mantém a última posição */ }, { enableHighAccuracy: true, maximumAge: 5000 });
    }
    return s;
  }
  function pararSurpresa(manterEstado) {
    if (state.surpresa && state.surpresa.watch != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(state.surpresa.watch);
      state.surpresa.watch = null;
    }
    if (!manterEstado && state.surpresa && !state.surpresa.revelado) state.surpresa = null;
  }

  function linkConvite() {
    const ids = Object.keys(visitados()).filter((id) => !id.startsWith('demo'));
    const nome = store.get('meuNome', '') || 'Alguém';
    const base = location.origin + location.pathname;
    return base + '#/grupo?de=' + encodeURIComponent(nome) + '&ids=' + b64.enc(ids.join(','));
  }

  function viewGrupo(params) {
    const de = params.get('de');
    const idsCod = params.get('ids');
    let convite = '';
    if (de && idsCod != null) {
      let ids = [];
      try { ids = b64.dec(idsCod).split(',').filter(Boolean); } catch (e) { ids = []; }
      state.convite = { nome: de, ids };
      const jaEsta = grupo().some((m) => m.nome === de);
      convite = '<div class="bloco-branco grupo-ativo" style="align-items:flex-start;flex-wrap:wrap">' + ico.pessoas +
        '<div class="txt"><strong>' + esc(de) + ' te chamou pra derivar junto</strong><small>' + ids.length + ' ' + (ids.length === 1 ? 'café conhecido' : 'cafés conhecidos') + ' na lista de ' + esc(de) + '.</small></div>' +
        (jaEsta ? '<span class="rotulo">Já está no grupo</span>' : '<button type="button" class="btn btn-pri" style="min-height:44px" data-acao="aceitar-convite">Entrar no grupo</button>') + '</div>';
    }
    const meuNome = store.get('meuNome', '');
    const meus = Object.keys(visitados()).length;
    const membros = grupo();
    const link = linkConvite();
    let contagem = '';
    if (state.cafes && state.cafesDe === chaveCidade()) {
      const ex = new Set(Object.keys(visitados()));
      membros.forEach((m) => m.ids.forEach((i) => ex.add(i)));
      const n = state.cafes.filter((c) => !ex.has(c.id)).length;
      contagem = '<div class="destaque"><span class="num">' + n + '</span><span>' + (n === 1 ? 'café' : 'cafés') + ' em ' + esc(nomeCidade()) + ' onde ninguém do grupo foi</span></div>';
    }
    return '<main class="wrap"><a class="voltar" href="' + (state.cidade ? '#/cafe' : '#/') + '">' + ico.voltar + 'Voltar</a>' +
      '<div class="duas"><section class="esq"><h1 class="h-display">Derivar<br>em grupo</h1>' +
      '<p class="texto-suave" style="margin:0;font-size:17px;max-width:420px">Chame quem vai junto. Cada pessoa manda o próprio link, e o sorteio só escolhe cafés onde ninguém do grupo foi ainda.</p>' +
      convite +
      '<form id="form-nome" class="campo"><label for="meu-nome" class="rotulo">Seu nome no grupo</label><div class="linha-campo"><input id="meu-nome" type="text" maxlength="40" placeholder="Como te chamam" value="' + esc(meuNome) + '"><button type="submit" class="btn btn-sec" style="min-height:52px">Salvar</button></div></form>' +
      '<div class="campo"><label for="convite" class="rotulo">Seu link pro grupo</label><div class="linha-campo"><input id="convite" type="text" readonly value="' + esc(link) + '"><button type="button" class="btn btn-sec" style="min-height:52px" data-acao="copiar">Copiar</button></div>' +
      '<a class="link-ico" style="color:var(--tinta)" href="https://wa.me/?text=' + encodeURIComponent('Bora derivar junto? Entra no meu grupo do Derivé: ' + link) + '" target="_blank" rel="noopener">' + ico.compartilhar + 'Mandar no WhatsApp</a>' +
      '<span id="msg-copia" class="rotulo" role="status"></span></div>' +
      '</section><section class="dir" aria-labelledby="quem"><h2 class="h2" id="quem">Quem vai</h2><div>' +
      '<div class="pessoa"><span class="av eu">' + esc((meuNome || 'V').charAt(0).toUpperCase()) + '</span><div class="txt"><strong>' + esc(meuNome || 'Você') + '</strong><small>' + meus + ' ' + (meus === 1 ? 'café conhecido' : 'cafés conhecidos') + '</small></div></div>' +
      membros.map((m, i) => '<div class="pessoa"><span class="av">' + esc(m.nome.charAt(0).toUpperCase()) + '</span><div class="txt"><strong>' + esc(m.nome) + '</strong><small>' + m.ids.length + ' ' + (m.ids.length === 1 ? 'café conhecido' : 'cafés conhecidos') + '</small></div><button type="button" class="link-ico" data-acao="remover-membro" data-i="' + i + '">Tirar</button></div>').join('') +
      (membros.length ? '' : '<p class="texto-suave" style="font-size:14px;margin:12px 0 0">Ninguém entrou ainda. Quando alguém te mandar o link, abra e toque em "Entrar no grupo".</p>') +
      '</div>' + contagem +
      '<button type="button" class="btn btn-pri" data-acao="sortear-grupo"' + (state.cidade ? '' : ' disabled') + '>' + ico.sortear + 'Sortear pro grupo</button>' +
      (state.cidade ? '' : '<span class="rotulo">Escolha uma cidade na página inicial primeiro.</span>') +
      '</section></div></main>';
  }

  function viewMeusCafes() {
    const v = visitados();
    const nome = nomeCidade();
    const doLugar = Object.entries(v).filter(([, x]) => !nome || x.cidade === nome);
    const porBairro = {};
    doLugar.forEach(([, x]) => { if (x.bairro) porBairro[x.bairro] = (porBairro[x.bairro] || 0) + 1; });
    const conhecidos = new Set(Object.keys(porBairro));
    const todos = [...new Set([...(store.get('bairros', {})[nome] || []), ...conhecidos])].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const mapa = nome
      ? '<section class="painel" aria-labelledby="mapa-t"><div class="cabeca"><div style="display:flex;flex-direction:column;gap:4px"><h2 class="h2" id="mapa-t">Sua ' + esc(nome) + '</h2><span class="texto-suave" style="font-size:14px">Cada café visitado pinta o bairro.</span></div>' +
        (todos.length ? '<div style="display:flex;align-items:baseline;gap:8px"><span class="contador" style="border:none;padding:0"><span class="num" style="font-size:44px">' + conhecidos.size + '</span></span><span style="font-size:14px">de ' + todos.length + ' bairros com cafés</span></div>' : '') + '</div>' +
        (todos.length
          ? '<div class="grade-bairros">' + todos.map((b) => conhecidos.has(b)
            ? '<div class="bairro conhecido"><b>' + esc(b) + '</b><small>' + porBairro[b] + (porBairro[b] > 1 ? ' cafés' : ' café') + '</small></div>'
            : '<div class="bairro"><b>' + esc(b) + '</b><small>a descobrir</small></div>').join('') + '</div>'
          : '<p class="texto-suave" style="margin:0">Sorteie um café pra começar a mapear a cidade.</p>') +
        '</section>'
      : '';
    const f = state.listaFiltro;
    const lista = Object.entries(v)
      .filter(([, x]) => f === 'todos' || (f === 'sim' && x.voltaria === true) || (f === 'nao' && x.voltaria === false))
      .sort((a, b) => String(b[1].data).localeCompare(String(a[1].data)));
    const selo = (x) => x.voltaria === true ? '<span class="selo-v sim">Voltaria</span>' : x.voltaria === false ? '<span class="selo-v nao">Não voltaria</span>' : '<span class="selo-v">Sem resposta</span>';
    const itens = lista.length
      ? '<div class="grade-cafes">' + lista.map(([id, x]) => '<div class="cafe-item"><div class="topo-item"><span class="nome">' + esc(x.nome) + '</span>' + selo(x) + '</div>' +
        '<span class="texto-suave" style="font-size:14px">' + esc([x.bairro, x.cidade].filter(Boolean).join(' · ')) + (x.data ? ' · fui em ' + dataBR(x.data) : '') + '</span>' +
        '<div class="linha-acoes"><button type="button" data-acao="lista-voltaria" data-id="' + esc(id) + '" data-v="sim" aria-pressed="' + (x.voltaria === true) + '">' + (x.voltaria === true ? '✓ ' : '') + 'Voltaria</button>' +
        '<button type="button" data-acao="lista-voltaria" data-id="' + esc(id) + '" data-v="nao" aria-pressed="' + (x.voltaria === false) + '">' + (x.voltaria === false ? '✓ ' : '') + 'Não voltaria</button>' +
        '<a href="' + esc(linkMapa(Object.assign({ id }, x))) + '" target="_blank" rel="noopener">Ver no mapa</a>' +
        '<button type="button" data-acao="remover" data-id="' + esc(id) + '">Remover</button></div></div>').join('') + '</div>'
      : '<p class="vazio">' + (f === 'todos' ? 'Você ainda não marcou nenhum café. Sorteie um, vá até lá e marque "Já fui".' : 'Nenhum café nessa lista ainda.') + '</p>';
    const seg = [['todos', 'Todos'], ['sim', 'Voltaria'], ['nao', 'Não voltaria']].map(([k, t]) => '<button type="button" data-acao="lista-filtro" data-v="' + k + '" aria-pressed="' + (f === k) + '">' + t + '</button>').join('');
    return '<main class="wrap pagina"><div style="display:flex;flex-direction:column;gap:10px"><h1 class="h-display">Meus cafés</h1>' +
      '<p class="texto-suave" style="margin:0;max-width:480px">Os lugares onde você já foi e os pedaços da cidade que você já conhece. O que você marcar como "não voltaria" nunca mais aparece no sorteio.</p>' +
      '<p class="texto-suave" style="margin:0;font-size:13px">Sua lista fica salva só neste navegador.</p></div>' +
      mapa +
      '<section style="display:flex;flex-direction:column;gap:16px" aria-labelledby="lista-t"><div class="cabeca" style="align-items:center"><h2 class="h2" id="lista-t">Onde você já foi</h2><div class="segmentado">' + seg + '</div></div>' + itens + '</section>' +
      '<section id="indicar" class="indicar" aria-labelledby="ind-t"><div><h2 class="h2" id="ind-t">Indique um café</h2><p class="texto-suave" style="margin:0">Conhece um café que ainda não aparece aqui? Conta pra gente.</p></div>' +
      '<form id="form-indicar"><div class="linha-campo"><div class="campo"><label for="ind-nome" class="rotulo">Nome do café</label><input id="ind-nome" name="nome" type="text" required placeholder="Ex.: Café da esquina"></div>' +
      '<div class="campo"><label for="ind-local" class="rotulo">Bairro ou endereço</label><input id="ind-local" name="local" type="text" placeholder="Ex.: Cidade Baixa"></div></div>' +
      '<button type="submit" class="btn btn-pri">Enviar indicação</button>' +
      (state.msgIndicar ? '<p class="rotulo" role="status" style="margin:0">' + esc(state.msgIndicar) + '</p>' : '') +
      '</form></section></main>';
  }

  function viewFlanar() {
    return '<main class="wrap"><article class="leitura"><div style="display:flex;flex-direction:column;gap:8px"><h1 class="h-display">Flanar</h1><span class="def">verbo · andar sem pressa e sem destino, só olhando a cidade.</span></div>' +
      '<div class="corpo">' +
      '<p>O flâneur nasceu na Paris do século XIX: alguém que caminhava pela cidade pelo simples prazer de observar as ruas, as vitrines e as pessoas. Baudelaire escreveu sobre ele, e Walter Benjamin fez dele um retrato da vida moderna.</p>' +
      '<p>No Brasil, quem trouxe isso para as nossas ruas foi João do Rio. Em <em>A alma encantadora das ruas</em>, de 1908, ele fez do flanar um jeito de conhecer o Rio de Janeiro: andar à toa, reparar em tudo e se deixar levar pela cidade.</p>' +
      '<p>Hoje a gente atravessa a cidade olhando para o celular, sempre com pressa, sempre disponível. Flanar é o contrário disso: um tempo sem objetivo, com a atenção no que está em volta. Uma pausa na ansiedade de estar sempre conectado.</p>' +
      '<p>Aqui, o café é só o pretexto. O caminho até ele faz parte do rolê.</p></div>' +
      '<div class="dicas"><span class="sobretitulo">Pra flanar</span>' +
      '<div class="dica"><b>1</b>Vá a pé, mesmo que dê pra ir de carro.</div>' +
      '<div class="dica"><b>2</b>Celular no bolso até chegar.</div>' +
      '<div class="dica"><b>3</b>Pegue uma rua que você nunca pegou.</div></div>' +
      '<a class="btn btn-pri" style="align-self:flex-start" href="' + (state.cidade ? '#/cafe' : '#/') + '">Ver o café de hoje</a></article></main>';
  }

  /* ---------- render ---------- */
  let ultimaRota = null;
  function render() {
    const { path, params } = rota();
    if (path !== '/surpresa') pararSurpresa();
    if (path !== '/cafe' && state.fase === 'sorteando') { clearInterval(state.timer); state.fase = state.atual ? 'pronto' : 'inicio'; }
    let corpo;
    switch (path) {
      case '/cafe': corpo = viewCafe(); break;
      case '/surpresa': corpo = viewSurpresa(); break;
      case '/grupo': corpo = viewGrupo(params); break;
      case '/meus-cafes': corpo = viewMeusCafes(); break;
      case '/flanar': corpo = viewFlanar(); break;
      default: corpo = viewHome();
    }
    app.innerHTML = topo(path) + corpo;
    state.animar = false;
    if (ultimaRota !== path) {
      window.scrollTo(0, 0);
      const titulos = { '/cafe': 'Café de hoje', '/surpresa': 'Modo surpresa', '/grupo': 'Derivar em grupo', '/meus-cafes': 'Meus cafés', '/flanar': 'Flanar' };
      document.title = titulos[path] ? titulos[path] + ' · Derivé' : 'Derivé · perca-se na cidade, encontre-se no café';
      ultimaRota = path;
    }
  }

  /* ---------- eventos ---------- */
  app.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-acao]');
    if (!el || el.disabled) return;
    const acao = el.dataset.acao;
    switch (acao) {
      case 'geo': usarLocalizacao('#/cafe'); break;
      case 'geo-surpresa': usarLocalizacao('#/surpresa'); break;
      case 'cidade': escolherCidadePorNome(el.dataset.nome); break;
      case 'sortear': sortear(); break;
      case 'recarregar': state.cafesDe = null; state.erro = null; carregarCafes(); break;
      case 'filtro': {
        const k = el.dataset.f;
        state.filtros[k] = !state.filtros[k];
        store.set('filtros', state.filtros);
        if (state.fase === 'vazio') state.fase = 'inicio';
        render();
        break;
      }
      case 'limpar-filtros':
        state.filtros = { naoFui: true, aberto: false, trabalhar: false, pet: false, externa: false };
        store.set('filtros', state.filtros);
        state.modoGrupo = false;
        sortear();
        break;
      case 'fui':
        if (state.atual) { marcarVisita(state.atual, el.dataset.v === 'sim'); render(); }
        break;
      case 'voltaria':
        if (state.atual) { marcarVoltaria(state.atual.id, el.dataset.v === 'sim'); render(); }
        break;
      case 'lista-filtro': state.listaFiltro = el.dataset.v; render(); break;
      case 'lista-voltaria': marcarVoltaria(el.dataset.id, el.dataset.v === 'sim'); render(); break;
      case 'remover': {
        const v = visitados();
        delete v[el.dataset.id];
        salvarVisitados(v);
        render();
        break;
      }
      case 'copiar': {
        const inp = document.getElementById('convite');
        const msg = document.getElementById('msg-copia');
        const ok = () => { if (msg) msg.textContent = 'Link copiado.'; };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(inp.value).then(ok, () => { inp.select(); });
        } else { inp.select(); }
        break;
      }
      case 'aceitar-convite':
        if (state.convite) {
          const g = grupo().filter((m) => m.nome !== state.convite.nome);
          g.push({ nome: state.convite.nome, ids: state.convite.ids });
          salvarGrupo(g);
          irPara('#/grupo');
        }
        break;
      case 'remover-membro': {
        const g = grupo();
        g.splice(Number(el.dataset.i), 1);
        salvarGrupo(g);
        render();
        break;
      }
      case 'sortear-grupo':
        if (!state.cidade) break;
        state.modoGrupo = true;
        state.fase = 'inicio';
        state.atual = null;
        if (state.cafes && state.cafesDe === chaveCidade()) { irPara('#/cafe'); sortear(); }
        else { state.sortearAoCarregar = true; irPara('#/cafe'); }
        break;
      case 'sair-grupo': state.modoGrupo = false; if (state.fase === 'vazio') state.fase = 'inicio'; render(); break;
      default: break;
    }
  });

  app.addEventListener('submit', (ev) => {
    const form = ev.target;
    if (form.id === 'form-cidade') {
      ev.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = 'Procurando…'; }
      escolherCidadePorNome(form.querySelector('#cidade').value);
    } else if (form.id === 'form-nome') {
      ev.preventDefault();
      store.set('meuNome', form.querySelector('#meu-nome').value.trim());
      render();
    } else if (form.id === 'form-indicar') {
      ev.preventDefault();
      const nome = form.querySelector('#ind-nome').value.trim();
      const local = form.querySelector('#ind-local').value.trim();
      if (!CFG.INDICAR_EMAIL) {
        state.msgIndicar = 'As indicações ainda não estão ativas. Em breve!';
        render();
        return;
      }
      const assunto = 'Indicação de café: ' + nome;
      const corpo = 'Café: ' + nome + '\nOnde: ' + local + '\nCidade: ' + nomeCidade();
      window.location.href = 'mailto:' + CFG.INDICAR_EMAIL + '?subject=' + encodeURIComponent(assunto) + '&body=' + encodeURIComponent(corpo);
      state.msgIndicar = 'Valeu! Abrimos seu e-mail com a indicação pronta.';
      render();
    }
  });

  window.addEventListener('hashchange', render);
  render();
})();
