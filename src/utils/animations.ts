// Animation utility classes for consistent animations across the app

export const animations = {
  // Fade animations
  fadeIn: "animate-fade-in",
  fadeOut: "animate-fade-out",
  
  // Scale animations
  scaleIn: "animate-scale-in",
  scaleOut: "animate-scale-out",
  hover: "hover-scale transition-all duration-200",
  
  // Card animations
  card: "transition-all duration-300 hover:shadow-lg hover-scale",
  cardSubtle: "transition-all duration-300 hover:shadow-md",
  
  // Button animations
  button: "transition-all duration-200 hover-scale active:scale-95",
  
  // Loading animations
  pulse: "animate-pulse",
  spin: "animate-spin",
  
  // Container animations
  container: "animate-fade-in",
  stagger: (delay: number) => `animate-fade-in` // Could add custom delays
} as const;

export const getCardAnimation = (variant: "default" | "subtle" = "default") => {
  return variant === "subtle" ? animations.cardSubtle : animations.card;
};
