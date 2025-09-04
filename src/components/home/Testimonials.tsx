import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star } from "lucide-react";

const Testimonials = () => {
  const testimonials = [
    {
      name: "Carlos Silva",
      initials: "CS",
      text: "Excelente atendimento! O corte ficou perfeito e o ambiente é muito acolhedor. Recomendo a todos!",
      rating: 5,
      service: "Corte + Barba"
    },
    {
      name: "João Santos",
      initials: "JS", 
      text: "Profissionais muito competentes. Faço meu cabelo aqui há anos e sempre saio satisfeito.",
      rating: 5,
      service: "Platinado"
    },
    {
      name: "Pedro Oliveira",
      initials: "PO",
      text: "A melhor barbearia da região! Agendamento pelo site é muito prático e o resultado sempre supera as expectativas.",
      rating: 5,
      service: "Hidratação"
    },
    {
      name: "Rafael Costa",
      initials: "RC",
      text: "Ambiente moderno, profissionais qualificados e preços justos. Virei cliente fiel!",
      rating: 5,
      service: "Limpeza de Pele"
    },
    {
      name: "Lucas Ferreira",
      initials: "LF",
      text: "Serviço impecável! A massagem relaxante é incrível e me sinto renovado a cada visita.",
      rating: 5,
      service: "Massagem"
    },
    {
      name: "André Martins",
      initials: "AM",
      text: "Tradição e qualidade em cada atendimento. A Confallony é referência em cuidados masculinos!",
      rating: 5,
      service: "Corte + Progressiva"
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            O Que Nossos <span className="text-primary">Clientes Dizem</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Mais de 5000 clientes satisfeitos compartilham suas experiências conosco
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="barbershop-card">
              <CardContent className="p-6">
                {/* Rating */}
                <div className="flex space-x-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>

                {/* Text */}
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  "{testimonial.text}"
                </p>

                {/* Author & Service */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {testimonial.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold text-foreground">{testimonial.name}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.service}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trust Indicators */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center space-x-6 bg-card border border-border rounded-full px-8 py-4">
            <div className="flex items-center space-x-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                ))}
              </div>
              <span className="text-foreground font-semibold">4.9/5.0</span>
            </div>
            <div className="h-6 w-px bg-border"></div>
            <div className="text-muted-foreground">
              <span className="font-semibold text-foreground">98%</span> dos clientes recomendam
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;