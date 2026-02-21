const SUPABASE_URL = 'https://nbtfxxzkpgiddwimrwjx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_kE9VBRPXLtK9hSYXrwKwWA_y5oRFj7e';

const fetchOptions = {
    headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
    }
};

let lastNotifiedSessionIds = new Set();
let isOffscreenCreated = false;

// Initialize ALARMS
chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create('pollQueue', { periodInMinutes: 0.1 }); // Pull every 6 seconds for testing. Better change to 0.5 (30s).
});

// Alarm Listener
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'pollQueue') {
        await checkQueue();
    }
});

// Update Ping / Poll Queue
async function checkQueue() {
    try {
        const { missionary, isAvailable } = await chrome.storage.local.get(['missionary', 'isAvailable']);

        if (!missionary || !isAvailable) {
            return; // Not logged in or not available
        }

        // ping presence if needed (optional)
        // await pingPresence(missionary.id);

        const response = await fetch(`${SUPABASE_URL}/rest/v1/sessions?estado=eq.esperando&select=id,nombre,tema,type`, fetchOptions);
        const sessions = await response.json();

        let newSessionsCount = 0;
        let currentQueueIds = new Set();

        sessions.forEach(s => {
            currentQueueIds.add(s.id);
            if (!lastNotifiedSessionIds.has(s.id)) {
                newSessionsCount++;
                notifyNewSession(s);
            }
        });

        // if there are waiting sessions and there is a new one, ring bell!
        if (newSessionsCount > 0) {
            playBellSound();
        }

        // Overwrite so we don't notify again, but clean up the ones that are no longer waiting
        lastNotifiedSessionIds = currentQueueIds;

        // Update badge
        const chatCount = sessions.filter(s => s.type === 'chat').length;
        const videoCount = sessions.filter(s => s.type === 'video').length;
        const total = chatCount + videoCount;

        if (total > 0) {
            chrome.action.setBadgeText({ text: total.toString() });
            chrome.action.setBadgeBackgroundColor({ color: '#8CB83E' });
        } else {
            chrome.action.setBadgeText({ text: '' });
        }

        // Save current queue info for popup
        await chrome.storage.local.set({ chatQueue: chatCount, videoQueue: videoCount, totalQueue: total });

    } catch (e) {
        console.error("Error polling queue:", e);
    }
}

function notifyNewSession(session) {
    const isVideo = session.type === 'video';
    chrome.notifications.create(`session_${session.id}`, {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: isVideo ? 'Nueva solicitud de Video' : 'Nueva solicitud de Chat',
        message: `${session.nombre} necesita ayuda con: ${session.tema || 'Consulta General'}`,
        priority: 2,
        requireInteraction: true // keeps it on screen until user dismisses or clicks
    });
}

chrome.notifications.onClicked.addListener((notificationId) => {
    if (notificationId.startsWith('session_')) {
        const sessionId = notificationId.replace('session_', '');
        // Clear it
        chrome.notifications.clear(notificationId);

        // --- MODO DESARROLLO / PRODUCCIÓN ---
        const isDev = false; // Cambiar a 'false' al publicar la extensión final
        const BASE_URL = isDev ? 'http://localhost:3000' : 'https://laconeo.github.io/centro-virtual';

        // Open the virtual center backend properly authenticated
        const urlToOpen = `${BASE_URL}/atender/${sessionId}`;
        chrome.tabs.create({ url: urlToOpen });
    }
});

async function playBellSound() {
    try {
        const offscreenUrl = chrome.runtime.getURL('offscreen.html');
        const existingContexts = await chrome.runtime.getContexts({
            contextTypes: ['OFFSCREEN_DOCUMENT'],
            documentUrls: [offscreenUrl]
        });

        if (existingContexts.length === 0) {
            isOffscreenCreated = true;
            await chrome.offscreen.createDocument({
                url: 'offscreen.html',
                reasons: ['AUDIO_PLAYBACK'],
                justification: 'Notification for new user requests requesting volunteer help'
            });
        }

        // send message to offscreen to play sound
        chrome.runtime.sendMessage({ action: 'play_bell' });
    } catch (e) {
        console.error("Audio playback error:", e);
    }
}

async function updatePresence(missionary, isAvailable) {
    if (!missionary) return;
    const status = isAvailable ? 'online' : 'offline';
    const identifier = missionary.id.trim(); // FS-1234 or email
    const nombre = missionary.name.trim();

    try {
        // Find existing volunteer by email or nombre
        const queryUrl = `${SUPABASE_URL}/rest/v1/volunteers?or=(email.ilike.*${identifier}*,nombre.ilike.*${nombre}*)&select=id`;
        const resp = await fetch(queryUrl, fetchOptions);
        const volunteers = await resp.json();

        if (volunteers && volunteers.length > 0) {
            const volunteerId = volunteers[0].id;
            const patchUrl = `${SUPABASE_URL}/rest/v1/volunteers?id=eq.${volunteerId}`;
            await fetch(patchUrl, {
                method: 'PATCH',
                headers: fetchOptions.headers,
                body: JSON.stringify({ status: status })
            });
            console.log(`Volunteer ${nombre} presence updated to ${status}`);
        } else {
            console.log(`Volunteer ${nombre} not found in database to update presence.`);
        }
    } catch (error) {
        console.error("Error updating presence:", error);
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'update_presence') {
        updatePresence(message.missionary, message.status);
        sendResponse({ ok: true });
    }
    return true;
});
