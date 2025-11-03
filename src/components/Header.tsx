import React from 'react';
import { Button } from '@/components/ui/button';
import { Settings, Home } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import logoWhite from '@/assets/confallony-logo-white.png';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={logoWhite} 
              alt="Confallony Barbearia Logo" 
              className="h-12 w-auto"
              style={{
                filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))'
              }}
            />
          </div>

          <nav className="flex items-center gap-2">
            {location.pathname !== '/' && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/')}
                className="flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Início
              </Button>
            )}
            
            {location.pathname !== '/settings' && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/settings')}
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Configurações
              </Button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};