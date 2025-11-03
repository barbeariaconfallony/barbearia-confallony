import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TermosUsoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TermosUsoModal = ({ open, onOpenChange }: TermosUsoModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-primary">
            Termos de Uso - Confallony
          </DialogTitle>
          <DialogDescription>
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6 text-sm">
            <section>
              <h3 className="font-semibold text-lg mb-2">1. Aceitação dos Termos</h3>
              <p className="text-muted-foreground">
                Ao acessar e utilizar a plataforma Confallony, você concorda em cumprir e estar vinculado 
                aos seguintes termos e condições de uso. Se você não concordar com qualquer parte destes 
                termos, não deverá utilizar nossos serviços.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">2. Descrição dos Serviços</h3>
              <p className="text-muted-foreground mb-2">
                A Confallony é uma plataforma digital que oferece:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Sistema de agendamento online de serviços de barbearia</li>
                <li>Gestão de fila de atendimento</li>
                <li>Venda de produtos especializados</li>
                <li>Sistema de comandas e pagamentos</li>
                <li>Notificações e lembretes de agendamento</li>
                <li>Programa de fidelidade e avaliações</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">3. Cadastro e Conta de Usuário</h3>
              <p className="text-muted-foreground mb-2">
                Para utilizar nossos serviços, você deve:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Fornecer informações verdadeiras, precisas e atualizadas</li>
                <li>Manter a confidencialidade de sua senha</li>
                <li>Ter no mínimo 18 anos de idade</li>
                <li>Notificar imediatamente sobre qualquer uso não autorizado de sua conta</li>
                <li>Ser responsável por todas as atividades realizadas em sua conta</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">4. Agendamentos</h3>
              <p className="text-muted-foreground mb-2">
                Ao realizar um agendamento:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Você confirma a disponibilidade para o horário escolhido</li>
                <li>Cancelamentos devem ser feitos com antecedência mínima através da plataforma</li>
                <li>Atrasos superiores a 15 minutos podem resultar no cancelamento do agendamento</li>
                <li>A Confallony reserva o direito de cancelar agendamentos em casos excepcionais</li>
                <li>Faltas recorrentes sem justificativa podem resultar em suspensão temporária da conta</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">5. Produtos e Serviços</h3>
              <p className="text-muted-foreground mb-2">
                Quanto aos produtos e serviços oferecidos:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Preços e disponibilidade estão sujeitos a alterações sem aviso prévio</li>
                <li>Imagens são meramente ilustrativas</li>
                <li>Serviços são prestados por profissionais qualificados</li>
                <li>Produtos possuem garantia conforme legislação vigente</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">6. Pagamentos</h3>
              <p className="text-muted-foreground mb-2">
                Sobre o sistema de pagamentos:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Aceitamos pagamentos via PIX, cartão de crédito e dinheiro</li>
                <li>Pagamentos online são processados via Mercado Pago</li>
                <li>Todos os dados financeiros são criptografados e protegidos</li>
                <li>Reembolsos seguem a política de cada serviço ou produto</li>
                <li>Comandas devem ser quitadas antes da saída do estabelecimento</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">7. Uso Adequado da Plataforma</h3>
              <p className="text-muted-foreground mb-2">
                Você concorda em NÃO:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Utilizar a plataforma para fins ilegais ou não autorizados</li>
                <li>Tentar acessar áreas restritas do sistema</li>
                <li>Enviar vírus ou códigos maliciosos</li>
                <li>Fazer uso comercial não autorizado das informações</li>
                <li>Violar direitos de propriedade intelectual</li>
                <li>Realizar agendamentos falsos ou fraudulentos</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">8. Propriedade Intelectual</h3>
              <p className="text-muted-foreground">
                Todo o conteúdo da plataforma, incluindo textos, imagens, logos, designs e software, 
                é propriedade da Confallony e está protegido por leis de direitos autorais e propriedade 
                intelectual. É proibida a reprodução sem autorização expressa.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">9. Limitação de Responsabilidade</h3>
              <p className="text-muted-foreground">
                A Confallony não se responsabiliza por danos indiretos, incidentais ou consequentes 
                decorrentes do uso ou impossibilidade de uso da plataforma. Não garantimos que o serviço 
                será ininterrupto ou livre de erros.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">10. Modificações dos Termos</h3>
              <p className="text-muted-foreground">
                Reservamos o direito de modificar estes termos a qualquer momento. Alterações significativas 
                serão notificadas através da plataforma ou por e-mail. O uso continuado após as modificações 
                constitui aceitação dos novos termos.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">11. Término de Conta</h3>
              <p className="text-muted-foreground">
                Podemos suspender ou encerrar sua conta a qualquer momento por violação destes termos, 
                sem aviso prévio. Você também pode solicitar o encerramento de sua conta a qualquer momento.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">12. Lei Aplicável</h3>
              <p className="text-muted-foreground">
                Estes termos são regidos pelas leis brasileiras. Qualquer disputa será resolvida nos 
                tribunais competentes do Brasil.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">13. Contato</h3>
              <p className="text-muted-foreground">
                Para dúvidas sobre estes termos, entre em contato através dos canais de comunicação 
                disponíveis na plataforma ou no estabelecimento físico.
              </p>
            </section>

            <section className="border-t pt-4 mt-6">
              <p className="text-muted-foreground italic">
                Ao utilizar a plataforma Confallony, você confirma que leu, compreendeu e concorda 
                com todos os termos acima descritos.
              </p>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
