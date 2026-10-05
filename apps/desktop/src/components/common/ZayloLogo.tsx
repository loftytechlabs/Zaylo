import React from 'react';
import logoUrl from '../../assets/logo.png';

interface ZayloLogoProps {
  className?: string;
  size?: number;
}

export const ZayloLogo: React.FC<ZayloLogoProps> = ({ className = 'w-6 h-6', size }) => {
  return (
    <img
      src={logoUrl}
      alt="Zaylo Logo"
      className={`${className} object-contain rounded-md`}
      style={size ? { width: size, height: size } : undefined}
    />
  );
};
