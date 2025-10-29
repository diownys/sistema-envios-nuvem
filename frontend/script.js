// --- CONFIGURAÇÕES GERAIS ---
import { createClient } from 'https://esm.sh/@supabase/supabase-js'
const URL_ANIVERSARIANTES = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQB3DiiGSQLxI-sHfJjBne3VbH83HA6REnrbcXkCBrWuLkyZh8aaq-TjgGvZqMqJpnc7vfku4thPcOR/pub?gid=0&single=true&output=csv';
const URL_RECONHECIMENTOS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQB3DiiGSQLxI-sHfJjBne3VbH83HA6REnrbcXkCBrWuLkyZh8aaq-TjgGvZqMqJpnc7vfku4thPcOR/pub?gid=1414872186&single=true&output=csv';
const URL_NOTICIAS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQB3DiiGSQLxI-sHfJjBne3VbH83HA6REnrbcXkCBrWuLkyZh8aaq-TjgGvZqMqJpnc7vfku4thPcOR/pub?gid=645656320&single=true&output=csv';
const URL_COLETAS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQB3DiiGSQLxI-sHfJjBne3VbH83HA6REnrbcXkCBrWuLkyZh8aaq-TjgGvZqMqJpnc7vfku4thPcOR/pub?gid=670112626&single=true&output=csv'; // <<<--- COLE AQUI O NOVO LINK DA PLANILHA DE COLETAS
const API_URL_STATS = 'http://100.97.126.124:8000/api/dashboard-stats';
const SUPABASE_URL = 'https://nfsuisftzddegihyhoha.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mc3Vpc2Z0emRkZWdpaHlob2hhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMTcwMDcsImV4cCI6MjA3NDU5MzAwN30.tM_9JQo6ejzOBWKQ9XxT54f8NuM6jSoHomF9c_IfEJI';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let mapDataCache = null;
let progressChart = null;
let internasChart = null;
let externasChart = null;
let coletasSchedule = []; // Guarda a agenda de coletas para não buscar a cada segundo

// --- FUNÇÕES DE BUSCA DE DADOS ---

async function updateApiData() {
    try {
        // Define 'hoje' (data de início) e 'amanha' (data de fim) para o filtro
        const agora = new Date();
        const hoje = agora.toISOString().slice(0, 10); // Formato 'YYYY-MM-DD'
        const amanhaDate = new Date(agora);
        amanhaDate.setDate(agora.getDate() + 1);
        const amanha = amanhaDate.toISOString().slice(0, 10); // Dia seguinte 'YYYY-MM-DD'

        console.log(`🔍 Buscando envios criados entre ${hoje}T00:00:00Z e ${amanha}T00:00:00Z (UTC)`);

        // Busca no Supabase APENAS os envios onde 'created_at' está no dia de HOJE (considerando UTC)
        const { data: enviosHoje, error } = await supabase
            .from('envios')
            .select('*')
            .gte('created_at', `${hoje}T00:00:00.000Z`) // Maior ou igual ao início de hoje (UTC)
            .lt('created_at', `${amanha}T00:00:00.000Z`); // Menor que o início de amanhã (UTC)

        if (error) throw error;

        console.log('🔍 Total de registros retornados do Supabase para HOJE:', enviosHoje?.length);
        if (enviosHoje?.length > 0) {
           console.log('Primeiro registro de HOJE detalhado:', JSON.stringify(enviosHoje[0], null, 2));
        } else {
           console.log('ℹ️ Nenhum registro encontrado com data de criação de HOJE.');
        }

        // 🔹 Separando concluidos e pendentes DO DIA (a partir dos dados filtrados)
        const concluidosHoje = (enviosHoje || []).filter(e => String(e?.status || '').toLowerCase() === 'confirmado');
        const totalConcluidosHoje = concluidosHoje.length;

        const pendentesHoje = (enviosHoje || []).filter(e => String(e?.status || '').toLowerCase() !== 'confirmado');
        const totalPendentesHoje = pendentesHoje.length;

        // 🔹 Valor expedido apenas dos concluidos HOJE
        const valorExpedido = concluidosHoje.reduce((acc, e) => acc + (Number(e.valor_total || e.valor_venda) || 0), 0);

        // 🔹 Refrigerados pendentes HOJE
        const alertaRefrigerados = pendentesHoje.filter(e => e.requer_refrigeracao).length;

        // 🔹 Pendentes HOJE por janela (ordenado para consistência)
        const janelas = [...new Set(pendentesHoje.map(e => e.janela_coleta).filter(Boolean))].sort();
        const pendentesPorJanela = janelas.map(j => ({
            janela_coleta: j,
            total: pendentesHoje.filter(e => e.janela_coleta === j).length
        }));

        // 🔹 Envios por UF (somente concluidos HOJE para pintar o mapa)
        const enviosPorUF = {};
        for (const e of concluidosHoje) {
            const uf = (e.uf || e.estado || '').toString().trim().toUpperCase().slice(0, 2);
            if (!uf) continue;
            enviosPorUF[uf] = (enviosPorUF[uf] || 0) + 1;
        }

        // === Atualiza o dashboard ===
        const totalEnviosEl = document.getElementById('total-envios');
        // Mostra o total de CONCLUÍDOS de hoje
        if (totalEnviosEl) totalEnviosEl.textContent = String(totalConcluidosHoje);

        const valorTotalEl = document.getElementById('valor-total');
        if (valorTotalEl) valorTotalEl.textContent = valorExpedido.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

        // Atualiza barra de progresso: concluidos HOJE vs pendentes HOJE
        updateProgressChart(totalConcluidosHoje, totalPendentesHoje);

        // Atualiza alertas refrigerados (pendentes HOJE)
        const alertEl = document.getElementById('refrigerated-alert');
        if (alertEl) {
            alertEl.textContent = String(alertaRefrigerados);
            if (alertEl.parentElement) alertEl.parentElement.style.backgroundColor = alertaRefrigerados > 0 ? '#d63031' : '#273c75';
        }

        // Atualiza janelas pendentes (pendentes HOJE)
        updateJanelaBlocks(pendentesPorJanela);

        // Atualiza mapa com envios concluidos HOJE
        updateMap(enviosPorUF);

        // Logs para depuração
        console.table(enviosHoje); // Mostra apenas os dados de hoje no console
        console.log('Pendentes HOJE por janela:', pendentesPorJanela);
        console.log('Envios concluidos HOJE por UF:', enviosPorUF);

        // Mensagem se não houver concluídos hoje
        if (totalConcluidosHoje === 0) {
            console.log("ℹ️ Nenhum envio CONCLUÍDO encontrado com data de criação de HOJE.");
        }

    } catch (error) {
        console.error("Erro ao buscar ou processar dados do Supabase:", error);
        // Resetar a UI em caso de erro para indicar o problema
        const totalEnviosEl = document.getElementById('total-envios');
        if (totalEnviosEl) totalEnviosEl.textContent = 'Erro';
        const valorTotalEl = document.getElementById('valor-total');
        if (valorTotalEl) valorTotalEl.textContent = 'Erro';
        updateProgressChart(0, 0); // Limpa o gráfico de progresso
        const alertEl = document.getElementById('refrigerated-alert');
        if (alertEl) alertEl.textContent = '-';
        updateJanelaBlocks([]); // Limpa as janelas
        updateMap({}); // Limpa o mapa
        const mapContainer = document.getElementById('map-container');
         if (mapContainer) mapContainer.innerHTML =
             `<p style="color:#ff6b6b;text-align:center;">Erro ao carregar dados do mapa</p>`;
         const janelaBlocks = document.getElementById('janela-stats-blocks');
         if (janelaBlocks) janelaBlocks.innerHTML =
             `<p style="color:#ff6b6b;text-align:center;">Erro ao carregar janelas</p>`;
    }
}


async function fetchAndParseCsv(url) {
    const response = await fetch(url + '&cachebust=' + new Date().getTime());
    if (!response.ok) throw new Error(`Falha ao buscar CSV: ${url}`);
    const csvText = await response.text();
    const lines = csvText.trim().replace(/\r/g, "").split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
        const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
        let obj = {};
        headers.forEach((h, i) => { if (h && values[i]) obj[h] = values[i].trim().replace(/^"|"$/g, ''); });
        return obj;
    });
}

// ======= COLETAS / CONTAGEM REGRESSIVA (VERSÃO DINÂMICA) =======
async function fetchColetasSchedule() {
    try {
        if (!URL_COLETAS || URL_COLETAS.includes('SEU_LINK')) {
            throw new Error("URL_COLETAS não foi definida no script.js.");
        }
        coletasSchedule = await fetchAndParseCsv(URL_COLETAS);
        updateCountdowns(); // Atualiza a exibição imediatamente após buscar os dados
    } catch (error) {
        console.error('Erro ao carregar agendamento de coletas:', error);
        const container = document.getElementById('countdown-container');
        if(container) container.innerHTML = `<p style="color: #ff6b6b; text-align:center;">${error.message}</p>`;
    }
}

// ======= COLETAS / CONTAGEM REGRESSIVA (COM LÓGICA DE ORDENAÇÃO) =======
async function updateCountdowns() {
    try {
        // A busca dos dados continua a mesma
        if (!URL_COLETAS || URL_COLETAS.includes('COLE_AQUI')) {
            throw new Error("URL_COLETAS não foi definida no script.js.");
        }
        
        // Usamos uma verificação para não buscar a planilha a cada segundo
        if (coletasSchedule.length === 0) {
            coletasSchedule = await fetchAndParseCsv(URL_COLETAS);
        }

        const now = new Date();
        const todayIndex = now.getDay();
        const container = document.getElementById('countdown-container');
        if (!container) return;

        const todaySchedule = coletasSchedule.filter(item => {
            if (!item.days) return false;
            const days = item.days.split(',').map(d => parseInt(d.trim(), 10));
            return days.includes(todayIndex);
        });

        if (todaySchedule.length === 0) {
            container.innerHTML = '<p style="text-align:center; padding-top: 10px;">Nenhuma coleta para hoje.</p>';
            return;
        }

        // --- A MÁGICA ACONTECE AQUI ---
        // 1. Separa as coletas em dois grupos: pendentes e finalizadas
        const pendentes = [];
        const finalizadas = [];

        todaySchedule.forEach(item => {
            const [hours, minutes] = item.time.split(':');
            const targetTime = new Date();
            targetTime.setHours(Number(hours), Number(minutes), 0, 0);
            
            if (targetTime > now) {
                pendentes.push({ ...item, targetTime, diff: targetTime - now });
            } else {
                finalizadas.push({ ...item, targetTime, diff: targetTime - now });
            }
        });

        // 2. Ordena os grupos: pendentes por tempo crescente, finalizadas pela mais recente primeiro
        pendentes.sort((a, b) => a.targetTime - b.targetTime);
        finalizadas.sort((a, b) => b.targetTime - a.targetTime);

        // 3. Junta os dois grupos, com as pendentes sempre no topo
        const processedSchedule = [...pendentes, ...finalizadas];
        
        container.innerHTML = ''; // Limpa o container para redesenhar

        // 4. Renderiza a lista na nova ordem
        processedSchedule.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'countdown-item';
            let timerHTML = '';

            if (item.diff > 0) { // Se for pendente
                const h = Math.floor(item.diff / 3600000);
                const m = Math.floor((item.diff % 3600000) / 60000);
                const s = Math.floor((item.diff % 60000) / 1000);
                timerHTML = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                if (item.diff < 1800000) { itemDiv.classList.add('imminent'); }
            } else { // Se já finalizou
                itemDiv.classList.add('finished');
                timerHTML = 'Coletado!';
            }
            
            itemDiv.innerHTML = `<div class="info"><span class="carrier">${item.carrier}</span><span class="time">Limite: ${item.time}</span></div><div class="timer">${timerHTML}</div>`;
            container.appendChild(itemDiv);
        });

    } catch (error) {
        console.error('Erro ao carregar agendamento de coletas:', error);
        const container = document.getElementById('countdown-container');
        if(container) container.innerHTML = `<p style="color: #ff6b6b; text-align:center;">${error.message}</p>`;
    }
}

// ... (O restante das suas funções continua aqui, sem alteração) ...
// (getWeather, getOccurrences, getBirthdays, getRecognitions, getNews, updateClock, etc.)
function getWeather() {
    const apiKey = 'ba35ed5adae6727f6e86c616bc544053';
    const city = 'Campo Largo';
    fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city},BR&appid=${apiKey}&lang=pt_br&units=metric`)
    .then(response => (response.ok ? response.json() : Promise.reject('Erro de Clima')))
    .then(data => {
        const cityNameEl = document.getElementById('city-name');
        if (cityNameEl) cityNameEl.textContent = data.name;
        const temperatureEl = document.getElementById('temperature');
        if (temperatureEl) temperatureEl.textContent = `${Math.round(data.main.temp)}°C`;
        const descriptionEl = document.getElementById('description');
        if (descriptionEl) descriptionEl.textContent = data.weather[0].description;
        const weatherIcon = document.getElementById('weather-icon');
        if (weatherIcon) weatherIcon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
    }).catch(error => console.error('Erro ao buscar o clima:', error));
}
function createOrUpdateBarChart(chart, canvasId, data, label, color, hoverColor) {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return null;
    const labels = data.map(item => item.title);
    const values = data.map(item => item.count);
    if (chart) {
        chart.data.labels = labels;
        chart.data.datasets[0].data = values;
        chart.update();
        return chart;
    }
    return new Chart(ctx, {
        type: 'bar', data: { labels: labels, datasets: [{ label: label, data: values, backgroundColor: color, hoverBackgroundColor: hoverColor, borderWidth: 1, borderRadius: 4 }] },
        options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            scales: { x: { ticks: { color: '#A0A0A0' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } }, y: { ticks: { color: '#E0E0E0', font: { size: 10 } }, grid: { display: false } } },
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.raw}` } } }
        }
    });
}
function getOccurrences() {
    fetch('https://atlas-sa-ocorrencias.netlify.app/.netlify/functions/get-top-occurrences')
    .then(r => r.json()).then(data => {
        if (data.internas && data.internas.length) {
            internasChart = createOrUpdateBarChart(internasChart, 'internas-chart', data.internas.slice(0, 3), 'Ocorrências Internas', 'rgba(240, 196, 76, 0.7)', '#f0c44c');
        }
        if (data.externas && data.externas.length) {
            externasChart = createOrUpdateBarChart(externasChart, 'externas-chart', data.externas.slice(0, 3), 'Ocorrências Externas', 'rgba(76, 175, 80, 0.7)', '#4caf50');
        }
    }).catch(console.error);
}
async function getBirthdays() {
    try {
        const allBirthdays = await fetchAndParseCsv(URL_ANIVERSARIANTES);
        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        const currentDay = today.getDate();
        const monthBirthdays = allBirthdays.filter(p => Number(p.month) === currentMonth).sort((a, b) => Number(a.day) - Number(b.day));
        const list = document.getElementById('birthday-list');
        if (!list) return;
        list.innerHTML = '<li>Nenhum aniversariante no mês.</li>';
        if (monthBirthdays.length > 0) {
            list.innerHTML = '';
            monthBirthdays.forEach(p => {
                const item = document.createElement('li');
                if (Number(p.day) === currentDay) item.classList.add('today-birthday');
                item.innerHTML = `<span class="birthday-day">${p.day}</span><span>${p.name}</span>`;
                list.appendChild(item);
            });
        }
    } catch (error) { console.error('Erro ao carregar aniversariantes:', error); }
}
async function getRecognitions() {
    try {
        const data = await fetchAndParseCsv(URL_RECONHECIMENTOS);
        const list = document.getElementById('recognition-list');
        if (!list) return;
        list.innerHTML = '';
        if (!data || data.length === 0 || !data[0].recognized) {
            list.innerHTML = '<p>Nenhum reconhecimento no mural.</p>';
        } else {
            data.forEach(item => {
                list.innerHTML += `<div class="recognition-item"><div class="header"><span>${item.author}</span> reconhece: <span>${item.recognized}</span></div><p class="message">"${item.message}"</p></div>`;
            });
        }
    } catch (error) { console.error('Erro ao carregar reconhecimentos:', error); }
}
async function getNews() {
    try {
        const data = await fetchAndParseCsv(URL_NOTICIAS);
        if (data && data.length > 0 && data[0].message) {
            const newsString = data.map(item => item.message).filter(msg => msg).join(' &nbsp; • &nbsp; ');
            const el = document.getElementById('news-content');
            if (el) el.innerHTML = newsString;
        }
    } catch (error) { console.error('Erro ao carregar notícias:', error); }
}
function updateClock() {
    const now = new Date();
    const clockSpan = document.getElementById('clock');
    const dateEl = document.getElementById('date');
    if (clockSpan) clockSpan.textContent = now.toLocaleTimeString('pt-BR');
    if (dateEl) dateEl.textContent = now.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
function updateJanelaBlocks(janelas) {
    const container = document.getElementById('janela-stats-blocks');
    if (!container) return;
    container.innerHTML = ''; 
    if (!janelas || janelas.length === 0) {
        container.innerHTML = '<p class="no-data-message">Nenhuma coleta pendente.</p>';
        return;
    }
    janelas.sort((a, b) => a.janela_coleta.localeCompare(b.janela_coleta));
    const maxPendentes = Math.max(...janelas.map(item => item.total), 0);
    janelas.forEach(item => {
        let fontSize = 1.4;
        if (maxPendentes > 0) { fontSize = 1.2 + ((item.total / maxPendentes) * 1.8); }
        container.innerHTML += `<div class="janela-block"><div class="janela-block-name">${item.janela_coleta}</div><div class="janela-block-value" style="font-size: ${fontSize.toFixed(1)}em;">${item.total}</div></div>`;
    });
}

/**
 * Agora a função recebe (concluidos, pendentes)
 * Mantive o gráfico exatamente como estava (dados: [concluidos, pendentes])
 */
function updateProgressChart(concluidos, pendentes) {
    const ctx = document.getElementById('progress-chart')?.getContext('2d');
    if (!ctx) return;
    const total = (Number(concluidos) || 0) + (Number(pendentes) || 0);
    const percentual = total > 0 ? Math.round((Number(concluidos) / total) * 100) : 0;
    const progressTextEl = document.getElementById('progress-text');
    if (progressTextEl) progressTextEl.innerHTML = `<div id="progress-percent">${percentual}%</div><div id="progress-details">${concluidos} de ${total}</div>`;
    if (progressChart) {
        progressChart.data.datasets[0].data = [concluidos, pendentes];
        progressChart.update();
    } else {
        progressChart = new Chart(ctx, {
            type: 'doughnut',
            data: { datasets: [{ data: [concluidos, pendentes], backgroundColor: ['#f0c44c', '#444'], borderColor: '#1E1E1E', borderWidth: 5, cutout: '70%' }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } } }
        });
    }
}

async function updateMap(destinos) {
    try {
        if (!mapDataCache) {
            const mapResponse = await fetch('brazil-geojson.json');
            if (!mapResponse.ok) throw new Error('Falha ao carregar brazil-geojson.json');
            mapDataCache = await mapResponse.json();
        }
        const states = mapDataCache.features;
        const svg = d3.select('#brazil-map-svg');
        if (svg.empty()) return;
        svg.selectAll("*").remove();
        const container = document.getElementById('map-container');
        const width = container.clientWidth;
        const height = container.clientHeight;
        svg.attr("viewBox", `0 0 ${width} ${height > 0 ? height : width * 0.9}`);
        const projection = d3.geoMercator().fitSize([width, height], mapDataCache);
        const path = d3.geoPath().projection(projection);
        const maxEnvios = Math.max(...Object.values(destinos), 0);
        const getColor = (uf) => {
            const value = destinos[uf] || 0;
            if (value === 0) return '#333';
            if (value > 50) return '#f0c44c';
            if (value > 20) return '#A2946A';
            return '#706b5a';
        };
        svg.selectAll("path.state").data(states).enter().append("path").attr("d", path).attr("class", "state").attr("fill", d => getColor(d.properties.sigla));
        svg.selectAll("text.state-label").data(states).enter().append("text").attr("class", "state-label").attr("transform", d => `translate(${path.centroid(d)})`).text(d => {
            const sigla = d.properties.sigla;
            const valor = destinos[sigla];
            return valor ? `${sigla} (${valor})` : '';
        });
    } catch(e) {
        console.error("Erro ao renderizar o mapa:", e);
        const mapContainer = document.getElementById('map-container');
        if (mapContainer) mapContainer.innerHTML = `<p style="color: #ff6b6b; text-align:center;">Erro: ${e.message}</p>`;
    }
}


// ======= INICIALIZAÇÃO E ATUALIZAÇÕES CONTÍNUAS =======
function startDashboard() {
    updateApiData();
    getWeather();
    getOccurrences();
    getBirthdays();
    getRecognitions();
    getNews();
    fetchColetasSchedule(); // Busca os dados da planilha de coletas
    updateClock();
}

function setupIntervals() {
    setInterval(updateClock, 1000); // Atualiza relógio
    setInterval(updateCountdowns, 1000); // ATUALIZA A CONTAGEM, mas não busca os dados
    setInterval(startDashboard, 300000); // Roda a função principal de recarga de dados a cada 5 minutos
}

window.addEventListener('load', () => {
    startDashboard();
    setupIntervals();
});


/* ============================
   MOTION KIT – JS v2 (seguro)
   ============================ */
(function () {
  // Alvos para count-up (apenas exibição)
  const TARGETS = [
    { sel: '#total-envios',       mode: 'int',      min: 0 },
    { sel: '#refrigerated-alert', mode: 'int',      min: 0 },
    { sel: '#valor-total',        mode: 'currency', min: 0 },
  ];

  window.addEventListener('load', () => {
    // Dispara animações de entrada CSS
    requestAnimationFrame(() => document.body.classList.add('motion-ready'));

    // Chart.js: animações mais suaves (sem alterar seus gráficos)
    if (window.Chart && Chart.defaults && Chart.defaults.animation) {
      Chart.defaults.animation.duration = 700;
      Chart.defaults.animation.easing = 'easeOutQuart';
    }

    // Inicia count-up seguro
    TARGETS.forEach(t => safeCountUp(t.sel, t.mode, t.min));
  });

  function safeCountUp(selector, mode = 'int', min = -Infinity) {
    const el = document.querySelector(selector);
    if (!el) return;

    let last = parseValue(el.textContent, mode);
    if (!Number.isFinite(last)) last = 0;

    el._animating = false;
    el._pendingNext = null;
    el._raf = null;

    const obs = new MutationObserver(() => {
      // Se a mudança foi causada pela própria animação, só registra o "próximo"
      if (el._animating) {
        const v = parseValue(el.textContent, mode);
        if (Number.isFinite(v)) el._pendingNext = v;
        return;
      }

      const nextRaw = parseValue(el.textContent, mode);
      if (!Number.isFinite(nextRaw)) return;

      // Evita negativos de exibição onde não faz sentido
      const next = Math.max(min, nextRaw);
      const from = Math.max(min, last);

      if (next === from) { last = next; return; }

      animateNumber(el, from, next, mode, () => {
        last = next;
        // Se a API atualizou durante a animação, roda a próxima
        if (Number.isFinite(el._pendingNext)) {
          const p = Math.max(min, el._pendingNext);
          el._pendingNext = null;
          if (p !== last) animateNumber(el, last, p, mode, () => { last = p; });
        }
      });
    });

    obs.observe(el, { childList: true, characterData: true, subtree: true });
  }

  function animateNumber(el, from, to, mode, onDone, duration = (mode === 'currency' ? 1200 : 800)) {
    el._animating = true;
    if (el._raf) cancelAnimationFrame(el._raf);
    const start = performance.now();

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const current = from + (to - from) * eased;

      el.textContent = formatValue(current, mode);

      if (t < 1) {
        el._raf = requestAnimationFrame(tick);
      } else {
        el.textContent = formatValue(to, mode);
        el._raf = null;
        el._animating = false;
        el.classList.add('countup-flash');
        setTimeout(() => el.classList.remove('countup-flash'), 500);
        if (onDone) onDone();
      }
    };

    el._raf = requestAnimationFrame(tick);
  }

  function parseValue(text, mode) {
    if (!text) return NaN;
    const raw = String(text).trim();

    if (mode === 'currency') {
      const normalized = raw
        .replace(/[^\d,.\-]/g, '') // mantém dígitos, vírgula, ponto e sinal
        .replace(/\./g, '')        // remove milhares
        .replace(',', '.');        // vírgula -> ponto decimal
      const n = Number.parseFloat(normalized);
      return Number.isFinite(n) ? n : NaN;
    }

    // int
    const digits = raw.replace(/[^\d\-]/g, '');
    const n = digits ? Number.parseInt(digits, 10) : NaN;
    return Number.isFinite(n) ? n : NaN;
  }

  function formatValue(value, mode) {
    if (mode === 'currency') {
      return Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    }
    return Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  }
})();
function startScrolling(widgetSelector) {
    const widget = document.querySelector(widgetSelector);
    if (!widget) return;

    const ul = widget.querySelector('ul');
    if (!ul) return;

    // Duplicar os itens para criar loop infinito
    ul.innerHTML += ul.innerHTML;

    // Ajustar velocidade com CSS
    ul.style.animation = 'scrollVertical 12s linear infinite';
}

// Chamar após popular os dados
startScrolling('#birthday-list');
startScrolling('#recognition-list');

