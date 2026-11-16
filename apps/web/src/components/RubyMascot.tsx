import type { CSSProperties } from 'react';

export type RubyMood =
  | 'welcome'
  | 'idle'
  | 'cheer'
  | 'think'
  | 'celebrate'
  | 'empathy'
  | 'surprised'
  | 'motivate'
  | 'sad';

/** Measured row viewports keep neighbouring poses outside the visible frame. */
export function RubyMascot({
  mood = 'welcome',
  className = '',
  label,
}: {
  mood?: RubyMood;
  className?: string;
  label?: string;
}) {
  const positions: Record<RubyMood, string> = {
    welcome: '0% 0%',
    idle: '50% 0%',
    cheer: '100% 0%',
    think: '0% 46.0449%',
    celebrate: '50% 46.0449%',
    empathy: '100% 46.0449%',
    surprised: '0% 94.451%',
    motivate: '50% 94.451%',
    sad: '100% 94.451%',
  };
  return (
    <span
      className={`ruby-mascot ruby-mascot--${mood} ${className}`}
      style={{ backgroundPosition: positions[mood] } as CSSProperties}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
