import { 
  Wallet, Laptop, TrendingUp, Utensils, Car, ShoppingBag, 
  Zap, Film, Activity, Book, Plane, Home, 
  Briefcase, Coffee, Gift, Landmark, Smartphone, Wifi, 
  Dumbbell, GraduationCap, Globe, AlertCircle, PiggyBank, Tag
} from 'lucide-react';

const iconMap: Record<string, any> = {
  "Wallet": Wallet, "Laptop": Laptop, "TrendingUp": TrendingUp,
  "Utensils": Utensils, "Car": Car, "ShoppingBag": ShoppingBag,
  "Zap": Zap, "Film": Film, "Activity": Activity, "Book": Book,
  "Plane": Plane, "Home": Home, "Briefcase": Briefcase,
  "Coffee": Coffee, "Gift": Gift, "Landmark": Landmark,
  "Smartphone": Smartphone, "Wifi": Wifi, "Dumbbell": Dumbbell,
  "GraduationCap": GraduationCap, "Globe": Globe,
  "AlertCircle": AlertCircle, "PiggyBank": PiggyBank, "Tag": Tag
};

interface IconProps {
  iconName: string;
  size?: number;
  className?: string;
}

export const CategoryIcon = ({ iconName, size = 20, className = "" }: IconProps) => {
  const IconComponent = iconMap[iconName];

  if (IconComponent) {
    return <IconComponent size={size} className={className} />;
  }

  return (
    <span 
      className={`flex items-center justify-center ${className}`}
      style={{ 
        fontSize: size, 
        width: size, 
        height: size, 
        lineHeight: '1em',
        fontStyle: 'normal' 
      }}
    >
      {iconName || '?'}
    </span>
  );
};

export const availableIcons = Object.keys(iconMap);