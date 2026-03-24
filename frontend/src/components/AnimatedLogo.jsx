import { useState, useEffect } from "react";

const AnimatedLogo = ({ size = "large" }) => {
  const [phase, setPhase] = useState(0);
  // Phase 0: Show "LD"
  // Phase 1: "Holdings" slides out
  // Phase 2: "Holdings" visible
  // Phase 3: "Holdings" slides back
  // Phase 4: "Finance" slides out
  // Phase 5: "Finance" stays

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800),
      setTimeout(() => setPhase(2), 1800),
      setTimeout(() => setPhase(3), 3600),
      setTimeout(() => setPhase(4), 4600),
      setTimeout(() => setPhase(5), 5600),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const isLarge = size === "large";
  const ldSize = isLarge ? "text-5xl sm:text-6xl lg:text-7xl" : "text-2xl";
  const subSize = isLarge ? "text-lg sm:text-xl" : "text-[10px]";

  const getSubText = () => {
    if (phase >= 4) return "Finance";
    if (phase >= 1 && phase <= 2) return "Holdings";
    if (phase === 3) return "Holdings";
    return "";
  };

  const isVisible = phase === 1 || phase === 2 || phase === 4 || phase === 5;
  const isSliding = phase === 1 || phase === 3 || phase === 4;

  return (
    <div className="flex items-baseline gap-0 overflow-hidden" data-testid="animated-logo">
      <span
        className={`text-[#D4AF37] font-bold ${ldSize}`}
        style={{ fontFamily: "Playfair Display, serif" }}
      >
        LD
      </span>
      <span
        className={`font-medium text-white ${subSize} whitespace-nowrap`}
        style={{
          fontFamily: "Inter, sans-serif",
          display: "inline-block",
          overflow: "hidden",
          maxWidth: isVisible ? (isLarge ? "200px" : "80px") : "0px",
          opacity: isVisible ? 1 : 0,
          transition: "max-width 0.8s ease, opacity 0.6s ease",
          marginLeft: isVisible ? (isLarge ? "6px" : "3px") : "0px",
        }}
      >
        {getSubText()}
      </span>
    </div>
  );
};

export default AnimatedLogo;
