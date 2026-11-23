type LogoProps = {
  size?: number;
};

/** Logo UniLaunch : une grille 2×2 dont un carré porte l'accent et un autre est le « bouton de lancement ». */
export function Logo({ size = 18 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="2" width="9" height="9" rx="2.5" fill="var(--ul-accent)" />
      <rect x="13" y="2" width="9" height="9" rx="2.5" fill="#3A3F4B" />
      <rect x="2" y="13" width="9" height="9" rx="2.5" fill="#3A3F4B" />
      <rect x="13" y="13" width="9" height="9" rx="4.5" fill="#ECEEF2" />
    </svg>
  );
}
