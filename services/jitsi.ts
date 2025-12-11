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

  const domain = 'meet.jit.si';
  const options = {
    roomName: roomName,
    width: '100%',
    height: '100%',
    parentNode: document.getElementById(containerId),
    userInfo: {
      displayName: displayName
    },
    configOverwrite: {
      startWithAudioMuted: false,
      startWithVideoMuted: false,
      prejoinPageEnabled: false, // Skip pre-join screen for faster connection
      // Disable deep linking to mobile apps for smoother web experience
      disableDeepLinking: true, 
    },
    interfaceConfigOverwrite: {
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