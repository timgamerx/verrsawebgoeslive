import React from 'react';
import '../styles/index.css';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeProvider';
import { BookmarkProvider } from '../context/BookmarkProvider';
import { LiveStreamProvider } from '../context/LiveStreamProvider';
import { HelmetProvider } from 'react-helmet-async';
import { useRouter } from 'next/router';
import MainTab from '../components/maintab';
import Menu from './menu';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
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
              </div>
              {showMainTabs && <MainTab />}
            </LiveStreamProvider>
          </BookmarkProvider>
        </AuthProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default MyApp;
