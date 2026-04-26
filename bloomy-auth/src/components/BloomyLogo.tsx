import { useId } from "react";

function BloomyLogo({ className = "bloomy-logo-svg" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  const tealId = `${id}-bloomy-teal`;
  const warmId = `${id}-bloomy-warm`;

  return (
    <svg className={className} viewBox="0 0 48 48" role="img" aria-label="Bloomy logo">
      <defs>
        <linearGradient id={tealId} x1="9" y1="8" x2="39" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#56bfb6" />
          <stop offset="1" stopColor="#0f766e" />
        </linearGradient>
        <linearGradient id={warmId} x1="15" y1="11" x2="35" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f4d35e" />
          <stop offset="1" stopColor="#e88c2d" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="white" />
      <circle cx="24" cy="24" r="20" fill="#edf9f7" stroke="#b8ddd8" strokeWidth="1.5" />
      <path d="M24 9.5c4.7 3.9 7 8.1 7 12.5 0 4.5-2.6 7.4-7 7.4s-7-2.9-7-7.4c0-4.4 2.3-8.6 7-12.5Z" fill={`url(#${tealId})`} />
      <path d="M12.4 24.2c5.8-1.9 10.5-1.8 14.1.4 3.9 2.3 4.9 6.1 2.7 9.9-2.2 3.8-6 4.8-9.9 2.5-3.7-2.1-6-6.4-6.9-12.8Z" fill={`url(#${warmId})`} opacity="0.95" />
      <path d="M35.6 24.2c-.9 6.4-3.2 10.7-6.9 12.8-3.9 2.3-7.7 1.3-9.9-2.5-2.2-3.8-1.2-7.6 2.7-9.9 3.6-2.2 8.3-2.3 14.1-.4Z" fill={`url(#${warmId})`} opacity="0.78" />
      <circle cx="24" cy="24.2" r="5.2" fill="white" opacity="0.92" />
      <path d="M24 19.7a4.5 4.5 0 0 1 4.5 4.5c0 3.2-4.5 7.5-4.5 7.5s-4.5-4.3-4.5-7.5a4.5 4.5 0 0 1 4.5-4.5Z" fill="#24556d" />
      <circle cx="24" cy="24.1" r="1.7" fill="white" />
    </svg>
  );
}

export default BloomyLogo;
