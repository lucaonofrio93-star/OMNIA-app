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
    pills: [],
    config: { geminiApiKey: null, ttsSpeed: 1.0 },
};

const UI = {
    init() {
        const storedPills = localStorage.getItem(CONFIG.storageKeys.pills);
        const storedConfig = localStorage.getItem(CONFIG.storageKeys.config);
        if (storedPills) appState.pills = JSON.parse(storedPills);
        if (storedConfig) appState.config = JSON.parse(storedConfig);
        
        this.render();
        
        document.getElementById('saveGeminiKey')?.addEventListener('click', () => {
            const key = document.getElementById('geminiApiKey').value;
            appState.config.geminiApiKey = key;
            localStorage.setItem(CONFIG.storageKeys.config, JSON.stringify(appState.config));
            alert("Chiave Salvata! Ora puoi generare contenuti.");
        });
        
        document.getElementById('refreshBtn')?.addEventListener('click', () => this.refreshPills());
    },

    async refreshPills() {
        const apiKey = appState.config.geminiApiKey;
        if (!apiKey) return alert("Vai in Impostazioni e inserisci la tua API Key!");
        
        const btn = document.getElementById('refreshBtn');
        btn.textContent = '⏳ Analisi in corso...';
        
        try {
            for (let cat in CONFIG.categories) {
                const prompt = `Agisci come un docente universitario. Genera una pillola accademica in JSON per la categoria ${CONFIG.categories[cat].title}. Struttura: {"pills": [{"title": "...", "content": "...", "tags": ["tag1"]}]}`;
                
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                });

                const data = await response.json();
                const text = data.candidates[0].content.parts[0].text;
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                const parsed = JSON.parse(jsonMatch[0]);

                const newPills = parsed.pills.map(p => ({
                    ...p,
                    id: Date.now() + Math.random(),
                    category: cat,
                    excerpt: p.content.substring(0, 100) + '...'
                }));
                appState.pills.push(...newPills);
            }
            localStorage.setItem(CONFIG.storageKeys.pills, JSON.stringify(appState.pills));
            this.render();
        } catch (e) {
            alert("Errore con Gemini. Controlla la tua API Key.");
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
            card.innerHTML = `
                <div style="font-size: 2rem">${cat.icon}</div>
                <h3>${cat.title}</h3>
                <p>${cat.description}</p>
                <div style="margin-top: 10px; font-weight: bold; color: ${cat.color}">${count} pillole archiviate</div>
            `;
            grid.appendChild(card);
        });
    },

    navigateTo(pageId) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(pageId + 'Page').classList.add('active');
        if(pageId === 'archive') this.renderArchive();
    },

    renderArchive() {
        const list = document.querySelector('.pills-list');
        list.innerHTML = appState.pills.map(p => `
            <div class="pill-card" style="background: #1a1a1a; padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid ${CONFIG.categories[p.category].color}">
                <h4 style="margin:0">${p.title}</h4>
                <p style="font-size: 0.9rem; color: #ccc">${p.content}</p>
                <small style="color: #888">${CONFIG.categories[p.category].title}</small>
            </div>
        `).join('');
    }
};

document.addEventListener('DOMContentLoaded', () => UI.init());
