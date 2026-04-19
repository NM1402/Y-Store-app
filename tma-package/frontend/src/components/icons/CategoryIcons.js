import React from 'react';

/**
 * Simple geometric category icons matching the design from screenshots
 * These icons use a box/package theme with different variations
 */

export const BoxIcon = ({ className = "w-6 h-6", color = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M21 16V8C21 7.45 20.55 7 20 7H4C3.45 7 3 7.45 3 8V16C3 16.55 3.45 17 4 17H20C20.55 17 21 16.55 21 16Z" 
      stroke={color} 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <path 
      d="M3 10H21M3 13H21" 
      stroke={color} 
      strokeWidth="1.5" 
      strokeLinecap="round"
    />
  </svg>
);

export const LayeredBoxIcon = ({ className = "w-6 h-6", color = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M20 7L12 3L4 7L12 11L20 7Z" 
      stroke={color} 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <path 
      d="M4 12L12 16L20 12" 
      stroke={color} 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <path 
      d="M4 17L12 21L20 17" 
      stroke={color} 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

export const PackageIcon = ({ className = "w-6 h-6", color = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M12 2L2 7L12 12L22 7L12 2Z" 
      stroke={color} 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <path 
      d="M2 17L12 22L22 17" 
      stroke={color} 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <path 
      d="M2 12L12 17L22 12" 
      stroke={color} 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <path 
      d="M12 12V22" 
      stroke={color} 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

export const CubeIcon = ({ className = "w-6 h-6", color = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M21 8V16C21 16.55 20.55 17 20 17H4C3.45 17 3 16.55 3 16V8C3 7.45 3.45 7 4 7H20C20.55 7 21 7.45 21 8Z" 
      stroke={color} 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <path 
      d="M12 7V17M3 10H21" 
      stroke={color} 
      strokeWidth="1.5" 
      strokeLinecap="round"
    />
  </svg>
);

export const CircleDialIcon = ({ className = "w-6 h-6", color = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle 
      cx="12" 
      cy="12" 
      r="9" 
      stroke={color} 
      strokeWidth="1.5"
    />
    <path 
      d="M12 6V12L15 15" 
      stroke={color} 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

export const StackIcon = ({ className = "w-6 h-6", color = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect 
      x="3" 
      y="5" 
      width="18" 
      height="4" 
      rx="1" 
      stroke={color} 
      strokeWidth="1.5"
    />
    <rect 
      x="3" 
      y="11" 
      width="18" 
      height="4" 
      rx="1" 
      stroke={color} 
      strokeWidth="1.5"
    />
    <rect 
      x="3" 
      y="17" 
      width="18" 
      height="4" 
      rx="1" 
      stroke={color} 
      strokeWidth="1.5"
    />
  </svg>
);

export const GridBoxIcon = ({ className = "w-6 h-6", color = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect 
      x="3" 
      y="3" 
      width="8" 
      height="8" 
      rx="1" 
      stroke={color} 
      strokeWidth="1.5"
    />
    <rect 
      x="13" 
      y="3" 
      width="8" 
      height="8" 
      rx="1" 
      stroke={color} 
      strokeWidth="1.5"
    />
    <rect 
      x="3" 
      y="13" 
      width="8" 
      height="8" 
      rx="1" 
      stroke={color} 
      strokeWidth="1.5"
    />
    <rect 
      x="13" 
      y="13" 
      width="8" 
      height="8" 
      rx="1" 
      stroke={color} 
      strokeWidth="1.5"
    />
  </svg>
);

export const ContainerIcon = ({ className = "w-6 h-6", color = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M4 8H20V18C20 18.55 19.55 19 19 19H5C4.45 19 4 18.55 4 18V8Z" 
      stroke={color} 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <path 
      d="M8 8V5C8 4.45 8.45 4 9 4H15C15.55 4 16 4.45 16 5V8" 
      stroke={color} 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <path 
      d="M4 11H20M4 14H20" 
      stroke={color} 
      strokeWidth="1.5" 
      strokeLinecap="round"
    />
  </svg>
);

// Icon mapping
export const categoryIcons = {
  'box': { component: BoxIcon, label: 'Коробка' },
  'layered-box': { component: LayeredBoxIcon, label: 'Багатошарова коробка' },
  'package': { component: PackageIcon, label: 'Пакунок' },
  'cube': { component: CubeIcon, label: 'Куб' },
  'circle-dial': { component: CircleDialIcon, label: 'Циферблат' },
  'stack': { component: StackIcon, label: 'Стік' },
  'grid-box': { component: GridBoxIcon, label: 'Сітка' },
  'container': { component: ContainerIcon, label: 'Контейнер' }
};

export const getCategoryIcon = (iconName) => {
  return categoryIcons[iconName] || categoryIcons['box'];
};
