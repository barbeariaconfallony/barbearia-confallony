import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Users, Award, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import aboutImage from "@/assets/barber-about.jpg";

const About = () => {
  const features = [
    "Profissionais certificados e experientes",
    "Produtos premium de marcas reconhecidas",
    "Ambiente moderno e confortável",
    "Atendimento personalizado",
    "Agendamento online prático",
    "Programa de fidelidade exclusivo"
  ];

  const stats = [
    {
      icon: Users,
      number: "5000+",
      label: "Clientes Atendidos"
    },
    {
      icon: Award,
      number: "15",
      label: "Anos de Tradição"
    },
    {
      icon: Clock,
      number: "98%",
      label: "Satisfação dos Clientes"
    }
  ];

  return (
    <section className="relative py-20 bg-muted/30">
      {/* Gradiente de fade para o topo */}
      <div 
        className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-background to-transparent"
        style={{ zIndex: 1 }}
      ></div>


      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                Sobre a Barbearia Confallony
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
                Tradição e Modernidade em <span className="text-primary">Perfeita Harmonia</span>
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Há mais de 15 anos cuidando do estilo masculino com excelência. 
                Na Barbearia Confallony, combinamos técnicas tradicionais com as 
                mais modernas tendências para oferecer uma experiência única.
              </p>
            </div>

            {/* Features List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-muted-foreground">{feature}</span>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div key={index} className="text-center">
                    <div className="flex justify-center mb-2">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <div className="text-2xl font-bold text-foreground">{stat.number}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                );
              })}
            </div>

            {/* CTA */}
            <div className="space-y-4">
              <Link to="/about">
                <Button size="lg" className="btn-hero">
                  Conheça Nossa História
                </Button>
              </Link>
            </div>
          </div>

          {/* Image */}
          <div className="relative">
            <div className="aspect-[4/5] rounded-2xl overflow-hidden shadow-xl">
              <img
                src={aboutImage}
                alt="Profissional barbeiro trabalhando na Barbearia Confallony"
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Floating Card */}
            <div className="absolute -bottom-6 -left-4 bg-card border border-border rounded-xl p-6 shadow-xl">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">15+</div>
                <div className="text-sm text-muted-foreground">Anos de</div>
                <div className="text-sm text-muted-foreground">Experiência</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gradiente de fade para o footer */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent"
        style={{ zIndex: 1 }}
      ></div>

    </section>
  );
};

export default About;