import type { CSSProperties } from 'react';
import { ICONS, type AssetSource, type IconName } from './registry';

export type { IconName };

interface AvIconProps {
  name: IconName;
  /** Width and height. A number is px; the default `1em` follows the font size. */
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  /** Accessible label. Without it the icon is decorative (hidden from screen readers). */
  title?: string;
}

// Renders a registry icon: an inline SVG tinted by `currentColor`, or an image
// file when the registry entry was swapped for one (images keep their colours).
export default function AvIcon({ name, size = '1em', className = '', style, title }: AvIconProps) {
  const src: AssetSource = ICONS[name];
  const a11y = title
    ? ({ role: 'img', 'aria-label': title } as const)
    : ({ 'aria-hidden': true } as const);
  const cls = `av-icon ${className}`;

  if (src.kind === 'image') {
    return (
      // A plain <img>: icons are tiny static files sized in `em`, so the
      // next/image optimiser would add nothing.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src.src}
        alt={title ?? src.alt ?? ''}
        draggable={false}
        className={`${cls} object-contain`}
        style={{ width: size, height: size, ...style }}
        {...(title ? {} : { 'aria-hidden': true })}
      />
    );
  }

  const Svg = src.Component;
  return <Svg width={size} height={size} className={cls} style={style} {...a11y} />;
}
