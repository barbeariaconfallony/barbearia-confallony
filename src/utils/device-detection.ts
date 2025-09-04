// Utility functions for device detection

export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check screen size
  const screenSize = window.innerWidth <= 768;
  
  // Check user agent for mobile devices
  const userAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  
  // Check if device has touch support
  const touchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  return screenSize || userAgent || (touchDevice && window.innerWidth <= 1024);
};

export const isTablet = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const width = window.innerWidth;
  return width >= 768 && width <= 1024;
};

export const isDesktop = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return window.innerWidth > 1024 && !isMobile();
};

export const hasFullscreenAPI = (): boolean => {
  if (typeof document === 'undefined') return false;
  
  return !!(
    document.fullscreenEnabled ||
    (document as any).webkitFullscreenEnabled ||
    (document as any).mozFullScreenEnabled ||
    (document as any).msFullscreenEnabled
  );
};

export const shouldShowFullscreenButton = (): boolean => {
  return isDesktop() && hasFullscreenAPI() && !isMobile();
};