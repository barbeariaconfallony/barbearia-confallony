import { MapPin, Phone, Mail, Clock, Instagram, Facebook, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";

const Footer = () => {
  return (
    <footer className="bg-barbershop-dark border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-foreground">
              Barbearia <span className="text-primary">Confallony</span>
            </h3>
            <p className="text-muted-foreground">
              Tradição e modernidade em um só lugar. Cuidamos do seu estilo com excelência e profissionalismo.
            </p>
            <div className="flex space-x-4">
              <Button variant="ghost" size="sm" className="p-2">
                <Instagram className="h-10 w-10 text-primary" />
              </Button>
              <Button variant="ghost" size="sm" className="p-2">
                <Facebook className="h-10 w-10 text-primary" />
              </Button>
              <Button variant="ghost" size="sm" className="p-2">
                <Twitter className="h-10 w-10 text-primary" />
              </Button>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-foreground">Contato</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="text-muted-foreground">
                  Av. Frei Confallone, QD. QC-31, LT. 09, Sala 4, Conjunto Vera Cruz 2, CEP: 74.495-060
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="text-muted-foreground">(62) 9 9842-8528</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="text-muted-foreground">viniciusoduque@gmail.com</span>
              </div>
            </div>
          </div>

          {/* Operating Hours */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-foreground">Horário de Funcionamento</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-primary flex-shrink-0" />
                <div className="text-muted-foreground">
                  <div>Segunda a Sexta: 09:00 - 21:00</div>
                  <div>Sábado: 09:00 - 21:00</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-foreground">Links Rápidos</h4>
            <div className="space-y-2">
              <a href="/services" className="block text-muted-foreground hover:text-primary transition-colors">
                Nossos Serviços
              </a>
              <a href="/booking" className="block text-muted-foreground hover:text-primary transition-colors">
                Agendar Horário
              </a>
              <a href="/about" className="block text-muted-foreground hover:text-primary transition-colors">
                Sobre Nós
              </a>
              <a href="/contact" className="block text-muted-foreground hover:text-primary transition-colors">
                Contato
              </a>
              <a href="/terms" className="block text-muted-foreground hover:text-primary transition-colors">
                Termos de Uso
              </a>
              <a href="/privacy" className="block text-muted-foreground hover:text-primary transition-colors">
                Política de Privacidade
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 text-center">
          <p className="text-muted-foreground">
            © 2025 Barbearia Confallony. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;