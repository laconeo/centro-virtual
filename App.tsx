import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { User, HeartHandshake, Video, MessageSquare } from 'lucide-react';
import { UserFlow } from './components/UserFlow';
import { VolunteerLogin } from './components/VolunteerLogin';
import { VolunteerDashboard } from './components/VolunteerDashboard';
import { Volunteer } from './types';
import { Layout } from './components/ui/Layout';

type ViewState = 'home' | 'user-flow' | 'volunteer-login' | 'volunteer-dashboard';

function App() {
  const [view, setView] = useState<ViewState>('home');
  const [currentVolunteer, setCurrentVolunteer] = useState<Volunteer | null>(null);
  const [userFlowKey, setUserFlowKey] = useState(0);

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

  const handleVolunteerLogout = () => {
    setCurrentVolunteer(null);
    goHome();
  };

  // Render Views
  if (view === 'volunteer-login') {
    return (
      <>
        <VolunteerLogin onLoginSuccess={handleVolunteerLogin} onBack={goHome} />
        <Toaster position="top-right" />
      </>
    );
  }

  if (view === 'volunteer-dashboard' && currentVolunteer) {
    return (
      <>
        <VolunteerDashboard volunteer={currentVolunteer} onLogout={handleVolunteerLogout} />
        <Toaster position="top-right" />
      </>
    );
  }

  // Home Screen (Now UserFlow)
  // We treat 'home' and 'user-flow' as the same thing now, effectively 'home' renders UserFlow
  return (
    <>
      <UserFlow key={userFlowKey} onExit={goHome} onVolunteerAccess={startVolunteerFlow} />
      <Toaster position="top-right" />
    </>
  );
}

export default App;