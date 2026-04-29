import { useEffect, useRef } from 'react';

const AppleGlow = ({ borderWidth = 3, glowSize = 60, speed = 3 }) => {
  const sharpRef = useRef(null);
  const glowRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const sharp = sharpRef.current;
    const glow = glowRef.current;
    if (!sharp || !glow) return;

    const draw = (t) => {
      const angle = (t * 0.001 * speed * 36) % 360;
      const grad = `conic-gradient(from ${angle}deg, #ff6b35, #ff2d55, #af52de, #5856d6, #007aff, #5ac8fa, #34c759, #ffcc00, #ff9500, #ff6b35)`;
      sharp.style.backgroundImage = grad;
      glow.style.backgroundImage = grad;
      animRef.current = requestAnimationFrame(draw);
    };
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [speed]);

  return (
    <>
      <div
        ref={glowRef}
        className="absolute pointer-events-none"
        style={{
          inset: `-${glowSize / 2}px`,
          filter: `blur(${glowSize}px)`,
          opacity: 0.5,
        }}
      />
      <div
        ref={sharpRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          padding: `${borderWidth}px`,
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
        }}
      />
    </>
  );
};

export default AppleGlow;
