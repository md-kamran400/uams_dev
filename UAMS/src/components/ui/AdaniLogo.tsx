interface AdaniLogoProps {
  className?: string;
  /** 'color' shows the real gradient logo; 'white' inverts it for dark backgrounds */
  variant?: 'color' | 'white';
}

export default function AdaniLogo({ className = '', variant = 'color' }: AdaniLogoProps) {
  return (
    <img
      src="/adani-logo.svg"
      alt="Adani"
      className={className}
      style={variant === 'white' ? { filter: 'brightness(0) invert(1)' } : undefined}
    />
  );
}
