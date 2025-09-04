import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Scissors, 
  Sparkles, 
  Droplets, 
  Palette, 
  Hand, 
  Heart,
  ArrowRight,
  Clock,
  DollarSign,
  Search,
  Filter,
  Gamepad2,
  Zap,
  Waves
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

const Services = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");

  const services = [
    {
      icon: Scissors,
      title: "Corte de Cabelo",
      description: "Cortes modernos e clássicos para todos os estilos, com técnicas profissionais",
      price: "R$ 35",
      duration: "45 min",
      category: "Cabelo",
      featured: true
    },
    {
      icon: Sparkles,
      title: "Barba",
      description: "Aparar, modelar e finalizar com produtos premium para um visual impecável",
      price: "R$ 25",
      duration: "30 min",
      category: "Barba",
      featured: true
    },
    {
      icon: Waves,
      title: "Selagem",
      description: "Tratamento de selagem para cabelos mais lisos e brilhantes",
      price: "R$ 65",
      duration: "90 min",
      category: "Tratamentos"
    },
    {
      icon: Palette,
      title: "Platinado",
      description: "Descoloração profissional com produtos de qualidade superior",
      price: "R$ 80",
      duration: "120 min",
      category: "Coloração"
    },
    {
      icon: Droplets,
      title: "Hidratação",
      description: "Tratamento capilar intensivo para cabelos saudáveis e renovados",
      price: "R$ 45",
      duration: "60 min",
      category: "Tratamentos"
    },
    {
      icon: Zap,
      title: "Progressiva",
      description: "Alisamento progressivo para um cabelo liso e natural",
      price: "R$ 120",
      duration: "150 min",
      category: "Tratamentos"
    },
    {
      icon: Palette,
      title: "Pigmentação",
      description: "Coloração e pigmentação profissional para cabelos e barbas",
      price: "R$ 70",
      duration: "75 min",
      category: "Coloração"
    },
    {
      icon: Heart,
      title: "Limpeza de Pele",
      description: "Cuidados faciais profissionais para uma pele renovada e saudável",
      price: "R$ 60",
      duration: "75 min",
      category: "Estética"
    },
    {
      icon: Hand,
      title: "Massagem",
      description: "Massagem relaxante para aliviar tensões e renovar energias",
      price: "R$ 55",
      duration: "50 min",
      category: "Bem-estar"
    },
    {
      icon: Heart,
      title: "Podologia",
      description: "Cuidados profissionais para pés, incluindo corte de unhas e tratamentos",
      price: "R$ 40",
      duration: "45 min",
      category: "Estética"
    },
    {
      icon: Hand,
      title: "Quiropraxia",
      description: "Tratamento quiroprático para alívio de dores nas costas e pescoço",
      price: "R$ 85",
      duration: "60 min",
      category: "Bem-estar"
    },
    {
      icon: Gamepad2,
      title: "Video Game",
      description: "Área de games para entretenimento durante a espera",
      price: "Grátis",
      duration: "Ilimitado",
      category: "Entretenimento"
    }
  ];

  const categories = ["Todos", "Cabelo", "Barba", "Tratamentos", "Coloração", "Estética", "Bem-estar", "Entretenimento"];

  const filteredServices = services.filter(service => {
    const matchesSearch = service.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "Todos" || service.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <Layout>
      <div className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center space-y-4 mb-16">
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground">
              Nossos <span className="text-primary">Serviços</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Descubra nossa ampla gama de serviços premium, desde cortes tradicionais 
              até tratamentos modernos, todos executados por profissionais experientes
            </p>
          </div>

          {/* Search and Filters */}
          <div className="mb-12 space-y-6">
            {/* Search Bar */}
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar serviços..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap justify-center gap-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  onClick={() => setSelectedCategory(category)}
                  className={selectedCategory === category ? "btn-hero" : ""}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {category}
                </Button>
              ))}
            </div>
          </div>

          {/* Promotional Banner */}
          <div className="mb-12 bg-gradient-to-r from-primary/10 to-barbershop-highlight/10 rounded-2xl p-8 text-center border border-primary/20">
            <h3 className="text-2xl font-bold text-foreground mb-2">
              Promoção Especial
            </h3>
            <p className="text-muted-foreground mb-4">
              Corte + Barba por apenas <span className="text-primary font-bold text-xl">R$ 50</span>
            </p>
            <Badge className="bg-primary text-primary-foreground">
              Economia de R$ 10
            </Badge>
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {filteredServices.map((service, index) => {
              const Icon = service.icon;
              return (
                <Card key={index} className="barbershop-card service-card group relative">
                  {service.featured && (
                    <Badge className="absolute -top-2 -right-2 bg-barbershop-gold text-barbershop-gold-foreground">
                      Popular
                    </Badge>
                  )}
                  
                  <CardHeader className="text-center">
                    <div className="mx-auto mb-4 p-4 bg-primary/10 rounded-full w-fit">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-xl font-bold">{service.title}</CardTitle>
                    <Badge variant="secondary" className="w-fit mx-auto">
                      {service.category}
                    </Badge>
                  </CardHeader>
                  
                  <CardContent className="text-center space-y-4">
                    <p className="text-muted-foreground leading-relaxed">{service.description}</p>
                    
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {service.duration}
                      </div>
                      <div className="flex items-center text-primary font-semibold text-lg">
                        {service.price !== "Grátis" && <DollarSign className="h-4 w-4 mr-1" />}
                        {service.price}
                      </div>
                    </div>

                    <div className="pt-4">
                      {service.category !== "Entretenimento" ? (
                        <Link to="/booking-local">
                          <Button className="w-full btn-hero group-hover:scale-105 transition-transform">
                            Agendar Agora
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      ) : (
                        <Button variant="secondary" className="w-full" disabled>
                          Incluído na Espera
                          <Gamepad2 className="ml-2 h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* No Results */}
          {filteredServices.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">
                Nenhum serviço encontrado com os filtros selecionados.
              </p>
            </div>
          )}

          {/* CTA Section */}
          <div className="text-center space-y-6 mt-16">
            <h3 className="text-2xl font-bold text-foreground">
              Pronto para Transformar seu Visual?
            </h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Agende já seu horário e experimente o melhor em cuidados masculinos
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/booking-local">
                <Button size="lg" className="btn-hero">
                  Agendar Atendimento
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                  Falar Conosco
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Services;