import React, { useEffect, useState } from 'react';
import '../styles/index.css';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeProvider';
import { BookmarkProvider } from '../context/BookmarkProvider';
import { LiveStreamProvider } from '../context/LiveStreamProvider';
import { HelmetProvider } from 'react-helmet-async';
import { useRouter } from 'next/router';
import MainTab from '../components/maintab';
import Menu from './menu';
import AppDownloadModal from '../components/AppDownloadModal';
import {
  shouldShowAppDownloadPrompt,
  markAppDownloadPromptShown,
  markAppDownloadPromptDismissed,
  getPromptDelay
} from '../lib/appDownloadPromptManager';
import { isMobileDevice } from '../lib/deviceDetection';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [showAppDownloadModal, setShowAppDownloadModal] = useState(false);
  const tabRoutes = ['/home', '/articles', '/Podcasts', '/Reels', '/Community'];
  const showMainTabs = tabRoutes.includes(router.pathname);
  const rightMenuRoutes = [
    '/home',
    '/articles',
    '/Podcasts',
    '/profile',
    '/user/[userId]',
    '/Community',
  ];
  const showRightMenu = rightMenuRoutes.includes(router.pathname);

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.__openVerrsaMobileMenu = () => setIsMobileMenuOpen(true);

    return () => {
      delete window.__openVerrsaMobileMenu;
    };
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [router.pathname]);

  // App Download Prompt Logic
  useEffect(() => {
    // Only show on mobile devices
    if (!isMobileDevice()) return;

    // Check if we should show the prompt
    if (!shouldShowAppDownloadPrompt()) return;

    // Set a timer to show the modal after 30 seconds
    const timer = setTimeout(() => {
      setShowAppDownloadModal(true);
      markAppDownloadPromptShown();
    }, getPromptDelay());

    return () => clearTimeout(timer);
  }, []);

  const handleDismissAppDownload = () => {
    setShowAppDownloadModal(false);
    markAppDownloadPromptDismissed();
  };

  const handleOpenApp = () => {
    setShowAppDownloadModal(false);
    markAppDownloadPromptShown();
  };

  return (
    <HelmetProvider>
      <ThemeProvider>
        <AuthProvider>
          <BookmarkProvider>
            <LiveStreamProvider>
              <div className={showRightMenu ? 'app-with-right-menu' : 'app-default-layout'}>
                <div className="app-main-content">
                  <Component {...pageProps} />
                </div>
                {showRightMenu && (
                  <aside className="app-right-menu-panel">
                    <Menu embedded />
                  </aside>
                )}
                {!isDesktop && showRightMenu && (
                  <Menu
                    isOpen={isMobileMenuOpen}
                    onClose={() => setIsMobileMenuOpen(false)}
                  />
                )}
              </div>
              {showMainTabs && <MainTab />}
              
              {/* App Download Prompt Modal */}
              <AppDownloadModal
                visible={showAppDownloadModal}
                onDismiss={handleDismissAppDownload}
                onOpenApp={handleOpenApp}
              />
            </LiveStreamProvider>
          </BookmarkProvider>
        </AuthProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default MyApp;
