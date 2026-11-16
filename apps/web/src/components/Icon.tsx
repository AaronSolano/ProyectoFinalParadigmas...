import type { ReactNode, SVGProps } from 'react';

type IconName =
  | 'arrow'
  | 'book'
  | 'play'
  | 'eye'
  | 'eyeOff'
  | 'plus'
  | 'paw'
  | 'check'
  | 'close';

export function Icon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    arrow: (
      <>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    book: (
      <>
        <path d="M12 5v15M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2z" />
      </>
    ),
    play: <path d="m9 5 11 7-11 7z" />,
    eye: (
      <>
        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    eyeOff: (
      <>
        <path d="m3 3 18 18M10 5a12 12 0 0 1 12 7 18 18 0 0 1-4 4M6 6a18 18 0 0 0-4 6s4 7 10 7a11 11 0 0 0 5-1" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    paw: (
      <>
        <ellipse cx="5" cy="9" rx="2" ry="3" />
        <ellipse cx="10" cy="5" rx="2" ry="3" />
        <ellipse cx="16" cy="5" rx="2" ry="3" />
        <ellipse cx="21" cy="10" rx="2" ry="3" />
        <path d="M6 18c0-3 4-7 7-7s6 4 6 7c0 4-4 3-6 2-3 1-7 2-7-2Z" />
      </>
    ),
  };
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
