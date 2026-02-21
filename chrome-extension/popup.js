// popup.js

document.getElementById('btn-plan').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://familysearch.me/DD' });
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
