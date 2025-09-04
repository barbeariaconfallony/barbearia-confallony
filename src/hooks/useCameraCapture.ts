import { useState, useRef, useCallback } from 'react';
import { useToast } from './use-toast';

const CLOUDINARY_CLOUD_NAME = 'dqu2uuz72';
const CLOUDINARY_UPLOAD_PRESET = 'Barbearia Confallony'; // Nome exato do preset no Cloudinary

interface CameraCaptureReturn {
  isCapturing: boolean;
  capturedImageUrl: string | null;
  isUploading: boolean;
  isVideoLoading: boolean;
  currentCamera: 'user' | 'environment';
  startCapture: () => Promise<void>;
  capturePhoto: () => Promise<string | null>;
  stopCapture: () => void;
  switchCamera: () => Promise<void>;
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

export const useCameraCapture = (): CameraCaptureReturn => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [currentCamera, setCurrentCamera] = useState<'user' | 'environment'>('environment');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const startCapture = useCallback(async () => {
    // Parar stream anterior se existir
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    try {
      // Verificar se getUserMedia está disponível
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia não é suportado neste navegador');
      }
      
      // Configurações otimizadas para fotos verticais com melhor qualidade
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1080, max: 1920 },
          height: { ideal: 1920, max: 2560 },
          aspectRatio: { ideal: 9/16 }, // Formato vertical
          facingMode: currentCamera // Usar câmera selecionada
        },
        audio: false
      };
      
      let mediaStream: MediaStream;
      
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (error) {
        // Se falhar com a câmera especificada, tentar qualquer câmera disponível
        const fallbackConstraints: MediaStreamConstraints = {
          video: {
            width: { ideal: 1080, max: 1920 },
            height: { ideal: 1920, max: 2560 },
            aspectRatio: { ideal: 9/16 }
          },
          audio: false
        };
        mediaStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
      }
      
      setStream(mediaStream);
      setIsCapturing(true);
      setIsVideoLoading(true);
      
      // Aguardar o próximo frame para garantir que o componente foi renderizado
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          
          // Event listeners
          videoRef.current.onloadedmetadata = () => {
            setIsVideoLoading(false);
          };
          
          videoRef.current.onplay = () => {
            setIsVideoLoading(false);
          };
          
          videoRef.current.onerror = (error) => {
            console.error('Erro no elemento de vídeo:', error);
            setIsVideoLoading(false);
          };
          
          // Tentar iniciar a reprodução
          videoRef.current.play()
            .catch(error => console.error('Erro ao iniciar reprodução:', error));
        }
      }, 100);
      
    } catch (error) {
      console.error('Erro ao acessar a câmera:', error);
      setIsCapturing(false);
      toast({
        title: "Erro",
        description: `Não foi possível acessar a câmera: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        variant: "destructive"
      });
    }
  }, [stream, toast, currentCamera]);

  const stopCapture = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
      setStream(null);
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsCapturing(false);
    setIsVideoLoading(false);
  }, [stream]);

  const switchCamera = useCallback(async () => {
    const newCamera = currentCamera === 'user' ? 'environment' : 'user';
    setCurrentCamera(newCamera);
    
    // Se a captura estiver ativa, reiniciar com a nova câmera
    if (isCapturing) {
      await startCapture();
    }
  }, [currentCamera, isCapturing, startCapture]);

  const uploadToCloudinary = async (imageBlob: Blob): Promise<string> => {
    const formData = new FormData();
    formData.append('file', imageBlob);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    
    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro no upload da imagem: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error('Erro durante upload para Cloudinary:', error);
      throw error;
    }
  };

  const capturePhoto = useCallback(async (): Promise<string | null> => {
    if (!videoRef.current || !canvasRef.current) {
      toast({
        title: "Erro",
        description: "Elementos de captura não encontrados.",
        variant: "destructive"
      });
      return null;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
      toast({
        title: "Erro",
        description: "Não foi possível obter o contexto do canvas.",
        variant: "destructive"
      });
      return null;
    }

    // Verificar se o vídeo tem dados válidos
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      toast({
        title: "Erro",
        description: "Vídeo não está pronto para captura.",
        variant: "destructive"
      });
      return null;
    }

    try {
      setIsUploading(true);
      
      // Configurar dimensões do canvas
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Desenhar a imagem do vídeo no canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Converter canvas para blob
      const imageBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(blob => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Erro ao criar blob da imagem'));
          }
        }, 'image/jpeg', 0.8);
      });
      
      // Upload para Cloudinary
      const imageUrl = await uploadToCloudinary(imageBlob);
      
      setCapturedImageUrl(imageUrl);
      
      toast({
        title: "Sucesso!",
        description: "Foto capturada e enviada com sucesso."
      });
      
      return imageUrl;
    } catch (error) {
      console.error('Erro ao capturar e enviar foto:', error);
      toast({
        title: "Erro",
        description: `Erro ao capturar e enviar a foto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        variant: "destructive"
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [toast]);

  return {
    isCapturing,
    capturedImageUrl,
    isUploading,
    isVideoLoading,
    currentCamera,
    startCapture,
    capturePhoto,
    stopCapture,
    switchCamera,
    videoRef,
    canvasRef
  };
};