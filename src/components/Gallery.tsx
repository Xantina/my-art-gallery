import { useState } from 'react';
import { cn } from '@/lib/utils';
import { artworks, categories, Artwork } from '@/data/artworks';
import { ArtworkCard } from './ArtworkCard';
import { ArtworkModal } from './ArtworkModal';

import artworkFiles from '@/data/artwork-images.json';

const assetUrls = import.meta.glob<string>('/src/assets/*', {
  eager: true,
  query: '?url',
  import: 'default',
});
const artworkImages = Object.fromEntries(
  Object.entries(artworkFiles).map(([image, filename]) => [image, assetUrls['/src/assets/' + filename]])
);

// Sort a copy so the source data keeps its original order. Invalid dates go last.
const artworkTimestamp = (artwork: Artwork) => {
  const timestamp = Date.parse(artwork.date);
  return Number.isNaN(timestamp) ? -Infinity : timestamp;
};

const newestArtworks = [...artworks].sort(
  (a, b) => artworkTimestamp(b) - artworkTimestamp(a)
);

export const Gallery = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);

  const filteredArtworks = activeCategory === 'all' 
    ? newestArtworks
    : newestArtworks.filter(a => a.category === activeCategory);

  const getImageSrc = (artwork: Artwork) => {
    return artworkImages[artwork.image] || artwork.image;
  };

  return (
    <section id="gallery" className="py-24 relative">
      
      <div className="container mx-auto px-6 relative z-10">
        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-gold text-sm tracking-[0.3em] uppercase mb-4">
            Collection
          </p>
          <h2 className="font-display text-4xl md:text-5xl text-foreground mb-6">
            Featured Works
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Browse through my collection of original artworks.
          </p>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={cn(
                "px-6 py-2 rounded-full text-sm font-medium transition-all duration-300",
                activeCategory === category.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              {category.label}
            </button>
          ))}
        </div>

        {/* Gallery grid */}
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-4 auto-rows-min">
          {filteredArtworks.map((artwork, index) => (
            <ArtworkCard
              key={artwork.id}
              thumbnail={artwork.image in artworkFiles
                ? '/thumbnails/' + artwork.image.slice(1).replace(/\.[^.]+$/, '.webp')
                : artwork.image}
              artwork={{ ...artwork, image: getImageSrc(artwork) }}
              onView={(a) => setSelectedArtwork(a)}
              index={index}
            />
          ))}
        </div>
      </div>

      {/* Modal */}
      <ArtworkModal
        artwork={selectedArtwork}
        onClose={() => setSelectedArtwork(null)}
      />
    </section>
  );
};
