const SUPABASE_URL = 'https://nbtfxxzkpgiddwimrwjx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_kE9VBRPXLtK9hSYXrwKwWA_y5oRFj7e';

const fetchOptions = {
    headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
    }
};

chrome.runtime.onInstalled.addListener(async (details) => {
    // Only track the install event, not updates, to avoid saturating the database.
    if (details.reason === 'install') {
        try {
            const result = await chrome.storage.local.get(['deviceId']);
            let deviceId = result.deviceId;
            if (!deviceId) {
                // crypto.randomUUID() generates a v4 UUID, which is very collision-resistant.
                deviceId = crypto.randomUUID();
                await chrome.storage.local.set({ deviceId });
            }

            // Fire and forget to Supabase
            await fetch(`${SUPABASE_URL}/rest/v1/extension_installs`, {
                method: 'POST',
                headers: fetchOptions.headers,
                body: JSON.stringify({
                    device_id: deviceId,
                    extension_type: 'user'
                })
            });
            console.log('Installation registered successfully');
        } catch (error) {
            console.error('Error registering install:', error);
        }
    }
});
