import type { SVGProps } from 'react';

// Adapted from "Candle light" by Lorc — https://game-icons.net/1x1/lorc/candle-light.html
// (CC BY 3.0). Changes: the flame was removed and a wisp of smoke added above
// the wick (the smoke stroke is our own drawing).
export default function CandleOut(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 512 512" fill="currentColor" {...props}>
      <path d="M265.5 199.5l-18.5 2.7c5.7 39.3 6.6 69 4.2 97.8-24.9-.9-49.7-5.9-73.7-14.7v95.4c-3.3 25.7-22.4 30.6-22.1 53.5.3 19.6 15 26 22.1 17.6v36.3h164.7v-88.3c8.6 10.9 27.2 3 27.6-21.3.4-29.1-24.6-34.6-27.6-68.8V285.3c-23.9 8.9-48.1 13.7-72.3 14.7 2.3-29.8 1.4-60.8-4.4-100.5z" />
      <path
        d="M257 178c-26-26 24-48 0-78s-22-50 6-74"
        fill="none"
        stroke="currentColor"
        strokeWidth="16"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}
