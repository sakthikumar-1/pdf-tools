import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LoginModal from '../components/LoginModal';
import QuickSearchModal from '../components/QuickSearchModal';
import './MainLayout.css';

export default function MainLayout({ children }) {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  return (
    <div className="app-shell">
      {/* Top Sticky Header with Horizontal Navigation */}
      <Header
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenSearch={() => setSearchModalOpen(true)}
      />

      {/* Main Container: Full-Width Content */}
      <div className="app-body">
        <div className="main-wrapper">
          <main className="main-content-area">
            {children}
          </main>

          <Footer />
        </div>
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
