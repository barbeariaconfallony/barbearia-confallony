import { Button } from "@/components/ui/button";
import { Calendar, Scissors, Users, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero.png";
import logoMain from "@/assets/confallony-logo-new.png";
const Hero = () => {
  return <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Gradient Fade */}
      <div className="absolute inset-0 z-0">
        <img src={heroImage} alt="Barbearia Confallony - Interior moderno e sofisticado" className="w-full h-full object-cover" />
        {/* Overlay escuro principal */}
        <div className="absolute inset-0 bg-background opacity-55"></div>
        {/* Overlay adicional para suavizar */}
        <div className="absolute inset-0 bg-gray-950/20"></div>
        {/* Gradiente de fade para o footer */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent" style={{
        zIndex: 1
      }}></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="space-y-6 sm:space-y-8">
          {/* Logo and Main Heading */}
          <div className="space-y-4 sm:space-y-6">
            <div className="flex justify-center">
              <img src={logoMain} alt="Confallony Barbearia - Estilo Homem" className="h-80 sm:h-[28rem] lg:h-[32rem] w-auto" style={{
              filter: 'drop-shadow(0 0 20px rgba(218, 165, 32, 0.4))',
              transition: 'filter 0.3s ease'
            }} />
            </div>
            <p className="text-base sm:text-xl lg:text-2xl text-foreground/90 max-w-3xl mx-auto leading-relaxed px-2 -mt-16 sm:-mt-24 lg:-mt-32">
              Tradição, estilo e modernidade em cada corte. 
              Experimente o melhor atendimento da cidade.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4">
            <Link to="/booking">
              <Button size="lg" className="btn-hero text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 w-full sm:w-auto">
                <Calendar className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Agendar Atendimento
              </Button>
            </Link>
            <Link to="/services">
              <Button size="lg" variant="outline" className="text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 border-primary text-primary hover:bg-primary hover:text-primary-foreground w-full sm:w-auto">
                <Scissors className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Ver Serviços
              </Button>
            </Link>
            <Link to="/register">
              <Button size="lg" variant="secondary" className="text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 w-full sm:w-auto">
                <Users className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Cadastrar-se
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 max-w-2xl mx-auto mt-12 sm:mt-16 px-4">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-primary">1000+</div>
              <div className="text-sm sm:text-base text-muted-foreground">Clientes Atendidos Mensalmente</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-primary">12+</div>
              <div className="text-sm sm:text-base text-muted-foreground">Serviços Diferenciados

            </div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-primary">15+</div>
              <div className="text-sm sm:text-base text-muted-foreground">Anos de Experiência</div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce z-20">
        <ChevronDown className="w-10 h-10 text-primary" strokeWidth={2.5} />
      </div>
    </section>;
};
export default Hero;