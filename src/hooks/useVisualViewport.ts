import { useEffect, useState } from 'react';

/**
 * Tracks the visual viewport height (in pixels) for the current device.
 * When a virtual keyboard opens on mobile, the visual viewport shrinks,
 * which we use to anchor the app to the visible area so the composer
 * stays fixed at the bottom instead of jumping.
 */
export function useVisualViewport() {
  const [height, setHeight] = useState<number>(() =>
    typeof window === 'undefined' ? 0 : window.visualViewport?.height ?? window.innerHeight
  );

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      setHeight(vv.height);
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return height;
}
