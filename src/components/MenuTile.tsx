import React, { useId } from 'react';

export type MenuTileIconType = 
  | 'recetas' 
  | 'pedidos' 
  | 'elaborados' 
  | 'platos' 
  | 'proveedores' 
  | 'ingredientes' 
  | 'menus'
  | 'trabajo';

export interface MenuTileProps {
  label: string;
  icon?: MenuTileIconType | React.ReactNode;
  bgColor?: string;
  iconColor?: string;
  className?: string;
  title?: string;
}

export default function MenuTile({
  label,
  icon = 'recetas',
  bgColor = '#9EC2DA',
  iconColor= 'white',
  className = 'w-40 h-40',
  title,
}: MenuTileProps) {
  const uniqueId = useId().replace(/:/g, '');
  const filterId = `menutile-shadow-${uniqueId}`;

  // Native SVG path definitions to ensure 100% vector sharpness and consistency
  const renderNativeIcon = () => {
    switch (icon) {
      case 'recetas':
        return (
          <g
            transform="translate(29, 18) scale(1.75)"
            stroke={iconColor}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          >
            {/* Chef hat outline matching the exact image */}
            <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
            <line x1="6" y1="17" x2="18" y2="17" />
          </g>
        );

      case 'pedidos':
        return (
          <g
            transform="translate(29, 22) scale(1.60)"
            stroke={iconColor}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          >
            {/* Shopping cart */}
            <circle cx="9" cy="20" r="1.5" fill={iconColor} />
            <circle cx="18" cy="20" r="1.5" fill={iconColor} />
            <path d="M1 1h4l2.68 12.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </g>
        );

      case 'elaborados':
        return (
          <g
            transform="translate(29, 18) scale(1.75)"
            stroke={iconColor}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          >
            {/* Book / Sub-recipes */}
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </g>
        );

      case 'platos':
        return (
          <g
            transform="translate(29, 18) scale(1.75)"
            stroke={iconColor}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          >
            {/* Crossed utensils / Plates */}
            <path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8" />
            <path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7" />
            <path d="m2.1 21.8 6.4-6.3" />
            <path d="m19 5-7 7" />
          </g>
        );

      case 'proveedores':
        return (
          <g
            transform="translate(29, 18) scale(1.75)"
            stroke={iconColor}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          >
            {/* Truck / Delivery */}
            <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
            <path d="M15 18H9" />
            <path d="M19 18h2a1 1 0 0 0 1-1v-5l-4-4h-4v10" />
            <circle cx="7" cy="18" r="2" />
            <circle cx="17" cy="18" r="2" />
          </g>
        );

      case 'ingredientes':
        return (
          <g
            transform="translate(29, 18) scale(1.75)"
            stroke={iconColor}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          >
            {/* Apple / Ingredient */}
            <path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z" />
            <path d="M10 2c1 .5 2 2 2 5" />
          </g>
        );

      case 'menus':
        return (
          <g
            transform="translate(29, 18) scale(1.75)"
            stroke={iconColor}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          >
            {/* Utensils / Menu */}
            <path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2" />
            <path d="M15 11v11" />
            <path d="M5 2v20" />
            <path d="M2 2h6a3 3 0 0 1 3 3v2a3 3 0 0 1-3 3H2V2z" />
          </g>
        );

      case 'trabajo':
        return (
          <g
            transform="translate(29, 18) scale(1.75)"
            stroke={iconColor}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          >
            {/* Clipboard list */}
            <rect width="14" height="18" x="5" y="4" rx="2" />
            <path d="M9 2h6v4H9z" />
            <path d="M9 10h6" />
            <path d="M9 14h4" />
          </g>
        );

      default:
        return null;
    }
  };

  const isCustomIcon = typeof icon !== 'string';

  return (
    <div
      className={`inline-block select-none transition-transform duration-200 hover:scale-105 active:scale-95 ${className}`}
      title={title || label}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full drop-shadow-md overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id={filterId} x="-15%" y="-10%" width="130%" height="135%">
            <feDropShadow
              dx="0"
              dy="5"
              stdDeviation="4"
              floodColor="#073b39"
              floodOpacity="0.25"
            />
          </filter>
        </defs>

        {/* Squircle / Rounded card background */}
        <rect
          x="6"
          y="5"
          width="88"
          height="88"
          rx="22"
          fill={bgColor}
          filter={`url(#${filterId})`}
        />

        {/* Central Icon */}
        {!isCustomIcon ? (
          renderNativeIcon()
        ) : (
          <foreignObject x="12" y="16" width="76" height="42">
            <div className="w-full h-full flex items-center justify-center text-white">
              {icon}
            </div>
          </foreignObject>
        )}

        {/* Label text at the bottom */}
        <text
          x="50"
          y="79"
          textAnchor="middle"
          fill={iconColor}
          fontSize="10"
          fontWeight="700"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          letterSpacing="0.09em"
        >
          {label}
        </text>
      </svg>
    </div>
  );
}
