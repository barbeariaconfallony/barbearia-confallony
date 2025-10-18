import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Package } from 'lucide-react';
import { useEstoque } from '@/hooks/useEstoque';
import { ScrollArea } from '@/components/ui/scroll-area';

export const AlertaEstoqueBaixo: React.FC = () => {
  const { produtosEstoqueBaixo, loading } = useEstoque();

  if (loading) {
    return null;
  }

  if (produtosEstoqueBaixo.length === 0) {
    return null;
  }

  return (
    <Card className="border-yellow-500/50 bg-yellow-500/5 animate-pulse">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-yellow-700 dark:text-yellow-500">
          <AlertTriangle className="h-5 w-5" />
          Alertas de Estoque ({produtosEstoqueBaixo.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[120px]">
          <div className="space-y-2">
            {produtosEstoqueBaixo.map((produto) => (
              <div 
                key={produto.id} 
                className="flex items-center justify-between p-2 bg-background rounded-lg border border-yellow-500/20 hover:bg-yellow-500/5 transition-colors"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Package className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{produto.produto_nome}</p>
                    <p className="text-xs text-muted-foreground">
                      Mínimo: {produto.quantidade_minima} {produto.unidade}
                    </p>
                  </div>
                </div>
                <Badge 
                  variant="destructive" 
                  className="ml-2 flex-shrink-0 bg-yellow-600 hover:bg-yellow-700"
                >
                  {produto.quantidade_disponivel} {produto.unidade}
                </Badge>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
