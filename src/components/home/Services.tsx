import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Scissors, 
  Sparkles, 
  Droplets, 
  Palette, 
  Hand, 
  Heart,
  ArrowRight,
  Clock,
  DollarSign
} from "lucide-react";
import { Link } from "react-router-dom";

const Services = () => {
  const services = [
    {
      icon: Scissors,
      title: "Corte de Cabelo",
      description: "Cortes modernos e clássicos para todos os estilos",
      price: "R$ 35",
      duration: "45 min",
      category: "Cabelo"
    },
    {
      icon: Sparkles,
      title: "Barba & Bigode",
      description: "Aparar, modelar e finalizar com produtos premium",
      price: "R$ 25",
      duration: "30 min",
      category: "Barba"
    },
    {
      icon: Palette,
      title: "Platinado",
      description: "Descoloração profissional com produtos de qualidade",
      price: "R$ 80",
      duration: "120 min",
      category: "Coloração"
    },
    {
      icon: Droplets,
      title: "Hidratação",
      description: "Tratamento capilar intensivo para cabelos saudáveis",
      price: "R$ 45",
      duration: "60 min",
      category: "Tratamentos"
    },
    {
      icon: Heart,
      title: "Limpeza de Pele",
      description: "Cuidados faciais para uma pele renovada",
      price: "R$ 60",
      duration: "75 min",
      category: "Estética"
    },
    {
      icon: Hand,
      title: "Massagem Relaxante",
      description: "Relaxe e renove suas energias",
      price: "R$ 55",
      duration: "50 min",
      category: "Bem-estar"
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Nossos <span className="text-primary">Serviços</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Oferecemos uma ampla gama de serviços para cuidar do seu visual com excelência
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <Card key={index} className="barbershop-card service-card group">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 p-4 bg-primary/10 rounded-full w-fit">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl font-bold">{service.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <p className="text-muted-foreground">{service.description}</p>
                  
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {service.duration}
                    </div>
                    <div className="flex items-center text-primary font-semibold">
                      <DollarSign className="h-4 w-4 mr-1" />
                      {service.price}
                    </div>
                  </div>

                  <div className="pt-4">
                    <Link to="/booking-local">
                      <Button className="w-full btn-hero group-hover:scale-105 transition-transform">
                        Agendar Agora
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <Link to="/services">
            <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
              Ver Todos os Serviços
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Services;