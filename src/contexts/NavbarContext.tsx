import { createContext, useContext, useState, ReactNode } from 'react';

interface NavbarContextType {
  navbarVisible: boolean;
  setNavbarVisible: (visible: boolean) => void;
}

const NavbarContext = createContext<NavbarContextType | undefined>(undefined);

export const NavbarProvider = ({ children }: { children: ReactNode }) => {
  const [navbarVisible, setNavbarVisible] = useState(true);

  return (
    <NavbarContext.Provider value={{ navbarVisible, setNavbarVisible }}>
      {children}
    </NavbarContext.Provider>
  );
};

export const useNavbar = () => {
  const context = useContext(NavbarContext);
  if (context === undefined) {
    throw new Error('useNavbar must be used within a NavbarProvider');
  }
  return context;
};
