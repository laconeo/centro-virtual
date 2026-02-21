chrome.runtime.onMessage.addListener(msg => {
    if (msg.action === 'play_bell') {
        const audio = document.getElementById('bellAudio');
        audio.play().catch(e => console.error("Offscreen audio play failed:", e));
    }
});
