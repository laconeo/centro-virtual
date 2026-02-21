// popup.js

const isDev = false; // Cambiar a false en prod
const BASE_URL = isDev ? 'http://localhost:3000' : 'https://laconeo.github.io/centro-virtual';

// Translate texts based on language
function applyTranslations(lang) {
    const dict = EXTN_LOCALES[lang] || EXTN_LOCALES['es'];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) {
            el.textContent = dict[key];
        }
    });

    // Save choice
    chrome.storage.local.set({ userLang: lang });
}

document.addEventListener('DOMContentLoaded', async () => {
    const langSelect = document.getElementById('lang-selector');

    // Load saved lang or fallback
    const { userLang } = await chrome.storage.local.get('userLang');
    const currentLang = userLang || 'es';
    langSelect.value = currentLang;
    applyTranslations(currentLang);

    // Watch for change
    langSelect.addEventListener('change', (e) => {
        applyTranslations(e.target.value);
    });
});


document.getElementById('btn-video').addEventListener('click', () => {
    chrome.tabs.create({ url: `${BASE_URL}/?mode=video` });
    window.close();
});

document.getElementById('btn-chat').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
        alert('Por favor, abre una página web real (como FamilySearch) para usar el chat.');
        return;
    }

    try {
        // Intentar enviar mensaje al content script
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'OPEN_WIDGET' });
        if (response && response.ok) {
            window.close();
        }
    } catch (err) {
        console.log('El content script no está cargado. Intentando inyección manual...');

        // Fallback: Inyectar manualmente si no estaba (pasa en pestañas abiertas antes de cargar la extensión)
        try {
            await chrome.scripting.insertCSS({
                target: { tabId: tab.id },
                files: ['widget.css']
            });
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['widget.js']
            });

            // Re-intentar mensaje
            setTimeout(() => {
                chrome.tabs.sendMessage(tab.id, { action: 'OPEN_WIDGET' });
                window.close();
            }, 100);
        } catch (scriptErr) {
            console.error('Error inyectando script:', scriptErr);
            alert('Refresca la página para poder chatear.');
        }
    }
});
