import { useEffect, useState, useRef } from 'react';

const LockdownMode = ({ onTabSwitch, onWarning }) => {
  const [violationCount, setViolationCount] = useState(0);
  const fullscreenActive = useRef(false);

  useEffect(() => {
    const handleViolation = (reason) => {
      const newCount = violationCount + 1;
      setViolationCount(newCount);
      onTabSwitch(newCount, reason);

      if (newCount < 5) {
        onWarning(`Warning: ${reason}. Violation ${newCount}/5 before automated extraction.`);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation('Tab switch detected');
      }
    };

    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        fullscreenActive.current = true;
      } else if (fullscreenActive.current) {
        handleViolation('Exited fullscreen');
      }
    };

    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      onWarning('Back navigation is disabled.');
    };

    const handleCopy = (e) => { e.preventDefault(); onWarning('Copy-paste disabled.'); };
    const handlePaste = (e) => { e.preventDefault(); onWarning('Copy-paste disabled.'); };
    const handleContextMenu = (e) => { e.preventDefault(); onWarning('Right-click disabled.'); };
    const handleKeyDown = (e) => {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        e.preventDefault();
        onWarning('Developer tools disabled.');
      }
    };

    window.history.pushState(null, '', window.location.href);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('popstate', handlePopState);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [violationCount, onTabSwitch, onWarning]);

  return null;
};

export default LockdownMode;
