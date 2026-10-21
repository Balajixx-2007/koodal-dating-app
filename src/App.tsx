import React from 'react';
import { useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { MatchModal } from './components/MatchModal';

// Pages
import { Home } from './pages/Home';
import { Auth } from './pages/Auth';
import { Onboarding } from './pages/Onboarding';
import { Discover } from './pages/Discover';
import { ProfileDetail } from './pages/ProfileDetail';
import { Matches } from './pages/Matches';
import { Chat } from './pages/Chat';
import { MyProfile } from './pages/MyProfile';
import { Settings } from './pages/Settings';
import { Safety } from './pages/Safety';
import { Legal } from './pages/Legal';

// Admin Pages
import { AdminReports } from './pages/admin/AdminReports';
import { AdminPhotos } from './pages/admin/AdminPhotos';
import { AdminSelfies } from './pages/admin/AdminSelfies';
import { AdminUsers } from './pages/admin/AdminUsers';

export const MainContent: React.FC = () => {
  const { currentView } = useApp();

  const renderCurrentView = () => {
    switch (currentView) {
      case '/':
        return <Home />;
      case '/signup':
        return <Auth isSignUp={true} />;
      case '/login':
        return <Auth isSignUp={false} />;
      case '/onboarding':
        return <Onboarding />;
      case '/discover':
        return <Discover />;
      case '/matches':
        return <Matches />;
      case '/me':
        return <MyProfile />;
      case '/settings':
        return <Settings />;
      case '/safety':
        return <Safety />;
      case '/terms':
        return <Legal initialTab="terms" />;
      case '/privacy':
        return <Legal initialTab="privacy" />;
      case '/guidelines':
        return <Legal initialTab="guidelines" />;
      case '/admin/reports':
        return <AdminReports />;
      case '/admin/photos':
        return <AdminPhotos />;
      case '/admin/selfies':
        return <AdminSelfies />;
      case '/admin/users':
        return <AdminUsers />;
      default:
        if (currentView.startsWith('/profile/')) {
          return <ProfileDetail />;
        }
        if (currentView.startsWith('/chat/')) {
          return <Chat />;
        }
        return <Discover />;
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white transition-colors">
      <Navbar />
      
      <main className="flex-1 pb-20 md:pb-12">
        {renderCurrentView()}
      </main>

      <BottomNav />
      <MatchModal />
    </div>
  );
};

export default function App() {
  return <MainContent />;
}
