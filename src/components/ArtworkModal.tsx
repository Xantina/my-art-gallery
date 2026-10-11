import { useEffect } from 'react';
import { Artwork } from '@/data/artworks';
import { X } from 'lucide-react';

interface ArtworkModalProps {
  artwork: Artwork | null;
  onClose: () => void;
}

export const ArtworkModal = ({ artwork, onClose }: ArtworkModalProps) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (artwork) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEsc);
    }
    
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [artwork, onClose]);

  if (!artwork) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/95 backdrop-blur-sm animate-fade-in" />
      
      {/* Modal content */}
      <div 
        className="relative z-10 max-w-6xl w-full max-h-[90vh] flex flex-col md:flex-row gap-8 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 md:top-0 md:-right-12 p-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={24} />
        </button>

        {/* Image */}
        <div className="flex-1 flex items-center justify-center">
          <img
            src={artwork.image}
            alt={artwork.title}
            className="max-w-full max-h-[60vh] md:max-h-[80vh] object-contain rounded-lg shadow-2xl"
          />
        </div>

        {/* Details */}
        <div className="w-full md:w-80 flex flex-col justify-center">
          <p className="text-gold text-xs tracking-[0.3em] uppercase mb-2">
            {artwork.category}
          </p>
          <h2 className="font-display text-3xl md:text-4xl text-foreground mb-4">
            {artwork.title}
          </h2>
          
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Date</span>
              <span className="text-foreground">{artwork.date}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
