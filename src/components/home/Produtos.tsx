import { useRef, useEffect } from 'react';
import kitBarbear from '../../assets/produtos/kit-barbear.jpg';
import oleoBarba from '../../assets/produtos/oleo-barba.jpg';
import maquinaCortar from '../../assets/produtos/maquina-cortar.jpg';
import esfolianteCarvao from '../../assets/produtos/esfoliante-carvao.jpg';
import escovaCabelo from '../../assets/produtos/escova-cabelo.jpg';
import posBarba from '../../assets/produtos/pos-barba.jpg';
import pomadaModeladora from '../../assets/produtos/pomada-modeladora.jpg';
import shampooAnticaspa from '../../assets/produtos/shampoo-anticaspa.jpg';
import aparadorPelos from '../../assets/produtos/aparador-pelos.jpg';
import tonicoCapilar from '../../assets/produtos/tonico-capilar.jpg';
import gelFixador from '../../assets/produtos/gel-fixador.jpg';
import protetorSolar from '../../assets/produtos/protetor-solar.jpg';
import ceraBigode from '../../assets/produtos/cera-bigode.jpg';
import condicionador from '../../assets/produtos/condicionador.jpg';
import kitManicure from '../../assets/produtos/kit-manicure.jpg';
import desodorante from '../../assets/produtos/desodorante.jpg';

interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  description: string;
}

const ProductFlipCardGallery = () => {
  const products: Product[] = [
    {
      id: 1,
      name: 'Kit Premium de Barbear',
      price: 189.90,
      image: kitBarbear,
      description: 'Kit completo para barbear com pincel de pelos de texugo, navalha de segurança e sabão premium'
    },
    {
      id: 2,
      name: 'Óleo para Barba - Sândalo',
      price: 64.90,
      image: oleoBarba,
      description: 'Óleo nutritivo para barba com fragrância natural de sândalo e óleo de jojoba'
    },
    {
      id: 3,
      name: 'Máquina de Cortar Profissional',
      price: 329.90,
      image: maquinaCortar,
      description: 'Máquina de cortar cabelo sem fio com lâminas de titânio e múltiplos pentes guia'
    },
    {
      id: 4,
      name: 'Esfoliante Facial de Carvão',
      price: 49.90,
      image: esfolianteCarvao,
      description: 'Esfoliante facial de limpeza profunda com carvão ativado para homens'
    },
    {
      id: 5,
      name: 'Escova de Cabelo Cerdas Naturais',
      price: 89.90,
      image: escovaCabelo,
      description: 'Escova de cerdas naturais de javali para modelagem e massagem do couro cabeludo'
    },
    {
      id: 6,
      name: 'Bálsamo Pós-Barba',
      price: 79.90,
      image: posBarba,
      description: 'Bálsamo calmante pós-barba com aloe vera e vitamina E'
    },
    {
      id: 7,
      name: 'Pomada Modeladora Premium',
      price: 45.90,
      image: pomadaModeladora,
      description: 'Pomada para cabelo com fixação forte e brilho natural, ideal para penteados clássicos'
    },
    {
      id: 8,
      name: 'Shampoo Masculino Anti-Caspa',
      price: 38.90,
      image: shampooAnticaspa,
      description: 'Shampoo terapêutico com ácido salicílico para controle da caspa e oleosidade'
    },
    {
      id: 9,
      name: 'Aparador de Pelos Multiuso',
      price: 159.90,
      image: aparadorPelos,
      description: 'Aparador elétrico para barba, nariz, orelha e pelos corporais com 5 pentes'
    },
    {
      id: 10,
      name: 'Tonico Capilar Anticaspa',
      price: 67.90,
      image: tonicoCapilar,
      description: 'Tônico revigorante com mentol e tea tree para estimular o crescimento capilar'
    },
    {
      id: 11,
      name: 'Gel Fixador Extra Forte',
      price: 29.90,
      image: gelFixador,
      description: 'Gel modelador com fixação extra forte e acabamento natural, sem ressecamento'
    },
    {
      id: 12,
      name: 'Protetor Solar Facial FPS 60',
      price: 54.90,
      image: protetorSolar,
      description: 'Protetor solar facial masculino com textura seca e proteção UVA/UVB'
    },
    {
      id: 13,
      name: 'Cera para Bigode Artesanal',
      price: 34.90,
      image: ceraBigode,
      description: 'Cera natural para modelagem de bigode com fragrância amadeirada'
    },
    {
      id: 14,
      name: 'Condicionador Hidratante',
      price: 42.90,
      image: condicionador,
      description: 'Condicionador nutritivo com óleo de argan para cabelos ressecados'
    },
    {
      id: 15,
      name: 'Kit Manicure Masculina',
      price: 78.90,
      image: kitManicure,
      description: 'Kit completo para cuidado das unhas com alicate, lima e empurrador de cutícula'
    },
    {
      id: 16,
      name: 'Desodorante Antitranspirante 72h',
      price: 24.90,
      image: desodorante,
      description: 'Desodorante com proteção prolongada e fragrância masculina marcante'
    }
  ];

  const scrollRef = useRef<HTMLDivElement>(null);

  // Habilita rolagem horizontal com a roda do mouse
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  // Drag-to-scroll
  let isDown = false;
  let startX: number;
  let scrollLeft: number;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    isDown = true;
    scrollRef.current.classList.add("cursor-grabbing");
    startX = e.pageX - scrollRef.current.offsetLeft;
    scrollLeft = scrollRef.current.scrollLeft;
  };

  const handleMouseLeave = () => {
    isDown = false;
    scrollRef.current?.classList.remove("cursor-grabbing");
  };

  const handleMouseUp = () => {
    isDown = false;
    scrollRef.current?.classList.remove("cursor-grabbing");
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDown || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  return (
    <div className="w-full bg-background py-12 overflow-hidden">
      {/* Header */}
      <div className="text-center space-y-4 mb-8">
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
          Veja os nossos <span className="text-primary">produtos a venda</span>
        </h2>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Sessão de produtos para você adquirir e usar no dia a dia
        </p>
      </div>
      
      <div
        ref={scrollRef}
        className="w-full h-[320px] flex gap-8 overflow-x-auto px-8 select-none cursor-grab no-scrollbar items-center"
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
      >
        {products.map((product) => (
          <div key={product.id} className="neon-card flex-shrink-0">
            <div className="flip-inner">
              {/* Frente: somente imagem */}
              <div className="flip-face flip-front">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>

              {/* Verso: somente detalhes em texto */}
              <div className="flip-face flip-back">
                <h3 className="heading">{product.name}</h3>
                <p className="description">{product.description}</p>
                <p className="price">R$ {product.price.toFixed(2).replace('.', ',')}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CSS para efeito neon e scrollbar */}
      <style>{`
        .no-scrollbar {
          scrollbar-width: none;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        
        .neon-card {
          position: relative;
          width: 190px;
          height: 254px;
          border-radius: 10px;
          cursor: pointer;
          perspective: 1000px; /* 3D */
          isolation: isolate; /* garante contexto de pilha, borda fica atrás */
        }

        .neon-card::before {
          content: "";
          position: absolute;
          inset: 0;
          left: -5px;
          margin: auto;
          width: 200px;
          height: 264px;
          border-radius: 10px;
          background: linear-gradient(-45deg, #e81cff 0%, #40c9ff 100%);
          z-index: -20;
          pointer-events: none;
          transition: all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .neon-card::after {
          content: "";
          z-index: -15;
          position: absolute;
          inset: 0;
          background: linear-gradient(-45deg, #fc00ff 0%, #00dbde 100%);
          transform: translate3d(0, 0, 0) scale(0.95);
          filter: blur(20px);
          border-radius: 12px;
        }

        /* Inner para flip */
        .flip-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
          transition: transform 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          will-change: transform;
          z-index: 5; /* garante conteúdo acima da borda em degradê */
        }
        .neon-card:hover .flip-inner { transform: rotateY(180deg); }

        /* Faces */
        .flip-face {
          position: absolute;
          inset: 0;
          border-radius: 10px;
          overflow: hidden;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .flip-front {
          z-index: 2;
          background: #000; /* fallback */
        }
        .flip-back {
          display: flex;
          flex-direction: column;
          justify-content: end;
          gap: 12px;
          padding: 12px;
          background: #000;
          color: #fff;
          transform: rotateY(180deg);
        }

        .heading { font-size: 16px; font-weight: 700; line-height: 1.2; }
        .description {
          font-size: 12px;
          opacity: 0.85;
          line-height: 1.3;
          max-height: 6.5em;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 5;
          -webkit-box-orient: vertical;
        }
        .price { color: #e81cff; font-weight: 600; font-size: 14px; }

        /* Hover intensifica o glow */
        .neon-card:hover::after { filter: blur(30px); }
        .neon-card:hover::before { transform: rotate(-90deg) scaleX(1.34) scaleY(0.77); }
      `}</style>
    </div>
  );
};

export default ProductFlipCardGallery;
