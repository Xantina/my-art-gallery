import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface HeaderProps {
  className?: string;
}

export const Header = ({ className }: HeaderProps) => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const handleLinkClick = () => {
    setIsMenuOpen(false);
  };

  return (
    <header className={cn("fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50", className)}>
      <nav className="container mx-auto px-6 py-4 flex items-center justify-between">
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          <Link 
            to="/" 
            className={cn(
              "text-sm transition-colors",
              isActive('/') ? "text-gold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Home
          </Link>
          <Link 
            to="/gallery" 
            className={cn(
              "text-sm transition-colors",
              isActive('/gallery') ? "text-gold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Gallery
          </Link>
                    <Link 
            to="/termsofservice" 
            className={cn(
              "text-sm transition-colors",
              isActive('/termsofservice') ? "text-gold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            ToS
          </Link>

          <Link 
            to="/contact" 
            className={cn(
              "text-sm transition-colors",
              isActive('/contact') ? "text-gold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Contact
          </Link>
        </div>

        {/* Animated Hamburger Menu Button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden relative w-10 h-10 flex flex-col items-center justify-center gap-1.5 group"
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}
          aria-controls="mobile-menu"
        >
          <span 
            className={cn(
              "w-7 h-0.5 rounded-full transition-all duration-300 ease-in-out",
              "bg-gradient-to-r from-gold via-amber-400 to-rose-400",
              isMenuOpen ? "rotate-45 translate-y-2" : "group-hover:w-5"
            )}
          />
          <span 
            className={cn(
              "w-7 h-0.5 rounded-full transition-all duration-300 ease-in-out",
              "bg-gradient-to-r from-rose-400 via-violet-400 to-cyan-400",
              isMenuOpen ? "opacity-0 scale-0" : "opacity-100 scale-100"
            )}
          />
          <span 
            className={cn(
              "w-7 h-0.5 rounded-full transition-all duration-300 ease-in-out",
              "bg-gradient-to-r from-cyan-400 via-teal-400 to-gold",
              isMenuOpen ? "-rotate-45 -translate-y-2" : "group-hover:w-5"
            )}
          />
        </button>
      </nav>

      {/* Mobile Menu Overlay */}
      <div 
        id="mobile-menu"
        className={cn(
          "md:hidden absolute inset-x-0 top-full h-[calc(100dvh-73px)] overflow-y-auto bg-background border-t border-border/50 transition-opacity duration-300 ease-in-out",
          isMenuOpen ? "opacity-100 visible" : "opacity-0 invisible"
        )}
      >
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-gold/20 via-amber-500/10 to-transparent rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-tr from-rose-500/20 via-violet-500/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gradient-to-r from-cyan-500/15 via-teal-500/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>
        
        <nav className="relative flex flex-col items-center justify-start px-6 pt-12 min-h-full gap-10 pb-12">
          <Link 
            to="/" 
            onClick={handleLinkClick}
            className={cn(
              "text-3xl font-display font-semibold transition-all duration-300 transform",
              isMenuOpen ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
              isActive('/') 
                ? "bg-gradient-to-r from-gold via-amber-400 to-rose-400 bg-clip-text text-transparent" 
                : "text-foreground hover:bg-gradient-to-r hover:from-gold hover:via-amber-400 hover:to-rose-400 hover:bg-clip-text hover:text-transparent"
            )}
            style={{ transitionDelay: isMenuOpen ? '100ms' : '0ms' }}
          >
            Home
          </Link>
          <Link 
            to="/gallery" 
            onClick={handleLinkClick}
            className={cn(
              "text-3xl font-display font-semibold transition-all duration-300 transform",
              isMenuOpen ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
              isActive('/gallery') 
                ? "bg-gradient-to-r from-rose-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent" 
                : "text-foreground hover:bg-gradient-to-r hover:from-rose-400 hover:via-violet-400 hover:to-cyan-400 hover:bg-clip-text hover:text-transparent"
            )}
            style={{ transitionDelay: isMenuOpen ? '200ms' : '0ms' }}
          >
            Gallery
          </Link>
          <Link
            to="/termsofservice"
            onClick={handleLinkClick}
            className={cn(
              "text-3xl font-display font-semibold transition-all duration-300 transform",
              isMenuOpen ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
              isActive('/termsofservice') ? "text-gold" : "text-foreground hover:text-gold"
            )}
            style={{ transitionDelay: isMenuOpen ? '300ms' : '0ms' }}
          >
            Terms of Service
          </Link>
          <Link 
            to="/contact" 
            onClick={handleLinkClick}
            className={cn(
              "text-3xl font-display font-semibold transition-all duration-300 transform",
              isMenuOpen ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
              isActive('/contact') 
                ? "bg-gradient-to-r from-cyan-400 via-teal-400 to-gold bg-clip-text text-transparent" 
                : "text-foreground hover:bg-gradient-to-r hover:from-cyan-400 hover:via-teal-400 hover:to-gold hover:bg-clip-text hover:text-transparent"
            )}
            style={{ transitionDelay: isMenuOpen ? '400ms' : '0ms' }}
          >
            Contact
          </Link>
        </nav>
      </div>
    </header>
  );
};
