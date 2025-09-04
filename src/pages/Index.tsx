import Layout from "@/components/layout/Layout";
import Hero from "@/components/home/Hero";
import Services from "@/components/home/Services";
import About from "@/components/home/About";
import Testimonials from "@/components/home/Testimonials";
import Transicoes from "@/components/home/Imagens";
import Produtos from "@/components/home/Produtos";

const Index = () => {
  return (
    <Layout>
      <Hero />
      <Services />
      <About />
      <Transicoes />
      <Produtos />
      <Testimonials />
    </Layout>
  );
};

export default Index;
