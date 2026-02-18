/**
 * CIE Corporate Colors
 * Colores oficiales de la marca CIE Corpoindustrial
 */

export const CIE_COLORS = {
  // Colores principales
  green: '#008845',
  yellow: '#d8ae11',
  
  // Variantes de verde
  greenLight: '#00a855',
  greenDark: '#006633',
  
  // Variantes de amarillo
  yellowLight: '#f0c030',
  yellowDark: '#b89510',
} as const;

/**
 * Clases de Tailwind CSS para usar los colores CIE
 * 
 * Ejemplos de uso:
 * 
 * Backgrounds:
 *   - bg-primary → Verde #008845
 *   - bg-secondary → Amarillo #d8ae11
 *   - bg-cie-green → Verde directo
 *   - bg-cie-yellow → Amarillo directo
 * 
 * Texto:
 *   - text-primary → Verde #008845
 *   - text-secondary → Amarillo #d8ae11
 *   - text-cie-green → Verde directo
 *   - text-cie-yellow → Amarillo directo
 * 
 * Bordes:
 *   - border-primary → Verde #008845
 *   - border-secondary → Amarillo #d8ae11
 *   - border-cie-green → Verde directo
 *   - border-cie-yellow → Amarillo directo
 * 
 * Gradientes:
 *   - from-cie-green to-cie-yellow
 *   - from-primary to-secondary
 * 
 * Hover:
 *   - hover:bg-cie-green
 *   - hover:text-cie-yellow
 */
export const CIE_TAILWIND_CLASSES = {
  // Backgrounds
  bgGreen: 'bg-primary hover:bg-primary/90',
  bgYellow: 'bg-secondary hover:bg-secondary/90',
  bgGreenDirect: 'bg-cie-green hover:bg-cie-green/90',
  bgYellowDirect: 'bg-cie-yellow hover:bg-cie-yellow/90',
  
  // Texto
  textGreen: 'text-primary',
  textYellow: 'text-secondary',
  textGreenDirect: 'text-cie-green',
  textYellowDirect: 'text-cie-yellow',
  
  // Botones primarios
  btnPrimary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md',
  btnSecondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-md',
  
  // Bordes
  borderGreen: 'border-primary',
  borderYellow: 'border-secondary',
  
  // Gradientes
  gradientGreenYellow: 'bg-gradient-to-r from-cie-green to-cie-yellow',
  gradientGreenDark: 'bg-gradient-to-br from-cie-green via-cie-green/90 to-cie-green/80',
} as const;

export type CIEColor = keyof typeof CIE_COLORS;
export type CIETailwindClass = keyof typeof CIE_TAILWIND_CLASSES;
