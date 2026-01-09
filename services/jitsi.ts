// Type definition for the global JitsiMeetExternalAPI
declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

export const initializeJitsi = (
  containerId: string,
  roomName: string,
  displayName: string,
  onDisconnect: () => void,
  isVolunteer: boolean = false
) => {
  if (!window.JitsiMeetExternalAPI) {
    console.error("Jitsi API not loaded");
    return null;
  }

  // 'meet.jit.si' now requires authentication.
  // We use a reliable community instance: 'meet.ffmuc.net' (Freifunk Munich)
  // which usually respects the language parameter better.
  const domain = 'meet.ffmuc.net';
  const options = {
    roomName: roomName,
    width: '100%',
    height: '100%',
    parentNode: document.getElementById(containerId),
    userInfo: {
      displayName: displayName
    },
    lang: 'es', // Force Spanish interface
    configOverwrite: {
      defaultLanguage: 'es',
      startWithAudioMuted: false,
      startWithVideoMuted: false,
      prejoinPageEnabled: false,
      disableDeepLinking: true,
    },
    interfaceConfigOverwrite: {
      DEFAULT_LOCAL_DISPLAY_NAME: 'Yo',
      TOOLBAR_BUTTONS: [
        'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
        'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
        'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
        'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
        'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
        'security'
      ],
    },
  };

  const api = new window.JitsiMeetExternalAPI(domain, options);

  api.addEventListeners({
    videoConferenceLeft: () => {
      onDisconnect();
      api.dispose();
    },
    readyToClose: () => {
      onDisconnect();
      api.dispose();
    }
  });

  return api;
};