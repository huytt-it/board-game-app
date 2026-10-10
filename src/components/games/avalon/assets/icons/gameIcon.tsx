import type { SVGProps } from 'react';

export type SvgIconComponent = (props: SVGProps<SVGSVGElement>) => React.JSX.Element;

// Every game-icons.net icon is a single path in a 512×512 box. It is filled with
// `currentColor`, so the surrounding text colour tints it.
export function gameIcon(displayName: string, d: string): SvgIconComponent {
  function Icon(props: SVGProps<SVGSVGElement>) {
    return (
      <svg viewBox="0 0 512 512" fill="currentColor" {...props}>
        <path d={d} />
      </svg>
    );
  }
  Icon.displayName = displayName;
  return Icon;
}
