/**
 * Test Utility for App Download Modal
 * 
 * To test the modal in your browser console, run:
 * 
 * 1. To reset and show the modal immediately:
 *    window.testAppDownloadModal()
 * 
 * 2. To check current status:
 *    window.checkAppDownloadStatus()
 * 
 * 3. To reset tracking:
 *    window.resetAppDownloadTracking()
 */

import { resetAppDownloadPromptTracking } from './appDownloadPromptManager';

declare global {
  interface Window {
    testAppDownloadModal: () => void;
    checkAppDownloadStatus: () => void;
    resetAppDownloadTracking: () => void;
  }
}

export const setupAppDownloadModalTesting = () => {
  if (typeof window === 'undefined') return;

  // Function to manually trigger the modal
  window.testAppDownloadModal = () => {
    console.log('[Test] Resetting app download tracking...');
    resetAppDownloadPromptTracking();
    console.log('[Test] Reloading page to trigger modal...');
    window.location.reload();
  };

  // Function to check current status
  window.checkAppDownloadStatus = () => {
    const sessionShown = sessionStorage.getItem('app_download_prompt_shown');
    const dismissed = localStorage.getItem('app_download_prompt_dismissed');
    
    console.log('=== App Download Modal Status ===');
    console.log('Session shown:', sessionShown ? new Date(parseInt(sessionShown)).toLocaleString() : 'No');
    console.log('Dismissed:', dismissed ? new Date(parseInt(dismissed)).toLocaleString() : 'No');
    console.log('User Agent:', navigator.userAgent);
    
    // Check device type
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isAndroid = /android/i.test(navigator.userAgent);
    console.log('Is iOS:', isIOS);
    console.log('Is Android:', isAndroid);
    console.log('Is Mobile:', isIOS || isAndroid);
    console.log('================================');
  };

  // Function to reset tracking
  window.resetAppDownloadTracking = () => {
    console.log('[Test] Resetting tracking...');
    resetAppDownloadPromptTracking();
    console.log('[Test] Tracking reset! Reload the page to see the modal after 30 seconds.');
  };

  console.log('[Test] App Download Modal testing utilities loaded!');
  console.log('[Test] Available commands:');
  console.log('  - window.testAppDownloadModal() - Reset and reload to trigger modal');
  console.log('  - window.checkAppDownloadStatus() - Check current status');
  console.log('  - window.resetAppDownloadTracking() - Reset tracking only');
};
