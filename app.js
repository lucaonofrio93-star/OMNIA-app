/**
 * OMNIA - Versione Accademica Avanzata
 * 6 Categorie: Storia IT, Geopolitica, Attualità, Letteratura, Arte, Musica
 */

const CONFIG = {
    storageKeys: {
        pills: 'omnia_pills',
        config: 'omnia_config',
    },
    categories: {
        storia_it: { title: 'Storia Italiana', icon: '🇮🇹', color: '#008C45', description: 'Analisi dei processi storici e politici nazionali.' },
        geopolitica: { title: 'Geopolitica', icon: '🌐', color: '#4A90E2', description: 'Relazioni internazionali e scenari globali.' },
        attualita: { title: 'Attualità', icon: '📰', color: '#E74C3C', description: 'Analisi critica degli eventi contemporanei.' },
        letteratura: { title: 'Letteratura', icon: '📚', color: '#F1C40F', description: 'Approfondimenti filologici e critici.' },
        arte: { title: 'Cultura Artistica', icon: '🎨', color: '#9B59B6', description: 'Storia dell\'arte e teoria estetica.' },
        musica: { title: 'Cultura Musicale', icon: '🎵', color: '#2ECC71', description: 'Sociologia e teoria musicale.' }
    }
};

const appState = {
    currentPage: 'home',
    pills: [],
    config: { geminiApiKey: null, ttsSpeed: 1.0 },
};

// --- GEMINI CLIENT POTENZIATO ---
const GeminiClient = {
    async generateContent(category, apiKey) {
        const catInfo = CONFIG.categories[category];
        
        const systemPrompt = `Sei un accademico esperto. Genera una pillola di ALTO LIVELLO per la categoria ${catInfo.title}.
        REQUISITI:
        - Tono: Accademico, profondo, analitico. Evita banalità.
        - Contenuto: Cita correnti di pensiero, dati storici precisi o teorie specifiche.
        - Struttura JSON: {"pills": [{"title": "...", "content": "...", "tags": ["...", "..."]}]}`;

        const prompt = `Genera un'analisi approfondita su un tema di nicchia o avanzato di: ${catInfo.title}.`;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: systemPrompt + "\n\n" + prompt }] }]
                })
            });

            const data = await response.json();
            const text = data.candidates[0].content.parts[0].text;
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            const parsed = JSON.parse(jsonMatch[0]);

            return parsed.pills.map(p => ({
                id: `pill-${Date.now()}-${Math.random()}`,
                ...p,
                category,
                createdAt: Date.now(),
                duration: Math.ceil(p.content.length / 5),
                excerpt: p.content.substring(0, 100) + '...'
            }));
        } catch (e) {
            console.error("Errore Gemini:", e);
            return [];
        }
    }
};

// --- LOGICA UI ---
const UI = {
    async refreshPills() {
        const apiKey = appState.config.geminiApiKey;
        if (!apiKey) return alert("Inserisci la API Key nelle Impostazioni!");
        
        const btn = document.getElementById('refreshBtn');
        btn.textContent = '⏳ Ricerca Accademica...';
        
        try {
            for (let cat in CONFIG.categories) {
                const newPills = await GeminiClient.generateContent(cat, apiKey);
                appState.pills.push(...newPills);
            }
            localStorage.setItem(CONFIG.storageKeys.pills, JSON.stringify(appState.pills));
            this.render();
        } finally {
            btn.textContent = '🔄 Aggiorna Conoscenza';
        }
    },

    render() {
        const grid = document.querySelector('.categories-grid');
        if (!grid) return;
        grid.innerHTML = '';

        Object.entries(CONFIG.categories).forEach(([key, cat]) => {
            const count = appState.pills.filter(p => p.category === key).length;
            const card = document.createElement('div');
            card.className = 'category-card';
            card.style.borderLeft = `5px solid ${cat.color}`;
            card.innerHTML = `
                <div class="category-header"><span>${cat.icon}</span> <span>${count}</span></div>
                <h3>${cat.title}</h3>
                <p>${cat.description}</p>
                <button onclick="UI.navigateTo('archive')">Esplora</button>
            `;
            grid.appendChild(card);
        });
    },

    // Funzioni di navigazione e gestione (semplificate per brevità)
    init() {
        appState.pills = JSON.parse(localStorage.getItem(CONFIG.storageKeys.pills)) || [];
        appState.config = JSON.parse(localStorage.getItem(CONFIG.storageKeys.config)) || appState.config;
        this.render();
        
        // Listener per il salvataggio chiave
        document.getElementById('saveGeminiKey')?.addEventListener('click', () => {
            const key = document.getElementById('geminiApiKey').value;
            appState.config.geminiApiKey = key;
            localStorage.setItem(CONFIG.storageKeys.config, JSON.stringify(appState.config));
            alert("Chiave Salvata!");
        });
        
        document.getElementById('refreshBtn')?.addEventListener('click', () => this.refreshPills());
    },

    navigateTo(page) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(`${page}Page`).classList.add('active');
        if(page === 'archive') this.renderArchive();
    },

    renderArchive() {
        const list = document.querySelector('.pills-list');
        list.innerHTML = appState.pills.map(p => `
            <div class="pill-card" onclick="UI.showPillDetail(${JSON.stringify(p).replace(/"/g, '&quot;')})">
                <h4>${p.title}</h4>
                <p>${p.excerpt}</p>
                <small>${CONFIG.categories[p.category].title}</small>
            </div>
        `).join('');
    }
};

document.addEventListener('DOMContentLoaded', () => UI.init());
