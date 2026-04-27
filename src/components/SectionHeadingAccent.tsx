type SectionHeadingAccentProps = {
  align?: 'left' | 'center';
  /** `dark` for purple CTA / high-contrast backgrounds */
  theme?: 'light' | 'dark';
  /** `brand` = stronger bar + ring (e.g. Why Choose section) */
  variant?: 'default' | 'brand';
  className?: string;
};

export function SectionHeadingAccent({
  align = 'center',
  theme = 'light',
  variant = 'default',
  className = '',
}: SectionHeadingAccentProps) {
  const lightBar =
    variant === 'brand'
      ? 'h-1.5 w-28 rounded-full bg-gradient-to-r from-purple-900 via-purple-700 to-pink-500 shadow-md shadow-purple-900/25 ring-1 ring-pink-500/30'
      : 'h-1 w-20 rounded-full bg-gradient-to-r from-purple-800 via-purple-600 to-pink-500 shadow-sm shadow-purple-900/20';
  const darkBar =
    'h-1 w-20 rounded-full bg-gradient-to-r from-white/60 via-pink-300 to-fuchsia-200 shadow-sm shadow-black/20';

  return (
    <div
      className={`mt-4 ${theme === 'light' ? lightBar : darkBar} ${align === 'center' ? 'mx-auto' : ''} ${className}`.trim()}
      aria-hidden
    />
  );
}
