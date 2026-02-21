// popup.js

// Translate texts based on language
function applyTranslations(lang) {
    const dict = EXTN_LOCALES[lang] || EXTN_LOCALES['es'];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) {
            el.textContent = dict[key];
        }
    });

    const toggle = document.getElementById('toggle-status');
    const statusText = document.getElementById('status-text');
    if (toggle && statusText) {
        statusText.textContent = toggle.checked ? dict['ext_m_avail'] : dict['ext_m_unavail'];
    }

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

    const loginView = document.getElementById('login-view');
    const mainView = document.getElementById('main-view');
    const btnLogin = document.getElementById('btn-login');
    const idInput = document.getElementById('missionary-id');
    const nameInput = document.getElementById('missionary-name');
    const greetingName = document.getElementById('greeting-name');
    const toggleStatus = document.getElementById('toggleStatus'); // It might not exist as toggleStatus, but we check. Wait, it is id="toggle-status" in html.

    const countChat = document.getElementById('count-chat');
    const countVideo = document.getElementById('count-video');

    // Check state
    const { missionary, isAvailable, chatQueue, videoQueue } = await chrome.storage.local.get(['missionary', 'isAvailable', 'chatQueue', 'videoQueue']);

    if (missionary) {
        showMainView(missionary, isAvailable !== false); // Default to true
    } else {
        loginView.style.display = 'block';
    }

    if (chatQueue !== undefined) countChat.textContent = chatQueue;
    if (videoQueue !== undefined) countVideo.textContent = videoQueue;

    // Listen to queue updates from background
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local') {
            if (changes.chatQueue) countChat.textContent = changes.chatQueue.newValue;
            if (changes.videoQueue) countVideo.textContent = changes.videoQueue.newValue;
        }
    });

    // Login Action
    btnLogin.addEventListener('click', async () => {
        const missId = idInput.value.trim();
        const missName = nameInput.value.trim();

        if (!missId || !missName) {
            const currentLang = document.getElementById('lang-selector').value;
            const dict = EXTN_LOCALES[currentLang] || EXTN_LOCALES['es'];
            alert(dict['ext_m_fill_fields'] || "Completa todos los campos");
            return;
        }

        const newMissionary = { id: missId, name: missName };
        await chrome.storage.local.set({
            missionary: newMissionary,
            isAvailable: true
        });

        // Notify background to update Supabase PRESENCE
        chrome.runtime.sendMessage({ action: 'update_presence', missionary: newMissionary, status: true });

        showMainView(newMissionary, true);

        // trigger background immediately
        chrome.alarms.get('pollQueue', (alarm) => {
            if (!alarm) {
                chrome.alarms.create('pollQueue', { periodInMinutes: 0.5 });
            }
        });
    });

    function showMainView(miss, available) {
        loginView.style.display = 'none';
        mainView.style.display = 'block';
        greetingName.textContent = miss.name;

        const toggle = document.getElementById('toggle-status');
        const statusText = document.getElementById('status-text');

        toggle.checked = available;
        const currentLang = document.getElementById('lang-selector').value;
        const dict = EXTN_LOCALES[currentLang] || EXTN_LOCALES['es'];
        statusText.textContent = available ? dict['ext_m_avail'] : dict['ext_m_unavail'];

        toggle.addEventListener('change', async (e) => {
            const isAv = e.target.checked;
            const currentLang = document.getElementById('lang-selector').value;
            const dict = EXTN_LOCALES[currentLang] || EXTN_LOCALES['es'];
            statusText.textContent = isAv ? dict['ext_m_avail'] : dict['ext_m_unavail'];
            await chrome.storage.local.set({ isAvailable: isAv });

            // Send update to supabase to update missionary state
            chrome.runtime.sendMessage({ action: 'update_presence', missionary: miss, status: isAv });
        });
    }

    // --- MODO DESARROLLO / PRODUCCIÓN ---
    const isDev = false; // Cambiar a 'false' al publicar la extensión final
    const BASE_URL = isDev ? 'http://localhost:3000' : 'https://laconeo.github.io/centro-virtual';

    document.getElementById('btn-open-chat').addEventListener('click', () => {
        chrome.tabs.create({ url: `${BASE_URL}/atender/chat` });
    });

    document.getElementById('btn-open-video').addEventListener('click', () => {
        chrome.tabs.create({ url: `${BASE_URL}/atender/video` });
    });

    document.getElementById('btn-logout').addEventListener('click', async () => {
        const { missionary } = await chrome.storage.local.get(['missionary']);
        if (missionary) {
            chrome.runtime.sendMessage({ action: 'update_presence', missionary: missionary, status: false });
        }
        await chrome.storage.local.remove(['missionary', 'isAvailable']);
        mainView.style.display = 'none';
        loginView.style.display = 'block';
        idInput.value = '';
        nameInput.value = '';
    });

    document.getElementById('btn-sgo').addEventListener('click', () => {
        // Redirige al PowerApp sgo
        chrome.tabs.create({ url: "https://apps.powerapps.com/play/e/default-61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79/a/acb69efc-7f14-46d4-984a-68137a8ae112?tenantId=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&hint=337ed064-8b52-426b-b09c-a5efceeebf2f&sourcetime=1771676384616" });
    });
});
