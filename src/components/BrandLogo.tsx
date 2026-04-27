/** Point `LOGO_SRC` at `public/jm-heating-logo.png` (replace file when client supplies new art). */
const LOGO_SRC = '/jm-heating-logo.png';

type BrandLogoProps = {
  className?: string;
  size?: 'nav' | 'footer';
};

export function BrandLogo({ className = '', size = 'nav' }: BrandLogoProps) {
  const height = size === 'nav' ? 'h-9 sm:h-10' : 'h-12 sm:h-14';
  return (
    <img
      src={LOGO_SRC}
      alt="JM Heating Services"
      className={`w-auto max-w-[200px] sm:max-w-[220px] object-contain object-left ${height} ${className}`}
      width={220}
      height={48}
      loading="eager"
      decoding="async"
    />
  );
}
