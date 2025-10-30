import { useEffect, useState, useRef } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface FotoCliente {
  id: string;
  cliente_nome: string;
  fotos: string[];
}

const InfiniteSlidingGallery = () => {
  const [fotosClientes, setFotosClientes] = useState<FotoCliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar fotos do Firestore
  useEffect(() => {
    const loadFotosClientes = async () => {
      try {
        const fotosQuery = query(
          collection(db, 'fotos_clientes'),
          orderBy('data_captura', 'desc')
        );
        const fotosSnapshot = await getDocs(fotosQuery);
        
        const fotosData = fotosSnapshot.docs
          .map(doc => ({
            id: doc.id,
            cliente_nome: doc.data().cliente_nome,
            fotos: doc.data().fotos || []
          } as FotoCliente))
          .filter(foto => foto.fotos.length === 5); // Só exibe se tiver exatamente 5 fotos
        
        setFotosClientes(fotosData);
      } catch (error) {
        console.error("Error loading fotos:", error);
      }
      setIsLoading(false);
    };

    loadFotosClientes();
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const cards = [...fotosClientes, ...fotosClientes];
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [renderPosition, setRenderPosition] = useState(0);
  const [paused, setPaused] = useState(false);
  const positionRef = useRef(0);

  // Troca de imagens
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex(prev => (prev + 1) % 5); // Mudou para 5 fotos
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Movimento infinito
  useEffect(() => {
    if (!containerRef.current || !contentRef.current || cards.length === 0) return;

    const cardWidth = 300 + 64;
    const totalWidth = cardWidth * cards.length;
    const halfWidth = totalWidth / 2;
    const speed = 80;

    let animationFrame: number;
    let lastTimestamp = 0;

    const animate = (timestamp: number) => {
      if (!lastTimestamp) lastTimestamp = timestamp;
      const deltaTime = timestamp - lastTimestamp;
      lastTimestamp = timestamp;

      if (!paused) {
        positionRef.current -= (speed * deltaTime) / 1000;
        if (Math.abs(positionRef.current) >= halfWidth) {
          positionRef.current += halfWidth;
        }
        setRenderPosition(positionRef.current);
      }

      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [cards, paused]);

  // Não renderiza a seção se não houver fotos
  if (!isLoading && fotosClientes.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-background py-20 overflow-hidden">
      <div className="text-center space-y-1">
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
          Veja os resultados <span className="text-primary">dos nossos clientes</span>
        </h2>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto py-2">
          Após aquele talento na <span className="text-primary">Barbearia Confallony</span>
        </p>
      </div>

      {/* Aumentei altura do container */}
      <div ref={containerRef} className="w-full h-[800px] relative">
        <div
          ref={contentRef}
          className="absolute flex h-full items-center"
          style={{
            transform: `translateX(${renderPosition}px)`,
            willChange: 'transform'
          }}
        >
          {cards.map((client, index) => (
            <div
              key={`${client.id}-${index}`}
              className="mx-8 w-[350px] h-[500px] flex-shrink-0 relative group 
                         transition-transform duration-300 hover:scale-110"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
            >
              {/* Card principal */}
              <div className="relative w-full h-full overflow-hidden rounded-lg">
                {client.fotos.map((image, imgIndex) => (
                  <div
                    key={imgIndex}
                    className={`absolute inset-0 transition-opacity duration-1000 ${
                      imgIndex === currentImageIndex ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${client.cliente_nome} ${imgIndex + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default InfiniteSlidingGallery;
