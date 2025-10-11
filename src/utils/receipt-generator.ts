import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import confallonyLogo from "@/assets/confallony-logo-main.png";

interface ReceiptData {
  id: string;
  servico_nome: string;
  preco: number;
  data: Date;
  funcionario_nome?: string;
  sala_atendimento?: string;
  forma_pagamento?: string;
  status: string;
}

export const generateReceipt = async (agendamento: ReceiptData): Promise<Blob | null> => {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = 600;
    canvas.height = 800;

    // Fundo
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Logo
    const logo = new Image();
    logo.crossOrigin = 'anonymous';
    logo.src = confallonyLogo;
    
    await new Promise((resolve) => {
      logo.onload = resolve;
    });
    
    const logoSize = 150;
    ctx.drawImage(logo, (canvas.width - logoSize) / 2, 30, logoSize, logoSize);

    // Título
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Comprovante de Agendamento', canvas.width / 2, 230);

    // Linha
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, 260);
    ctx.lineTo(canvas.width - 50, 260);
    ctx.stroke();

    // Informações
    ctx.textAlign = 'left';
    ctx.font = '18px Arial';
    let y = 310;

    const info = [
      { label: 'Serviço:', value: agendamento.servico_nome },
      { label: 'Data:', value: format(agendamento.data, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) },
      { label: 'Profissional:', value: agendamento.funcionario_nome || 'Não informado' },
      { label: 'Sala:', value: agendamento.sala_atendimento || 'Não informado' },
      { label: 'Pagamento:', value: agendamento.forma_pagamento || 'Não informado' },
      { label: 'Valor:', value: `R$ ${agendamento.preco.toFixed(2)}` },
      { label: 'Status:', value: agendamento.status === 'confirmado' ? 'Confirmado' : 'Aguardando' }
    ];

    info.forEach(item => {
      ctx.fillStyle = '#666666';
      ctx.font = 'bold 18px Arial';
      ctx.fillText(item.label, 50, y);
      ctx.fillStyle = '#000000';
      ctx.font = '18px Arial';
      ctx.fillText(item.value, 200, y);
      y += 40;
    });

    // Rodapé
    ctx.fillStyle = '#666666';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Obrigado por escolher Barbearia Confallony!', canvas.width / 2, 720);
    ctx.fillText(new Date().toLocaleString('pt-BR'), canvas.width / 2, 750);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      });
    });
  } catch (error) {
    console.error('Erro ao gerar comprovante:', error);
    return null;
  }
};

export const downloadReceipt = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
