type IconProps = { size?: number };

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconMenu({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base}>
      <line x1="3" y1="6" x2="17" y2="6" />
      <line x1="3" y1="10" x2="17" y2="10" />
      <line x1="3" y1="14" x2="17" y2="14" />
    </svg>
  );
}

export function IconClose({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base}>
      <line x1="5" y1="5" x2="15" y2="15" />
      <line x1="15" y1="5" x2="5" y2="15" />
    </svg>
  );
}

export function IconHome({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base}>
      <path d="M3 9.5 10 3l7 6.5" />
      <path d="M5 8.5V17h10V8.5" />
    </svg>
  );
}

export function IconPlay({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base}>
      <circle cx="10" cy="10" r="7" />
      <path d="M8.3 6.8v6.4l5-3.2z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconHistory({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base}>
      <circle cx="10" cy="10.5" r="6.5" />
      <path d="M10 7v3.5l2.6 1.6" />
      <path d="M6 3.2 3.5 5.5" />
    </svg>
  );
}

export function IconUser({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base}>
      <circle cx="10" cy="6.8" r="3.3" />
      <path d="M3.5 17c1-3.6 4-5.4 6.5-5.4S15.5 13.4 16.5 17" />
    </svg>
  );
}

export function IconTrophy({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base}>
      <path d="M6.5 3.5h7v4.2a3.5 3.5 0 0 1-7 0z" />
      <path d="M6.5 4.5H4a2 2 0 0 0 2.8 3.5" />
      <path d="M13.5 4.5H16a2 2 0 0 1-2.8 3.5" />
      <path d="M10 11.7v2.6" />
      <path d="M7 16.5h6" />
      <path d="M8.3 14.3h3.4l.3 2.2H8z" />
    </svg>
  );
}

export function IconSettings({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base}>
      <circle cx="10" cy="10" r="2.6" />
      <path d="M10 3.3v1.8M10 14.9v1.8M16.7 10h-1.8M5.1 10H3.3M14.7 5.3l-1.3 1.3M6.6 13.4l-1.3 1.3M14.7 14.7l-1.3-1.3M6.6 6.6 5.3 5.3" />
    </svg>
  );
}

export function IconLogout({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base}>
      <path d="M8 3.5H4.5v13H8" />
      <path d="M8.5 10H17" />
      <path d="M13.7 6.5 17 10l-3.3 3.5" />
    </svg>
  );
}

export function IconCheck({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...base} strokeWidth={1.7}>
      <polyline points="3 8.3 6.4 11.7 13 4.3" />
    </svg>
  );
}

export function IconAlert({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...base}>
      <path d="M8 2.2 14.3 13.4 1.7 13.4Z" />
      <line x1="8" y1="6.4" x2="8" y2="9.6" />
      <circle cx="8" cy="11.5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconInfo({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="8" cy="8" r="6.2" />
      <line x1="8" y1="7.1" x2="8" y2="11.2" strokeLinecap="round" />
      <circle cx="8" cy="4.8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconX({ size = 13 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 13 13" {...base} strokeWidth={1.6}>
      <line x1="2.5" y1="2.5" x2="10.5" y2="10.5" />
      <line x1="10.5" y1="2.5" x2="2.5" y2="10.5" />
    </svg>
  );
}

export function IconPlus({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" {...base} strokeWidth={1.8}>
      <line x1="7" y1="2" x2="7" y2="12" />
      <line x1="2" y1="7" x2="12" y2="7" />
    </svg>
  );
}
