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
  
  // Routes where app download modal should appear
  const appDownloadRoutes = ['/home', '/articles', '/Podcasts', '/Reels', '/profile', '/user/[userId]'];
  const shouldShowAppDownload = appDownloadRoutes.includes(router.pathname);

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

  // App Download Prompt Logic
  useEffect(() => {
    // Only show on specific routes
    if (!shouldShowAppDownload) {
      console.log('[AppDownload] Not on a route that shows app download modal');
      return;
    }

    // Check if we should show the prompt
    if (!shouldShowAppDownloadPrompt()) {
      console.log('[AppDownload] Prompt already shown or dismissed, skipping');
      return;
    }

    console.log('[AppDownload] Will show prompt in 30 seconds on route:', router.pathname);
    
    // Set a timer to show the modal after 30 seconds
    const timer = setTimeout(() => {
      console.log('[AppDownload] Showing modal now');
      setShowAppDownloadModal(true);
      markAppDownloadPromptShown();
    }, getPromptDelay());

    return () => clearTimeout(timer);
  }, [router.pathname, shouldShowAppDownload]);

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
