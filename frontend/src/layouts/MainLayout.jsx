import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LoginModal from '../components/LoginModal';
import QuickSearchModal from '../components/QuickSearchModal';
import './MainLayout.css';

export default function MainLayout({ children }) {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const handleToggleSidebar = () => {
    // If on mobile/tablet screen, toggle mobile drawer
    if (window.innerWidth <= 1024) {
      setMobileDrawerOpen(prev => !prev);
    } else {
      setSidebarCollapsed(prev => !prev);
    }
  };

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Persistent Left Sidebar */}
      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        isMobileOpen={mobileDrawerOpen}
        onCloseMobile={() => setMobileDrawerOpen(false)}
        onOpenSearch={() => setSearchModalOpen(true)}
      />

      {/* Main Content Workspace Area */}
      <div className="main-wrapper">
        <Header 
          onToggleSidebar={handleToggleSidebar}
          onOpenAuth={() => setAuthModalOpen(true)}
          onOpenSearch={() => setSearchModalOpen(true)}
          isCollapsed={sidebarCollapsed}
        />
        
        <main className="main-content-area">
          {children}
        </main>

        <Footer />
      </div>

      {/* Global Modals */}
      <LoginModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      <QuickSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />
    </div>
  );
}
