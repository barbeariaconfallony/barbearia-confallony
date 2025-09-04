import { useTheme, Theme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Monitor, Moon, Palette } from 'lucide-react';

const themeIcons = {
  light: Monitor,
  dark: Moon,
  purple: Palette,
};

const themeLabels = {
  light: 'Claro',
  dark: 'Escuro', 
  purple: 'Roxo',
};

export const ThemeSelector = () => {
  const { theme, changeTheme, loading } = useTheme();

  if (loading) return null;

  const CurrentIcon = themeIcons[theme];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <CurrentIcon className="h-4 w-4" />
          <span className="sr-only">Trocar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[120px]">
        {(Object.keys(themeLabels) as Theme[]).map((themeName) => {
          const Icon = themeIcons[themeName];
          return (
            <DropdownMenuItem
              key={themeName}
              onClick={() => changeTheme(themeName)}
              className={`cursor-pointer ${theme === themeName ? 'bg-accent' : ''}`}
            >
              <Icon className="mr-2 h-4 w-4" />
              {themeLabels[themeName]}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};