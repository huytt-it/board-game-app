import { Cormorant_Garamond } from 'next/font/google';

// Display font for Avalon headings (body text stays Inter). Cormorant Garamond
// ships a `vietnamese` subset; Cinzel does not, so it cannot be used.
// Apply `avalonDisplayFont.variable` on the `.avalon-root` wrapper, then use
// the `av-display` class (avalon.css) on headings.
export const avalonDisplayFont = Cormorant_Garamond({
  subsets: ['latin', 'vietnamese'],
  weight: ['600', '700'],
  display: 'swap',
  variable: '--av-font-display',
});
