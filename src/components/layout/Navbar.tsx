import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, User, LogOut, Settings, ChevronDown, ChevronUp, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeSelector } from "@/components/ThemeSelector";
import { shouldShowFullscreenButton } from "@/utils/device-detection";
import logoIcon from "@/assets/confallony-logo-icon.png";
import maleProfileAvatar from "@/assets/male-profile-avatar.jpg";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
const Navbar = () => {
  const {
    currentUser,
    userData,
    logout,
    loading
  } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [localUserData, setLocalUserData] = useState<any>(null);
  const [navbarVisible, setNavbarVisible] = useState(true);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const navigate = useNavigate();

  // Check if fullscreen button should be shown
  useEffect(() => {
    const checkDevice = () => {
      setShowFullscreen(shouldShowFullscreenButton());
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Carrega dados do usuário do localStorage ao montar o componente
  useEffect(() => {
    const loadUserData = () => {
      const storedUserData = localStorage.getItem('userData');
      if (storedUserData) {
        try {
          const parsedData = JSON.parse(storedUserData);
          setLocalUserData(parsedData);
        } catch (error) {
          console.error("Error parsing stored user data:", error);
          localStorage.removeItem('userData');
        }
      }
    };
    loadUserData();

    // Também carrega quando userData muda
    if (userData) {
      setLocalUserData(userData);
    }
  }, [userData]);

  const toggleMenu = () => setIsOpen(!isOpen);
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };
  const toggleNavbarVisibility = () => {
    setNavbarVisible(!navbarVisible);
  };
  const handleLogout = async () => {
    try {
      await logout();
      setLocalUserData(null); // Limpa dados locais
      navigate("/");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };
  const getInitials = (name: string) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '';
  };

  // Função para obter os dados do usuário com fallback para localStorage
  const getUserData = () => {
    const data = userData || localUserData;
    return data;
  };
  const currentUserData = getUserData();
  const displayName = currentUserData?.nome || currentUser?.displayName || 'Usuário';
  const displayEmail = currentUserData?.email || currentUser?.email || '';
  const avatarUrl = currentUserData?.avatar_url || maleProfileAvatar;
  
  // Só mostra o profile quando tiver dados reais carregados
  const isUserDataLoaded = !loading && currentUserData && currentUserData.nome && currentUserData.nome !== 'Usuário';
  return <>
      {/* Botão flutuante para mostrar/ocultar navbar */}
      <button onClick={toggleNavbarVisibility} className={`fixed right-4 z-50 p-2 rounded-full bg-primary text-white shadow-lg transition-all duration-300 ${navbarVisible ? 'top-16 opacity-70 hover:opacity-100' : 'top-4 opacity-15 hover:opacity-100'}`} aria-label={navbarVisible ? "Ocultar barra de navegação" : "Mostrar barra de navegação"}>
        {navbarVisible ? <ChevronUp className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Navbar principal */}
      <nav className={`bg-background border-b border-border fixed top-0 left-0 right-0 z-40 transition-transform duration-300 ${navbarVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="max-w-full px-2 sm:px-4">
          <div className="flex items-center h-14 sm:h-16">
            {/* Logo/Brand - Left com pouco espaço */}
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="flex items-center">
                
                
              </Link>
            </div>

            {/* Desktop Navigation - Center */}
            {(currentUser || localUserData) && <div className="hidden lg:flex items-center justify-center flex-1 space-x-6 lg:space-x-8">
                <Link to="/booking-local" className="text-foreground hover:text-primary transition-colors whitespace-nowrap">
                  Agendar
                </Link>

                <Link to="/queue" className="text-foreground hover:text-primary transition-colors whitespace-nowrap">Atendimento</Link>
                <Link to="/comandas" className="text-foreground hover:text-primary transition-colors whitespace-nowrap">
                  Comandas
                </Link>
                <Link to="/produtos" className="text-foreground hover:text-primary transition-colors whitespace-nowrap" title="Ver produtos da barbearia">
                  Produtos
                </Link>
                {(currentUserData?.isAdmin || userData?.isAdmin) && <Link to="/admin" className="text-foreground hover:text-primary transition-colors whitespace-nowrap">Administrativo</Link>}
                <Link to="/profile" className="text-foreground hover:text-primary transition-colors whitespace-nowrap">
                  Perfil
                </Link>
              </div>}

            {/* Desktop Right Side - Tema primeiro, depois perfil/login, depois fullscreen */}
            <div className="hidden lg:flex items-center space-x-2 lg:space-x-3 ml-auto mr-2">
              {/* Theme Selector */}
              <ThemeSelector />
              
              {/* Profile Dropdown ou Login/Cadastro */}
              {isUserDataLoaded ? <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 px-3 py-2 h-auto whitespace-nowrap">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={avatarUrl} />
                        <AvatarFallback>
                          {getInitials(displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col items-start hidden xl:flex">
                        <span className="text-sm font-medium">{displayName}</span>
                        <span className="text-xs text-muted-foreground">Minha conta</span>
                      </div>
                      <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0 ml-1 hidden xl:block" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="p-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={avatarUrl} />
                          <AvatarFallback>
                            {getInitials(displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <p className="text-sm font-medium">{displayName}</p>
                          <p className="text-xs text-muted-foreground">{displayEmail}</p>
                        </div>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="w-full">
                        <User className="mr-2 h-4 w-4" />
                        Meu perfil
                      </Link>
                    </DropdownMenuItem>
                    {(currentUserData?.isAdmin || userData?.isAdmin) && <DropdownMenuItem asChild>
                        <Link to="/admin" className="w-full">
                          <Settings className="mr-2 h-4 w-4" />
                          Painel Admin
                        </Link>
                      </DropdownMenuItem>}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu> : <>
                  <Link to="/login">
                    <Button variant="ghost">
                      Entrar
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button variant="default" className="btn-hero">
                      Cadastrar
                    </Button>
                  </Link>
                </>}
              
              {/* Fullscreen Button - Apenas Desktop para usuários autenticados */}
              {showFullscreen && (currentUser || localUserData) && <Button variant="ghost" size="icon" onClick={toggleFullScreen} className="rounded-full" aria-label="Maximizar tela">
                  <Maximize2 className="h-5 w-5" />
                </Button>}
            </div>

            {/* Mobile menu button */}
            <div className="lg:hidden flex items-center space-x-2 ml-auto">
              {/* Theme Selector - Mobile */}
              <ThemeSelector />
              
              {/* Para usuários autenticados - mostra menu */}
              {isUserDataLoaded && <Button variant="ghost" size="sm" onClick={toggleMenu} className="h-8 w-8 p-0">
                  {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </Button>}
              
              {/* Para usuários não autenticados - mostra botões de login */}
              {!isUserDataLoaded && <>
                  <Link to="/login">
                    <Button variant="ghost" size="sm" className="text-xs px-2">
                      Entrar
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button variant="default" size="sm" className="btn-hero text-xs px-2">
                      Cadastrar
                    </Button>
                  </Link>
                </>}
            </div>
          </div>

          {/* Mobile Navigation */}
          {isOpen && isUserDataLoaded && <div className="lg:hidden">
              <div className="px-3 pt-3 pb-4 space-y-2 bg-card border-t border-border">
                <Link to="/booking-local" className="block px-4 py-3 text-foreground hover:text-primary hover:bg-accent/50 rounded-lg transition-colors" onClick={toggleMenu}>
                  Agendar
                </Link>
                
                <Link to="/queue" className="block px-4 py-3 text-foreground hover:text-primary hover:bg-accent/50 rounded-lg transition-colors" onClick={toggleMenu}>
                  Fila
                </Link>
                <Link to="/comandas" className="block px-4 py-3 text-foreground hover:text-primary hover:bg-accent/50 rounded-lg transition-colors" onClick={toggleMenu}>
                  Comandas
                </Link>
                <Link to="/produtos" className="block px-4 py-3 text-foreground hover:text-primary hover:bg-accent/50 rounded-lg transition-colors" onClick={toggleMenu} title="Ver produtos da barbearia">
                  Produtos
                </Link>
                {(currentUserData?.isAdmin || userData?.isAdmin) && <Link to="/admin" className="block px-4 py-3 text-foreground hover:text-primary hover:bg-accent/50 rounded-lg transition-colors" onClick={toggleMenu}>
                    Admin
                  </Link>}
                <Link to="/profile" className="block px-4 py-3 text-foreground hover:text-primary hover:bg-accent/50 rounded-lg transition-colors" onClick={toggleMenu}>
                  Perfil
                </Link>
                
                <div className="border-t border-border pt-4 mt-4">
                  <div className="flex items-center px-4 py-3 mb-3 bg-accent/30 rounded-lg">
                    <Avatar className="h-10 w-10 mr-3">
                      <AvatarImage src={avatarUrl} />
                      <AvatarFallback>
                        {getInitials(displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{displayName}</p>
                      <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
                    </div>
                  </div>
                  <Link to="/profile" onClick={toggleMenu}>
                    <Button variant="ghost" className="w-full justify-start mb-2 h-10">
                      <User className="h-4 w-4 mr-3" />
                      Meu perfil
                    </Button>
                  </Link>
                  <Button variant="ghost" className="w-full justify-start h-10" onClick={() => {
                handleLogout();
                toggleMenu();
              }}>
                    <LogOut className="h-4 w-4 mr-3" />
                    Sair
                  </Button>
                </div>
              </div>
            </div>}
        </div>
      </nav>
    </>;
};
export default Navbar;