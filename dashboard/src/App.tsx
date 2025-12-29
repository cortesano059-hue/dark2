import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Backpacks } from './pages/Backpacks';
import { Commands } from './pages/Commands';
import { Config } from './pages/Config';
import { Home } from './pages/Home';
import { Inventory } from './pages/Inventory';
import { Landing } from './pages/Landing';
import { Leaderboard } from './pages/Leaderboard';
import { MemberManagement } from './pages/MemberManagement';
import { Profile } from './pages/Profile';
import { Servers } from './pages/Servers';
import { Shop } from './pages/Shop';
import { StoreEditor } from './pages/StoreEditor';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-12 h-12 text-primary animate-spin" /></div>;
  if (!user) {
    window.location.href = '/api/auth/login';
    return null;
  }

  return <Layout>{children}</Layout>;
};

const DynamicBranding = () => {
  const { botInfo } = useAuth();

  useEffect(() => {
    if (botInfo.username) {
      document.title = `${botInfo.username}`;
    }
    if (botInfo.avatar) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = botInfo.avatar;
    }
  }, [botInfo]);

  return null;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <DynamicBranding />
        <Routes>
          <Route path="/" element={<Layout hideSidebar><Landing /></Layout>} />
          <Route path="/commands" element={<Layout><Commands /></Layout>} />
          <Route path="/dashboard" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/servers" element={<ProtectedRoute><Servers /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<Layout><Leaderboard /></Layout>} />
          <Route path="/stats/:id" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/settings/:id" element={<ProtectedRoute><Config /></ProtectedRoute>} />
          <Route path="/economy/:id" element={<ProtectedRoute><MemberManagement /></ProtectedRoute>} />
          <Route path="/catalog/:id" element={<ProtectedRoute><StoreEditor /></ProtectedRoute>} />
          <Route path="/shop/:id" element={<ProtectedRoute><Shop /></ProtectedRoute>} />
          <Route path="/profile/:id" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
          <Route path="/backpacks/:id" element={<ProtectedRoute><Backpacks /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
