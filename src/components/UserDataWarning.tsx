import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UserDataWarningProps {
  onClose?: () => void;
}

export const UserDataWarning: React.FC<UserDataWarningProps> = ({ onClose }) => {
  const navigate = useNavigate();

  const handleGoToSettings = () => {
    navigate('/settings');
    onClose?.();
  };

  return (
    <Card className="shadow-card border-warning/20 bg-warning/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-warning">
          <AlertTriangle className="w-5 h-5" />
          Configure seus dados pessoais
        </CardTitle>
        <CardDescription>
          Para processar pagamentos, precisamos que você configure seus dados pessoais nas configurações.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-warning/10 rounded-lg p-4">
          <h4 className="font-medium text-foreground mb-2">Dados necessários:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Nome completo</li>
            <li>• Email</li>
            <li>• CPF</li>
            <li>• Telefone (opcional)</li>
          </ul>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={handleGoToSettings} className="flex-1">
            <Settings className="w-4 h-4 mr-2" />
            Ir para Configurações
          </Button>
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Depois
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};