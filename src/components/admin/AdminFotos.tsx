import { useState, useEffect } from "react";
import { 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where,
  orderBy,
  deleteDoc,
  doc,
  updateDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useCameraCapture } from "@/hooks/useCameraCapture";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Camera, 
  Search, 
  User,
  Image as ImageIcon,
  Upload,
  Trash2,
  Eye,
  Calendar,
  FileImage,
  Plus
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Cliente {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
}

interface FotoCliente {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  cliente_email: string;
  fotos: string[];
  data_captura: Date;
}

export const AdminFotos = () => {
  const { toast } = useToast();
  const [fotosClientes, setFotosClientes] = useState<FotoCliente[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<string>("");
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [clienteSearchTerm, setClienteSearchTerm] = useState("");
  const [captureMode, setCaptureMode] = useState<'camera' | 'file'>('camera');
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);

  const {
    isCapturing,
    capturedImageUrl,
    isVideoLoading,
    currentCamera,
    startCapture,
    capturePhoto,
    stopCapture,
    switchCamera,
    videoRef,
    canvasRef
  } = useCameraCapture();

  // Carregar dados iniciais
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadFotosClientes(),
        loadClientes()
      ]);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados.",
        variant: "destructive"
      });
    }
    setIsLoading(false);
  };

  const loadFotosClientes = async () => {
    try {
      const fotosQuery = query(
        collection(db, 'fotos_clientes'),
        orderBy('data_captura', 'desc')
      );
      const fotosSnapshot = await getDocs(fotosQuery);
      
      const fotosData = fotosSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        data_captura: doc.data().data_captura?.toDate() || new Date()
      } as FotoCliente));
      
      setFotosClientes(fotosData);
    } catch (error) {
      console.error("Error loading fotos:", error);
    }
  };

  const loadClientes = async () => {
    try {
      const clientesSnapshot = await getDocs(collection(db, 'usuarios'));
      
      const clientesData = clientesSnapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            nome: data.nome || '',
            email: data.email || '',
            telefone: data.telefone || ''
          } as Cliente;
        })
        .filter(cliente => cliente.nome && cliente.email) // Filtra apenas clientes com nome e email
        .sort((a, b) => a.nome.localeCompare(b.nome)); // Ordena por nome
      
      setClientes(clientesData);
    } catch (error) {
      console.error("Error loading clientes:", error);
    }
  };

  const handleTakePhoto = async () => {
    if (capturedPhotos.length >= 5) {
      toast({
        title: "Limite atingido",
        description: "Você pode tirar no máximo 5 fotos por cliente.",
        variant: "destructive"
      });
      return;
    }

    const photoUrl = await capturePhoto();
    if (photoUrl) {
      setCapturedPhotos(prev => [...prev, photoUrl]);
      toast({
        title: "Foto capturada!",
        description: `Foto ${capturedPhotos.length + 1}/5 capturada com sucesso.`
      });
    }
  };

  const handleSendPhotos = async () => {
    if (capturedPhotos.length === 0) {
      toast({
        title: "Erro",
        description: "Capture pelo menos uma foto antes de enviar.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      const clienteSelecionado = selectedCliente ? clientes.find(c => c.id === selectedCliente) : null;
      
      await addDoc(collection(db, 'fotos_clientes'), {
        cliente_id: selectedCliente || '',
        cliente_nome: clienteSelecionado?.nome || 'Cliente não selecionado',
        cliente_email: clienteSelecionado?.email || '',
        fotos: capturedPhotos,
        data_captura: new Date(),
        created_at: new Date()
      });

      toast({
        title: "Sucesso!",
        description: `${capturedPhotos.length} foto(s) enviada(s)${clienteSelecionado ? ` para ${clienteSelecionado.nome}` : ''}.`
      });

      // Reset
      setCapturedPhotos([]);
      setSelectedCliente("");
      setIsModalOpen(false);
      loadFotosClientes();

    } catch (error) {
      console.error("Error saving photos:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as fotos.",
        variant: "destructive"
      });
    }
    setIsUploading(false);
  };

  const handleRemovePhoto = (index: number) => {
    setCapturedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const uploadToCloudinary = async (file: File): Promise<string> => {
    const CLOUDINARY_CLOUD_NAME = 'dqu2uuz72';
    const CLOUDINARY_UPLOAD_PRESET = 'Barbearia Confallony';
    
    const formData = new FormData();
    formData.append('file', file);
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const currentPhotosCount = capturedPhotos.length;
    const filesToUpload = Array.from(files).slice(0, 5 - currentPhotosCount);

    if (filesToUpload.length === 0) {
      toast({
        title: "Limite atingido",
        description: "Você já tem o máximo de 5 fotos.",
        variant: "destructive"
      });
      return;
    }

    if (files.length > filesToUpload.length) {
      toast({
        title: "Limite de fotos",
        description: `Apenas ${filesToUpload.length} foto(s) foram selecionadas para não exceder o limite de 5.`,
        variant: "default"
      });
    }

    setIsUploadingFiles(true);
    try {
      const uploadPromises = filesToUpload.map(file => uploadToCloudinary(file));
      const uploadedUrls = await Promise.all(uploadPromises);
      
      setCapturedPhotos(prev => [...prev, ...uploadedUrls]);
      
      toast({
        title: "Fotos enviadas!",
        description: `${uploadedUrls.length} foto(s) enviada(s) com sucesso.`
      });
    } catch (error) {
      console.error('Erro ao fazer upload das fotos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível fazer upload de algumas fotos.",
        variant: "destructive"
      });
    }
    setIsUploadingFiles(false);
    
    // Reset file input
    event.target.value = '';
  };

  const deleteFromCloudinary = async (imageUrl: string) => {
    try {
      // Extract public_id from Cloudinary URL
      const urlParts = imageUrl.split('/');
      const fileWithExtension = urlParts[urlParts.length - 1];
      const publicId = fileWithExtension.split('.')[0];
      
      const CLOUDINARY_CLOUD_NAME = 'dqu2uuz72';
      const CLOUDINARY_API_KEY = '472691417742837';
      const CLOUDINARY_API_SECRET = 'n4zEFUAkxdcWNkW_GKnFi-cQG1o';
      
      // Create signature for deletion
      const timestamp = Math.round(Date.now() / 1000);
      const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
      
      // Simple hash function (for development - in production use proper crypto)
      const signature = btoa(stringToSign);
      
      const formData = new FormData();
      formData.append('public_id', publicId);
      formData.append('timestamp', timestamp.toString());
      formData.append('api_key', CLOUDINARY_API_KEY);
      formData.append('signature', signature);
      
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/destroy`,
        {
          method: 'POST',
          body: formData
        }
      );
      
      if (!response.ok) {
        console.warn('Erro ao deletar imagem do Cloudinary:', response.status);
      }
    } catch (error) {
      console.warn('Erro ao deletar imagem do Cloudinary:', error);
    }
  };

  const handleDeletePhoto = async (fotoClienteId: string, photoIndex: number, photoUrl: string) => {
    if (!confirm('Tem certeza que deseja excluir esta foto?')) {
      return;
    }

    try {
      const fotoCliente = fotosClientes.find(f => f.id === fotoClienteId);
      if (!fotoCliente) return;

      // Remove photo from array
      const updatedPhotos = fotoCliente.fotos.filter((_, index) => index !== photoIndex);
      
      if (updatedPhotos.length === 0) {
        // If no photos left, delete entire document
        await deleteDoc(doc(db, 'fotos_clientes', fotoClienteId));
        await deleteFromCloudinary(photoUrl);
        
        toast({
          title: "Sucesso!",
          description: "Última foto removida. Registro do cliente excluído.",
        });
      } else {
        // Update document with remaining photos
        await updateDoc(doc(db, 'fotos_clientes', fotoClienteId), {
          fotos: updatedPhotos
        });
        await deleteFromCloudinary(photoUrl);
        
        toast({
          title: "Sucesso!",
          description: "Foto removida com sucesso.",
        });
      }

      loadFotosClientes();
    } catch (error) {
      console.error("Error deleting photo:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a foto.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteAllPhotos = async (fotoClienteId: string, fotos: string[]) => {
    if (!confirm('Tem certeza que deseja excluir TODAS as fotos deste cliente?')) {
      return;
    }

    try {
      // Delete from Firestore
      await deleteDoc(doc(db, 'fotos_clientes', fotoClienteId));
      
      // Delete all photos from Cloudinary
      const deletePromises = fotos.map(photoUrl => deleteFromCloudinary(photoUrl));
      await Promise.all(deletePromises);
      
      toast({
        title: "Sucesso!",
        description: "Todas as fotos foram excluídas.",
      });

      loadFotosClientes();
    } catch (error) {
      console.error("Error deleting all photos:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir todas as fotos.",
        variant: "destructive"
      });
    }
  };

  const filteredFotos = fotosClientes.filter(foto =>
    foto.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    foto.cliente_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredClientes = clientes.filter(cliente =>
    cliente.nome.toLowerCase().includes(clienteSearchTerm.toLowerCase()) ||
    cliente.email.toLowerCase().includes(clienteSearchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Gerenciar Fotos dos Clientes</h2>
          <p className="text-muted-foreground">Capture e gerencie fotos dos clientes para exibir na página inicial</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
              <Camera className="h-4 w-4 mr-2" />
              Tirar Fotos
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Capturar Fotos do Cliente</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Seletor de Cliente */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Selecionar Cliente</label>
                <Select value={selectedCliente} onValueChange={setSelectedCliente}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 bg-background border z-50">
                    {/* Pesquisa dentro do dropdown */}
                    <div className="p-2 border-b border-border">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar cliente..."
                          value={clienteSearchTerm}
                          onChange={(e) => setClienteSearchTerm(e.target.value)}
                          className="pl-10 h-8"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    
                    <div className="max-h-48 overflow-y-auto">
                      {filteredClientes.length > 0 ? (
                        filteredClientes.map((cliente) => (
                          <SelectItem key={cliente.id} value={cliente.id} className="bg-background hover:bg-accent">
                            <div className="flex flex-col">
                              <span className="font-medium">{cliente.nome}</span>
                              <span className="text-xs text-muted-foreground">{cliente.email}</span>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-4 text-center text-muted-foreground">
                          {clienteSearchTerm ? "Nenhum cliente encontrado" : "Carregando clientes..."}
                        </div>
                      )}
                    </div>
                  </SelectContent>
                </Select>
              </div>

              {/* Seletor de Modo */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Modo de Captura</label>
                <div className="flex gap-2">
                  <Button
                    variant={captureMode === 'camera' ? 'default' : 'outline'}
                    onClick={() => setCaptureMode('camera')}
                    className="flex-1"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Câmera
                  </Button>
                  <Button
                    variant={captureMode === 'file' ? 'default' : 'outline'}
                    onClick={() => setCaptureMode('file')}
                    className="flex-1"
                  >
                    <FileImage className="h-4 w-4 mr-2" />
                    Importar Arquivos
                  </Button>
                </div>
              </div>

              {/* Área de captura de fotos */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Camera ou Upload */}
                <div className="space-y-4">
                  {captureMode === 'camera' ? (
                    <>
                      <div className="aspect-[3/4] bg-black rounded-lg overflow-hidden relative">
                        {isCapturing ? (
                          <>
                            <video
                              ref={videoRef}
                              autoPlay
                              playsInline
                              muted
                              className="w-full h-full object-cover"
                              style={{ display: isVideoLoading ? 'none' : 'block' }}
                            />
                            {isVideoLoading && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-white text-center">
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                                  <p>Iniciando câmera...</p>
                                </div>
                              </div>
                            )}
                            <canvas ref={canvasRef} className="hidden" />
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white">
                            <div className="text-center">
                              <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
                              <p>Clique em "Iniciar Câmera" para começar</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Controles da câmera */}
                      <div className="flex gap-2">
                        {!isCapturing ? (
                          <Button onClick={startCapture} className="flex-1">
                            <Camera className="h-4 w-4 mr-2" />
                            Iniciar Câmera
                          </Button>
                        ) : (
                          <>
                            <Button 
                              onClick={handleTakePhoto} 
                              disabled={capturedPhotos.length >= 5}
                              className="flex-1"
                            >
                              <Camera className="h-4 w-4 mr-2" />
                              Tirar Foto ({capturedPhotos.length}/5)
                            </Button>
                            <Button onClick={switchCamera} variant="outline" size="icon">
                              <Camera className="h-4 w-4" />
                            </Button>
                            <Button onClick={stopCapture} variant="destructive" size="icon">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden relative border-2 border-dashed border-border">
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center">
                            <FileImage className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <p className="text-muted-foreground mb-4">Selecione arquivos de imagem</p>
                            <p className="text-xs text-muted-foreground">
                              Formatos suportados: JPG, PNG, WEBP
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Controles de upload */}
                      <div className="space-y-2">
                        <input
                          type="file"
                          id="file-upload"
                          multiple
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <Button
                          onClick={() => document.getElementById('file-upload')?.click()}
                          disabled={capturedPhotos.length >= 5 || isUploadingFiles}
                          className="w-full"
                        >
                          {isUploadingFiles ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Enviando...
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-2" />
                              Selecionar Imagens ({capturedPhotos.length}/5)
                            </>
                          )}
                        </Button>
                        <p className="text-xs text-muted-foreground text-center">
                          Você pode selecionar até {5 - capturedPhotos.length} imagem(ns) adicional(is)
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Preview das fotos capturadas */}
                <div className="space-y-4">
                  <h3 className="font-medium">Fotos Capturadas ({capturedPhotos.length}/5)</h3>
                  <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                    {capturedPhotos.map((photo, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={photo}
                          alt={`Foto ${index + 1}`}
                          className="w-full aspect-[3/4] object-cover rounded-lg"
                        />
                        <Button
                          onClick={() => handleRemovePhoto(index)}
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Botão de envio */}
                  <Button
                    onClick={handleSendPhotos}
                    disabled={capturedPhotos.length === 0 || isUploading}
                    className="w-full"
                  >
                    {isUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Enviar Fotos
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Barra de pesquisa */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome ou email do cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Lista de fotos */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">Carregando fotos...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFotos.length > 0 ? (
            filteredFotos.map((fotoCliente) => (
              <Card key={fotoCliente.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-primary" />
                      <div>
                        <CardTitle className="text-sm">{fotoCliente.cliente_nome}</CardTitle>
                        <p className="text-xs text-muted-foreground">{fotoCliente.cliente_email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {fotoCliente.fotos.length} foto{fotoCliente.fotos.length > 1 ? 's' : ''}
                      </Badge>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteAllPhotos(fotoCliente.id, fotoCliente.fotos)}
                        className="h-7 px-2"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                   {/* Grid de fotos */}
                   <div className="grid grid-cols-2 gap-2">
                     {fotoCliente.fotos.slice(0, 4).map((foto, index) => (
                       <div key={index} className="relative group">
                         <img
                           src={foto}
                           alt={`${fotoCliente.cliente_nome} - Foto ${index + 1}`}
                           className="w-full aspect-square object-cover rounded-lg"
                         />
                         <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                           <Button
                             size="sm"
                             variant="secondary"
                             onClick={() => window.open(foto, '_blank')}
                           >
                             <Eye className="h-3 w-3 mr-1" />
                             Ver
                           </Button>
                           <Button
                             size="sm"
                             variant="destructive"
                             onClick={() => handleDeletePhoto(fotoCliente.id, index, foto)}
                           >
                             <Trash2 className="h-3 w-3" />
                           </Button>
                         </div>
                       </div>
                     ))}
                   </div>

                  {/* Data de captura */}
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3 mr-1" />
                    {format(fotoCliente.data_captura, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-8">
              <ImageIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Nenhuma foto encontrada</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? "Nenhuma foto corresponde à sua pesquisa." : "Ainda não há fotos de clientes cadastradas."}
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsModalOpen(true)}>
                  <Camera className="h-4 w-4 mr-2" />
                  Tirar Primeira Foto
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};