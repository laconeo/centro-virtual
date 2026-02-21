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
let consecutiveErrors = 0; // for exponential backoff
const volunteerIdCache = {}; // cache: identifier -> supabase UUID

// Initialize ALARMS — 30s is the sweet spot: fast enough for UX, low on DB load
chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create('pollQueue', { periodInMinutes: 0.5 }); // 30 seconds
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

        const response = await fetch(
            // Only fetch the minimal fields needed — avoids transferring unused data
            `${SUPABASE_URL}/rest/v1/sessions?estado=eq.esperando&select=id,nombre,tema,type&limit=50`,
            fetchOptions
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const sessions = await response.json();
        consecutiveErrors = 0; // reset backoff on success

        let newSessionsCount = 0;
        const currentQueueIds = new Set();

        sessions.forEach(s => {
            currentQueueIds.add(s.id);
            if (!lastNotifiedSessionIds.has(s.id)) {
                newSessionsCount++;
                notifyNewSession(s);
            }
        });

        if (newSessionsCount > 0) {
            playBellSound();
        }

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
        consecutiveErrors++;
        // Exponential backoff: log but don't spam retries — next alarm cycle will retry
        console.warn(`Queue poll error (attempt ${consecutiveErrors}):`, e.message);
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
    const identifier = missionary.id.trim();
    const nombre = missionary.name.trim();
    const cacheKey = identifier + '_' + nombre;

    try {
        // Use cached volunteer UUID to avoid a read query every time
        let volunteerId = volunteerIdCache[cacheKey];

        if (!volunteerId) {
            const queryUrl = `${SUPABASE_URL}/rest/v1/volunteers?or=(email.ilike.*${encodeURIComponent(identifier)}*,nombre.ilike.*${encodeURIComponent(nombre)}*)&select=id&limit=1`;
            const resp = await fetch(queryUrl, fetchOptions);
            const volunteers = await resp.json();

            if (volunteers && volunteers.length > 0) {
                volunteerId = volunteers[0].id;
                volunteerIdCache[cacheKey] = volunteerId; // cache for future calls
            } else {
                console.log(`Volunteer ${nombre} not found in database.`);
                return;
            }
        }

        const patchUrl = `${SUPABASE_URL}/rest/v1/volunteers?id=eq.${volunteerId}`;
        await fetch(patchUrl, {
            method: 'PATCH',
            headers: fetchOptions.headers,
            body: JSON.stringify({ status: status, last_status_change: new Date().toISOString() })
        });

        console.log(`Presence updated: ${nombre} → ${status}`);
    } catch (error) {
        console.error('Error updating presence:', error);
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'update_presence') {
        updatePresence(message.missionary, message.status);
        sendResponse({ ok: true });
    }
    return true;
});
