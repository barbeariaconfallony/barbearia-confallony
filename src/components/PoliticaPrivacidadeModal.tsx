import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PoliticaPrivacidadeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PoliticaPrivacidadeModal = ({ open, onOpenChange }: PoliticaPrivacidadeModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-primary">
            Política de Privacidade - Confallony
          </DialogTitle>
          <DialogDescription>
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6 text-sm">
            <section>
              <h3 className="font-semibold text-lg mb-2">1. Introdução</h3>
              <p className="text-muted-foreground">
                A Confallony valoriza e respeita a privacidade de seus usuários. Esta Política de Privacidade 
                descreve como coletamos, usamos, armazenamos e protegemos suas informações pessoais quando 
                você utiliza nossa plataforma.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">2. Informações que Coletamos</h3>
              <p className="text-muted-foreground mb-2">
                Coletamos as seguintes categorias de informações:
              </p>
              
              <div className="ml-4 space-y-3">
                <div>
                  <h4 className="font-semibold text-base mb-1">2.1 Informações Fornecidas por Você</h4>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                    <li>Nome completo</li>
                    <li>E-mail</li>
                    <li>Telefone</li>
                    <li>CPF</li>
                    <li>Data de nascimento</li>
                    <li>Preferências de serviços</li>
                    <li>Avaliações e comentários</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-base mb-1">2.2 Informações Coletadas Automaticamente</h4>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                    <li>Endereço IP</li>
                    <li>Tipo de dispositivo e navegador</li>
                    <li>Dados de localização (com sua permissão)</li>
                    <li>Histórico de navegação na plataforma</li>
                    <li>Informações sobre agendamentos e compras</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-base mb-1">2.3 Informações de Pagamento</h4>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                    <li>Dados de transações (processados via Mercado Pago)</li>
                    <li>Histórico de compras e comandas</li>
                    <li>Preferências de pagamento</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">3. Como Utilizamos Suas Informações</h3>
              <p className="text-muted-foreground mb-2">
                Utilizamos suas informações para:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Processar e gerenciar seus agendamentos</li>
                <li>Processar pagamentos e transações</li>
                <li>Enviar notificações e lembretes sobre agendamentos</li>
                <li>Personalizar sua experiência na plataforma</li>
                <li>Gerenciar o programa de fidelidade</li>
                <li>Enviar comunicações sobre promoções e novidades (com seu consentimento)</li>
                <li>Melhorar nossos serviços e funcionalidades</li>
                <li>Prevenir fraudes e garantir a segurança</li>
                <li>Cumprir obrigações legais e regulatórias</li>
                <li>Enviar mensagens de aniversário (se autorizado)</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">4. Compartilhamento de Informações</h3>
              <p className="text-muted-foreground mb-2">
                Suas informações podem ser compartilhadas com:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li><strong>Prestadores de Serviço:</strong> Empresas que auxiliam em pagamentos (Mercado Pago), hospedagem e infraestrutura</li>
                <li><strong>Profissionais da Barbearia:</strong> Para execução dos serviços agendados</li>
                <li><strong>Autoridades:</strong> Quando exigido por lei ou para proteção de direitos</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                <strong>Não vendemos</strong> suas informações pessoais para terceiros.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">5. Armazenamento e Segurança</h3>
              <p className="text-muted-foreground mb-2">
                Implementamos medidas de segurança para proteger suas informações:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Criptografia SSL/TLS para transmissão de dados</li>
                <li>Armazenamento seguro em servidores protegidos</li>
                <li>Controles de acesso restrito</li>
                <li>Monitoramento regular de segurança</li>
                <li>Backup periódico de dados</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                Seus dados são armazenados pelo tempo necessário para cumprir as finalidades descritas 
                ou conforme exigido por lei.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">6. Seus Direitos (LGPD)</h3>
              <p className="text-muted-foreground mb-2">
                Conforme a Lei Geral de Proteção de Dados (LGPD), você tem direito a:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li><strong>Acesso:</strong> Confirmar se tratamos seus dados e solicitar acesso a eles</li>
                <li><strong>Correção:</strong> Atualizar dados incompletos ou incorretos</li>
                <li><strong>Eliminação:</strong> Solicitar exclusão de dados desnecessários ou tratados indevidamente</li>
                <li><strong>Portabilidade:</strong> Solicitar transferência de dados a outro fornecedor</li>
                <li><strong>Anonimização:</strong> Solicitar que seus dados sejam anonimizados</li>
                <li><strong>Revogação:</strong> Retirar consentimento para tratamento de dados</li>
                <li><strong>Oposição:</strong> Opor-se a tratamento de dados em certas situações</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                Para exercer seus direitos, entre em contato através dos canais disponíveis na plataforma.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">7. Cookies e Tecnologias Similares</h3>
              <p className="text-muted-foreground mb-2">
                Utilizamos cookies e tecnologias similares para:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Manter sua sessão ativa</li>
                <li>Lembrar suas preferências</li>
                <li>Analisar o uso da plataforma</li>
                <li>Melhorar a experiência do usuário</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                Você pode gerenciar cookies através das configurações do seu navegador.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">8. Comunicações de Marketing</h3>
              <p className="text-muted-foreground">
                Você pode optar por receber ou não comunicações promocionais. Você pode cancelar a 
                inscrição a qualquer momento através do link presente nos e-mails ou nas configurações 
                da sua conta. Mesmo optando por não receber comunicações de marketing, você ainda 
                receberá notificações transacionais importantes (confirmações de agendamento, etc.).
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">9. Menores de Idade</h3>
              <p className="text-muted-foreground">
                Nossos serviços são destinados a pessoas com 18 anos ou mais. Não coletamos 
                intencionalmente informações de menores de idade. Se soubermos que coletamos dados de 
                menores sem consentimento parental, tomaremos medidas para excluí-los.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">10. Alterações na Política de Privacidade</h3>
              <p className="text-muted-foreground">
                Podemos atualizar esta política periodicamente. Alterações significativas serão 
                comunicadas através da plataforma ou por e-mail. A data da última atualização estará 
                sempre visível no topo deste documento.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">11. Links para Sites Externos</h3>
              <p className="text-muted-foreground">
                Nossa plataforma pode conter links para sites de terceiros (como Mercado Pago). Não 
                somos responsáveis pelas práticas de privacidade desses sites. Recomendamos que você 
                leia as políticas de privacidade de todos os sites que visitar.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">12. Transferência Internacional de Dados</h3>
              <p className="text-muted-foreground">
                Seus dados são armazenados em servidores localizados no Brasil e/ou em países que 
                oferecem nível adequado de proteção de dados conforme a LGPD.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">13. Contato - Encarregado de Dados (DPO)</h3>
              <p className="text-muted-foreground">
                Para questões sobre esta política de privacidade, exercício de direitos ou reclamações 
                relacionadas ao tratamento de dados pessoais, entre em contato através dos canais 
                disponíveis na plataforma ou no estabelecimento.
              </p>
            </section>

            <section className="border-t pt-4 mt-6">
              <p className="text-muted-foreground italic">
                Ao utilizar a plataforma Confallony, você confirma que leu e compreendeu esta Política 
                de Privacidade e concorda com o tratamento de seus dados conforme descrito.
              </p>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
