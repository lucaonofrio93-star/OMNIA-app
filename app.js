/**
 * OMNIA - Web Standard Version
 * Applicazione per la gestione e visualizzazione di pillole di conoscenza
 * Con integrazione Gemini API e Knowledge Map interattiva
 */

// ============================================
// CONFIGURAZIONE E COSTANTI
// ============================================

const CONFIG = {
    storageKeys: {
        pills: 'omnia_pills',
        config: 'omnia_config',
        lastSync: 'omnia_last_sync',
    },
    categories: {
        humanity: {
            title: 'Umanità',
            icon: '🧠',
            description: 'Filosofia, psicologia e sviluppo personale',
            color: '#4A90E2',
        },
        society: {
            title: 'Società',
            icon: '👥',
            description: 'Organizzazioni, comunicazione e leadership',
            color: '#2ECC71',
        },
        world: {
            title: 'Mondo',
            icon: '🌍',
            description: 'Ambiente, geopolitica e sostenibilità',
            color: '#E67E22',
        },
    },
};

// ============================================
// STATE MANAGEMENT
// ============================================

const appState = {
    currentPage: 'home',
    pills: [],
    config: {
        language: 'it',
        darkMode: true,
        ttsSpeed: 1.0,
        geminiApiKey: null,
    },
    selectedPill: null,
};

// ============================================
// LOCAL STORAGE UTILITIES
// ============================================

const Storage = {
    savePills(pills) {
        localStorage.setItem(CONFIG.storageKeys.pills, JSON.stringify(pills));
    },

    getPills() {
        const data = localStorage.getItem(CONFIG.storageKeys.pills);
        return data ? JSON.parse(data) : [];
    },

    saveConfig(config) {
        localStorage.setItem(CONFIG.storageKeys.config, JSON.stringify(config));
    },

    getConfig() {
        const data = localStorage.getItem(CONFIG.storageKeys.config);
        return data ? JSON.parse(data) : appState.config;
    },

    clearAll() {
        localStorage.removeItem(CONFIG.storageKeys.pills);
        localStorage.removeItem(CONFIG.storageKeys.config);
        localStorage.removeItem(CONFIG.storageKeys.lastSync);
    },
};

// ============================================
// GEMINI API CLIENT
// ============================================

const GeminiClient = {
    async generateContent(category, count = 3, apiKey) {
        if (!apiKey) {
            throw new Error('API Key di Gemini non configurata');
        }

        const systemPrompt = `Tu sei un esperto creatore di contenuti educativi. Il tuo compito è generare "pillole di conoscenza" - articoli brevi, ben strutturati e informativi su argomenti specifici.

Ogni pillola deve:
1. Essere scritta in italiano
2. Avere un titolo accattivante e descrittivo
3. Contenere 2-3 paragrafi di contenuto ben articolato
4. Essere facilmente comprensibile per un pubblico generale
5. Includere concetti chiave e spiegazioni pratiche
6. Durare circa 3-5 minuti di lettura (300-500 parole)

Rispondi SEMPRE in formato JSON valido con questa struttura:
{
  "pills": [
    {
      "title": "Titolo della pillola",
      "content": "Contenuto completo della pillola...",
      "tags": ["tag1", "tag2", "tag3"]
    }
  ]
}`;

        const categoryInfo = {
            humanity: {
                name: 'Umanità',
                topics: ['filosofia', 'psicologia', 'sviluppo personale', 'benessere mentale', 'emozioni', 'creatività'],
            },
            society: {
                name: 'Società',
                topics: ['organizzazioni', 'comunicazione', 'leadership', 'dinamiche sociali', 'etica aziendale', 'sostenibilità'],
            },
            world: {
                name: 'Mondo',
                topics: ['clima e ambiente', 'geopolitica', 'scienza', 'tecnologia', 'biodiversità', 'sostenibilità globale'],
            },
        };

        const info = categoryInfo[category];
        const randomTopics = info.topics.slice(0, 3).join(', ');

        const prompt = `Genera ${count} pillola${count > 1 ? 'e' : ''} di conoscenza sulla categoria "${info.name}".

Argomenti suggeriti (scegli liberamente): ${randomTopics}

Ricorda: ogni pillola deve essere unica, interessante e ben strutturata. Usa tag rilevanti per ogni pillola.`;

        try {
            const response = await fetch(
                'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-goog-api-key': apiKey,
                    },
                    body: JSON.stringify({
                        system_instruction: {
                            parts: {
                                text: systemPrompt,
                            },
                        },
                        contents: {
                            parts: {
                                text: prompt,
                            },
                        },
                        generationConfig: {
                            temperature: 0.7,
                            maxOutputTokens: 2000,
                        },
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Errore Gemini API: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!textContent) {
                throw new Error('Risposta vuota da Gemini API');
            }

            const jsonMatch = textContent.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Impossibile estrarre JSON dalla risposta di Gemini');
            }

            const parsedResponse = JSON.parse(jsonMatch[0]);
            const pills = parsedResponse.pills.map((pill, index) => ({
                id: `pill-gemini-${category}-${Date.now()}-${index}`,
                title: pill.title,
                content: pill.content,
                category,
                tags: pill.tags.map((label, tagIndex) => ({
                    id: `tag-${category}-${tagIndex}`,
                    label: label.toLowerCase().replace(/\s+/g, '-'),
                    category,
                })),
                createdAt: Date.now(),
                duration: Math.ceil((pill.content.split(/\s+/).length / 150) * 60),
                excerpt: pill.content.substring(0, 100) + '...',
                source: 'gemini',
            }));

            return pills;
        } catch (error) {
            console.error('Errore nella chiamata a Gemini API:', error);
            throw error;
        }
    },
};

// ============================================
// CONTENT GENERATOR (INTERNAL + GEMINI)
// ============================================

const ContentGenerator = {
    internalTemplates: {
        humanity: [
            {
                title: 'La consapevolezza di sé: fondamento dello sviluppo personale',
                content: `La consapevolezza di sé è la capacità di riconoscere e comprendere i propri pensieri, emozioni e comportamenti. È il primo passo verso il cambiamento personale e la crescita emotiva.

Secondo la psicologia moderna, la consapevolezza di sé si sviluppa attraverso l'autoriflessione e l'osservazione attenta dei nostri pattern mentali. Quando siamo consapevoli di noi stessi, possiamo identificare i nostri punti di forza, le nostre debolezze e le aree in cui vogliamo crescere.

La pratica della meditazione, il journaling e la terapia sono strumenti efficaci per sviluppare questa capacità. Una maggiore consapevolezza di sé porta a decisioni più consapevoli, relazioni più autentiche e una vita più significativa.`,
                tags: ['psicologia', 'consapevolezza', 'sviluppo-personale'],
                duration: 300,
            },
        ],
        society: [
            {
                title: 'La comunicazione non violenta: costruire relazioni autentiche',
                content: `La comunicazione non violenta (CNV) è un approccio sviluppato da Marshall Rosenberg che mira a risolvere i conflitti attraverso l'empatia e la comprensione reciproca.

I quattro pilastri della CNV sono: osservazione (descrivere i fatti senza giudizio), sentimenti (esprimere come ci sentiamo), bisogni (identificare i nostri bisogni sottostanti) e richieste (formulare richieste chiare e realizzabili).

Applicando la CNV nelle nostre relazioni personali e professionali, possiamo ridurre i conflitti, aumentare la comprensione e costruire connessioni più profonde e autentiche.`,
                tags: ['comunicazione', 'relazioni', 'conflitti'],
                duration: 300,
            },
        ],
        world: [
            {
                title: 'Il cambiamento climatico: cause, effetti e soluzioni',
                content: `Il cambiamento climatico è uno dei più grandi sfide del nostro tempo. È causato principalmente dall'aumento dei gas serra nell'atmosfera, in particolare l'anidride carbonica, dovuto alle attività umane.

Gli effetti del cambiamento climatico sono già evidenti: aumento delle temperature globali, scioglimento dei ghiacciai, aumento del livello del mare, eventi meteorologici estremi e perdita di biodiversità.

Tuttavia, ci sono soluzioni disponibili. La transizione verso le energie rinnovabili, l'efficienza energetica, la protezione delle foreste e l'agricoltura sostenibile possono ridurre significativamente le emissioni di gas serra.`,
                tags: ['clima', 'ambiente', 'sostenibilità'],
                duration: 330,
            },
        ],
    },

    async generateInternal(category, count = 3) {
        const templates = this.internalTemplates[category] || [];
        const pills = templates.slice(0, count).map((template, index) => ({
            id: `pill-internal-${category}-${Date.now()}-${index}`,
            title: template.title,
            content: template.content,
            category,
            tags: template.tags.map((label, tagIndex) => ({
                id: `tag-${category}-${tagIndex}`,
                label,
                category,
            })),
            createdAt: Date.now(),
            duration: template.duration,
            excerpt: template.content.substring(0, 100) + '...',
            source: 'internal',
        }));

        return pills;
    },

    async generate(category, count = 3, useGemini = false, apiKey = null) {
        try {
            if (useGemini && apiKey) {
                return await GeminiClient.generateContent(category, count, apiKey);
            } else {
                return await this.generateInternal(category, count);
            }
        } catch (error) {
            console.error('Errore nella generazione di contenuto:', error);
            // Fallback al motore interno
            return await this.generateInternal(category, count);
        }
    },
};

// ============================================
// GALAXY VISUALIZATION
// ============================================

const Galaxy = {
    canvas: null,
    ctx: null,
    nodes: [],
    connections: [],

    init(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    },

    resizeCanvas() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = 600;
    },

    createNodes(pills) {
        this.nodes = pills.map((pill, index) => ({
            pillId: pill.id,
            title: pill.title,
            category: pill.category,
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            isRead: false,
        }));

        this.createConnections(pills);
    },

    createConnections(pills) {
        this.connections = [];
        const tagMap = new Map();

        pills.forEach((pill, index) => {
            pill.tags.forEach(tag => {
                if (!tagMap.has(tag.label)) {
                    tagMap.set(tag.label, []);
                }
                tagMap.get(tag.label).push(index);
            });
        });

        tagMap.forEach(indices => {
            for (let i = 0; i < indices.length; i++) {
                for (let j = i + 1; j < indices.length; j++) {
                    this.connections.push({
                        pillA: indices[i],
                        pillB: indices[j],
                        strength: 0.5,
                    });
                }
            }
        });
    },

    getNodeColor(category) {
        return CONFIG.categories[category]?.color || '#999999';
    },

    draw() {
        this.ctx.fillStyle = '#050505';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Disegna connessioni
        this.connections.forEach(conn => {
            const nodeA = this.nodes[conn.pillA];
            const nodeB = this.nodes[conn.pillB];

            this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 + conn.strength * 0.2})`;
            this.ctx.lineWidth = 1 + conn.strength * 1.5;
            this.ctx.beginPath();
            this.ctx.moveTo(nodeA.x, nodeA.y);
            this.ctx.lineTo(nodeB.x, nodeB.y);
            this.ctx.stroke();
        });

        // Disegna nodi
        this.nodes.forEach(node => {
            const color = this.getNodeColor(node.category);
            const radius = 6;

            // Glow effect
            this.ctx.fillStyle = `${color}33`;
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, radius * 2, 0, Math.PI * 2);
            this.ctx.fill();

            // Nodo principale
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // Aggiorna posizioni (semplice fisica)
        this.nodes.forEach(node => {
            node.x += node.vx;
            node.y += node.vy;

            // Rimbalzo ai bordi
            if (node.x < 0 || node.x > this.canvas.width) node.vx *= -1;
            if (node.y < 0 || node.y > this.canvas.height) node.vy *= -1;

            node.x = Math.max(0, Math.min(this.canvas.width, node.x));
            node.y = Math.max(0, Math.min(this.canvas.height, node.y));
        });

        requestAnimationFrame(() => this.draw());
    },

    handleCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        for (const node of this.nodes) {
            const distance = Math.hypot(node.x - x, node.y - y);
            if (distance < 10) {
                const pill = appState.pills.find(p => p.id === node.pillId);
                if (pill) {
                    UI.showPillDetail(pill);
                }
                break;
            }
        }
    },
};

// ============================================
// UI MANAGEMENT
// ============================================

const UI = {
    init() {
        this.setupEventListeners();
        this.loadInitialData();
        this.render();
    },

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = e.target.dataset.page;
                this.navigateTo(page);
            });
        });

        // Home page
        document.getElementById('refreshBtn').addEventListener('click', () => this.refreshPills());

        // Settings
        document.getElementById('toggleGeminiInput').addEventListener('click', () => {
            const container = document.getElementById('geminiInputContainer');
            container.style.display = container.style.display === 'none' ? 'block' : 'none';
        });

        document.getElementById('saveGeminiKey').addEventListener('click', () => this.saveGeminiKey());
        document.getElementById('cancelGeminiKey').addEventListener('click', () => {
            document.getElementById('geminiInputContainer').style.display = 'none';
        });

        document.getElementById('removeGeminiKey').addEventListener('click', () => this.removeGeminiKey());

        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                appState.config.ttsSpeed = parseFloat(e.target.dataset.speed);
                Storage.saveConfig(appState.config);
            });
        });

        document.getElementById('exportBtn').addEventListener('click', () => this.exportArchive());
        document.getElementById('clearAllBtn').addEventListener('click', () => this.clearAll());

        // Modal
        document.querySelector('.modal-close').addEventListener('click', () => {
            document.getElementById('pillModal').style.display = 'none';
        });

        document.getElementById('pillModal').addEventListener('click', (e) => {
            if (e.target.id === 'pillModal') {
                document.getElementById('pillModal').style.display = 'none';
            }
        });
    },

    loadInitialData() {
        appState.pills = Storage.getPills();
        appState.config = Storage.getConfig();

        // Aggiorna UI con config
        if (appState.config.geminiApiKey) {
            document.getElementById('apiKeyStatus').textContent = '✅ Configurata';
            document.getElementById('toggleGeminiInput').textContent = '🔄 Aggiorna API Key';
            document.getElementById('removeGeminiKey').style.display = 'block';
        }

        // Imposta velocità TTS
        document.querySelectorAll('.speed-btn').forEach(btn => {
            if (parseFloat(btn.dataset.speed) === appState.config.ttsSpeed) {
                btn.classList.add('active');
            }
        });
    },

    navigateTo(page) {
        appState.currentPage = page;

        // Aggiorna nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.page === page) {
                btn.classList.add('active');
            }
        });

        // Aggiorna pagine
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });
        document.getElementById(`${page}Page`).classList.add('active');

        // Inizializza galaxy se necessario
        if (page === 'galaxy' && !Galaxy.canvas) {
            Galaxy.init('galaxyCanvas');
            Galaxy.createNodes(appState.pills);
            Galaxy.draw();
        }

        // Carica archivio se necessario
        if (page === 'archive') {
            this.renderArchive();
        }
    },

    render() {
        this.renderCategories();
    },

    renderCategories() {
        const grid = document.querySelector('.categories-grid');
        grid.innerHTML = '';

        Object.entries(CONFIG.categories).forEach(([key, category]) => {
            const pillCount = appState.pills.filter(p => p.category === key).length;

            const card = document.createElement('div');
            card.className = 'category-card';
            card.style.setProperty('--category-color', category.color);
            card.innerHTML = `
                <div class="category-header">
                    <div class="category-icon">${category.icon}</div>
                    <div class="category-count">${pillCount}</div>
                </div>
                <h3 class="category-title">${category.title}</h3>
                <p class="category-description">${category.description}</p>
                <div class="category-footer">
                    <span class="pills-available">${pillCount} pillole</span>
                    <button class="explore-btn" data-category="${key}">Esplora →</button>
                </div>
            `;

            card.querySelector('.explore-btn').addEventListener('click', () => {
                this.navigateTo('archive');
            });

            grid.appendChild(card);
        });
    },

    renderArchive() {
        const statsContainer = document.querySelector('.archive-stats');
        const pillsList = document.querySelector('.pills-list');

        // Stats
        const stats = {
            total: appState.pills.length,
            humanity: appState.pills.filter(p => p.category === 'humanity').length,
            society: appState.pills.filter(p => p.category === 'society').length,
            world: appState.pills.filter(p => p.category === 'world').length,
        };

        statsContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-value">${stats.total}</div>
                <div class="stat-label">Totale Pillole</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.humanity}</div>
                <div class="stat-label">Umanità</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.society}</div>
                <div class="stat-label">Società</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.world}</div>
                <div class="stat-label">Mondo</div>
            </div>
        `;

        // Pills
        pillsList.innerHTML = '';
        appState.pills.forEach(pill => {
            const card = document.createElement('div');
            card.className = 'pill-card';
            card.innerHTML = `
                <h4 class="pill-title">${pill.title}</h4>
                <p class="pill-excerpt">${pill.excerpt}</p>
                <div class="pill-tags">
                    ${pill.tags.map(tag => `<span class="tag">${tag.label}</span>`).join('')}
                </div>
                <div class="pill-meta">
                    <span>${CONFIG.categories[pill.category].title}</span>
                    <span>${Math.ceil(pill.duration / 60)} min</span>
                </div>
            `;

            card.addEventListener('click', () => this.showPillDetail(pill));
            pillsList.appendChild(card);
        });
    },

    showPillDetail(pill) {
        const modal = document.getElementById('pillModal');
        const detail = document.getElementById('pillDetail');

        detail.innerHTML = `
            <h3>${pill.title}</h3>
            <p style="color: #999999; font-size: 0.9rem; margin-bottom: 1rem;">
                ${CONFIG.categories[pill.category].title} • ${Math.ceil(pill.duration / 60)} min
            </p>
            <p>${pill.content}</p>
            <div class="pill-tags" style="margin-top: 1rem;">
                ${pill.tags.map(tag => `<span class="tag">${tag.label}</span>`).join('')}
            </div>
            <div class="audio-player">
                <div class="audio-controls">
                    <button class="audio-btn" id="playBtn">▶</button>
                    <button class="audio-btn" id="stopBtn">⏹</button>
                </div>
                <p style="text-align: center; font-size: 0.9rem; color: #999999;">
                    Durata stimata: ~${Math.ceil(pill.duration / 60)} minuti
                </p>
            </div>
        `;

        document.getElementById('playBtn').addEventListener('click', () => {
            this.playAudio(pill.content);
        });

        document.getElementById('stopBtn').addEventListener('click', () => {
            this.stopAudio();
        });

        modal.style.display = 'flex';
    },

    playAudio(text) {
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'it-IT';
            utterance.rate = appState.config.ttsSpeed;
            speechSynthesis.speak(utterance);
        }
    },

    stopAudio() {
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
        }
    },

    async refreshPills() {
        const btn = document.getElementById('refreshBtn');
        btn.disabled = true;
        btn.textContent = '⏳ Generazione...';

        try {
            for (const category of Object.keys(CONFIG.categories)) {
                const pills = await ContentGenerator.generate(
                    category,
                    3,
                    !!appState.config.geminiApiKey,
                    appState.config.geminiApiKey
                );
                appState.pills.push(...pills);
            }

            Storage.savePills(appState.pills);
            this.render();
        } catch (error) {
            console.error('Errore durante il refresh:', error);
            alert('Errore durante la generazione delle pillole');
        } finally {
            btn.disabled = false;
            btn.textContent = '🔄 Aggiorna';
        }
    },

    saveGeminiKey() {
        const apiKey = document.getElementById('geminiApiKey').value.trim();

        if (!apiKey) {
            alert('Inserisci una API Key valida');
            return;
        }

        appState.config.geminiApiKey = apiKey;
        Storage.saveConfig(appState.config);

        document.getElementById('apiKeyStatus').textContent = '✅ Configurata';
        document.getElementById('toggleGeminiInput').textContent = '🔄 Aggiorna API Key';
        document.getElementById('removeGeminiKey').style.display = 'block';
        document.getElementById('geminiInputContainer').style.display = 'none';
        document.getElementById('geminiApiKey').value = '';

        alert('API Key salvata con successo!');
    },

    removeGeminiKey() {
        if (confirm('Sei sicuro di voler rimuovere la API Key di Gemini?')) {
            appState.config.geminiApiKey = null;
            Storage.saveConfig(appState.config);

            document.getElementById('apiKeyStatus').textContent = '⚠️ Non configurata';
            document.getElementById('toggleGeminiInput').textContent = '➕ Aggiungi API Key';
            document.getElementById('removeGeminiKey').style.display = 'none';
            document.getElementById('geminiInputContainer').style.display = 'none';

            alert('API Key rimossa');
        }
    },

    exportArchive() {
        const data = {
            pills: appState.pills,
            config: appState.config,
            exportDate: new Date().toISOString(),
        };

        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `omnia-archive-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },

    clearAll() {
        if (confirm('Sei sicuro? Questa azione è irreversibile e cancellerà tutti i dati.')) {
            Storage.clearAll();
            appState.pills = [];
            appState.config = {
                language: 'it',
                darkMode: true,
                ttsSpeed: 1.0,
                geminiApiKey: null,
            };
            this.loadInitialData();
            this.render();
            alert('Tutti i dati sono stati eliminati');
        }
    },
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    UI.init();
});
