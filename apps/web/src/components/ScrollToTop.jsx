import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Rola apenas o conteúdo principal (main), não o window
    const mainContent = document.getElementById('main-content') || document.querySelector('main');
    if (mainContent) {
      mainContent.scrollTop = 0;
    }
    // Garante que o window não role
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
