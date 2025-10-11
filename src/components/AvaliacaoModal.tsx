import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

interface AvaliacaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agendamentoId: string;
  usuarioId: string;
  usuarioNome: string;
  servicoNome: string;
}

export const AvaliacaoModal = ({ 
  open, 
  onOpenChange, 
  agendamentoId, 
  usuarioId,
  usuarioNome,
  servicoNome 
}: AvaliacaoModalProps) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSaveRating = async () => {
    if (rating === 0) {
      toast({
        title: "Selecione uma avaliação",
        description: "Por favor, escolha de 1 a 5 estrelas",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, "avaliacoes"), {
        agendamento_id: agendamentoId,
        usuario_id: usuarioId,
        usuario_nome: usuarioNome,
        servico_nome: servicoNome,
        avaliacao: rating,
        data_avaliacao: new Date(),
        timestamp: Date.now()
      });

      toast({
        title: "Avaliação enviada!",
        description: `Obrigado por avaliar nosso serviço com ${rating} estrela${rating > 1 ? 's' : ''}!`
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao salvar avaliação:", error);
      toast({
        title: "Erro ao salvar avaliação",
        description: "Tente novamente mais tarde",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">Como foi seu atendimento?</DialogTitle>
          <DialogDescription className="text-center">
            Avalie sua experiência com {servicoNome}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-2 py-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`h-10 w-10 ${
                  star <= (hoveredRating || rating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground"
                }`}
              />
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <Button 
            onClick={handleSaveRating} 
            disabled={saving || rating === 0}
            className="w-full"
          >
            {saving ? "Enviando..." : "Enviar Avaliação"}
          </Button>
          <Button 
            variant="ghost" 
            onClick={handleSkip}
            className="w-full"
          >
            Não avaliar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
