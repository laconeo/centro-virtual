import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { User, HeartHandshake, Video, MessageSquare } from 'lucide-react';
import { UserFlow } from './components/UserFlow';
import { VolunteerLogin } from './components/VolunteerLogin';
import { VolunteerDashboard } from './components/VolunteerDashboard';
import { ConfigDashboard } from './components/ConfigDashboard';
import { Volunteer } from './types';
import { Layout } from './components/ui/Layout';
import { supabaseService } from './services/supabaseService';
import { UserLandingExtension } from './components/UserLandingExtension';
import { ExtensionsDashboard } from './components/ExtensionsDashboard';

type ViewState = 'home' | 'user-flow' | 'volunteer-login' | 'volunteer-dashboard' | 'config' | 'extension-landing' | 'extensions-dashboard';

function App() {
  const [view, setView] = useState<ViewState>('home');
  const [currentVolunteer, setCurrentVolunteer] = useState<Volunteer | null>(null);
  const [userFlowKey, setUserFlowKey] = useState(0);

  // Router init
  React.useEffect(() => {
    const initRoute = async () => {
      const url = new URL(window.location.href);
      // Suport subpath and query parameters since GH pages fails with subpaths without 404.html
      if (url.pathname.includes('/atender') || url.searchParams.has('atender')) {
        const vol = await supabaseService.getCurrentVolunteer();
        if (vol) {
          setCurrentVolunteer(vol);
          setView('volunteer-dashboard');
        } else {
          setView('volunteer-login');
        }
      } else if (url.searchParams.has('extension')) {
        setView('extension-landing');
      } else if (url.searchParams.has('dashboard') && url.searchParams.get('dashboard') === 'extensions') {
        setView('extensions-dashboard');
      }
    };
    initRoute();
  }, []);

  // Auth Listener for recovery
  React.useEffect(() => {
    let subscription: any;

    const setupAuth = async () => {
      subscription = await supabaseService.onAuthStateChange(async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setView('volunteer-login');
          // We can use a small delay or a ref to ensure the view is ready
          // But since view state change triggers re-render, it should be fine
        }
      });
    };

    setupAuth();

    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, []);

  // Navigation handlers
  const goHome = () => {
    setView('home');
    setUserFlowKey(prev => prev + 1);
  };

  const startVolunteerFlow = () => setView('volunteer-login');

  const handleVolunteerLogin = (vol: Volunteer) => {
    setCurrentVolunteer(vol);
    setView('volunteer-dashboard');
  };

  const handleOpenConfig = () => setView('config');

  const handleVolunteerLogout = () => {
    setCurrentVolunteer(null);
    goHome();
  };

  // Render Views
  if (view === 'volunteer-login') {
    // Detect if we are in recovery mode via hash or session
    const isRecovery = window.location.hash.includes('type=recovery');
    return (
      <>
        <VolunteerLogin
          onLoginSuccess={handleVolunteerLogin}
          onBack={goHome}
          initialView={isRecovery ? 'reset' : 'login'}
        />
        <Toaster position="top-right" />
      </>
    );
  }

  if (view === 'volunteer-dashboard' && currentVolunteer) {
    return (
      <>
        <VolunteerDashboard
          volunteer={currentVolunteer}
          onLogout={handleVolunteerLogout}
          onConfigClick={handleOpenConfig}
        />
        <Toaster position="top-right" />
      </>
    );
  }

  if (view === 'config') {
    return (
      <>
        <ConfigDashboard onBack={currentVolunteer ? () => setView('volunteer-dashboard') : goHome} />
        <Toaster position="top-right" />
      </>
    );
  }

  if (view === 'extension-landing') {
    return (
      <>
        <UserLandingExtension />
        <Toaster position="top-right" />
      </>
    );
  }

  if (view === 'extensions-dashboard') {
    return (
      <>
        <ExtensionsDashboard />
        <Toaster position="top-right" />
      </>
    );
  }

  // Home Screen (Now UserFlow)
  return (
    <>
      <UserFlow key={userFlowKey} onExit={goHome} onVolunteerAccess={startVolunteerFlow} />
      <Toaster position="top-right" />
    </>
  );
}

export default App;