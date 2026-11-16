import { useEffect, useState } from 'react';
import { isSoundMuted } from './soundEngine';

export function useSoundMuted() {
  const [muted, setMuted] = useState(isSoundMuted);
  useEffect(() => {
    const sync = () => setMuted(isSoundMuted());
    window.addEventListener('sound-preference-change', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('sound-preference-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return muted;
}
