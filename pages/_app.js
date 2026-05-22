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
import { setupAppDownloadModalTesting } from '../lib/testAppDownloadModal';

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
  
  // Routes where app download modal should NOT appear (e.g., auth pages)
  const excludedAppDownloadRoutes = ['/auth', '/login', '/signup', '/resetpassword', '/setnewpassword', '/ambassador', '/index'];
  const shouldShowAppDownload = !excludedAppDownloadRoutes.includes(router.pathname);

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

  // Setup testing utilities in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      setupAppDownloadModalTesting();
    }
  }, []);

  // App Download Prompt Logic - Show every 1 minute
  useEffect(() => {
    // Only show on specific routes
    if (!shouldShowAppDownload) {
      console.log('[AppDownload] Not on a route that shows app download modal');
      return;
    }

    console.log('[AppDownload] Setting up recurring prompt every 60 seconds on route:', router.pathname);
    
    // Show the modal after 30 seconds initially
    const initialTimer = setTimeout(() => {
      console.log('[AppDownload] Showing initial modal');
      setShowAppDownloadModal(true);
    }, 30000); // 30 seconds

    // Then show it every 60 seconds
    const recurringTimer = setInterval(() => {
      console.log('[AppDownload] Showing recurring modal');
      setShowAppDownloadModal(true);
    }, 60000); // 60 seconds = 1 minute

    return () => {
      clearTimeout(initialTimer);
      clearInterval(recurringTimer);
    };
  }, [router.pathname, shouldShowAppDownload]);

  const handleDismissAppDownload = () => {
    // Just close the modal - it will show again after 1 minute
    setShowAppDownloadModal(false);
  };

  const handleOpenApp = () => {
    // Close the modal when user clicks to open app
    setShowAppDownloadModal(false);
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
