import React, { useState } from 'react';
import { Play, ZoomIn } from 'lucide-react';

const ProductImageGallery = ({ images = [], videos = [], productTitle, discount }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  
  // Combine images and videos
  const media = [
    ...images.map(img => ({ type: 'image', url: img })),
    ...videos.map(vid => ({ type: 'video', url: vid }))
  ];

  if (media.length === 0) {
    media.push({ type: 'image', url: 'https://via.placeholder.com/600' });
  }

  const currentMedia = media[selectedIndex];

  return (
    <div className="flex gap-3 sticky top-4">
      {/* Vertical Thumbnails (Left Side) */}
      {media.length > 1 && (
        <div className="flex flex-col gap-2" style={{ width: '90px' }}>
          {media.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                setSelectedIndex(index);
                setIsVideoPlaying(false);
              }}
              className={`aspect-square border-2 rounded-lg overflow-hidden transition-all relative hover:border-green-500 ${
                selectedIndex === index
                  ? 'border-green-500 shadow-md'
                  : 'border-gray-200'
              }`}
            >
              {item.type === 'image' ? (
                <img
                  src={item.url}
                  alt={`Миниатюра ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="relative w-full h-full bg-gray-100">
                  <video
                    src={item.url}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Play className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Main Image Display */}
      <div className="flex-1">
        <div className="bg-white rounded-xl border border-gray-200 relative group overflow-hidden">
          <div className="relative" style={{ paddingBottom: '100%' }}>
            {/* Discount Badge */}
            {discount > 0 && (
              <div className="absolute top-4 left-4 z-10">
                <div className="bg-red-500 text-white px-3 py-2 rounded-md text-sm font-bold shadow-lg">
                  -{discount}%
                </div>
              </div>
            )}

            {/* Zoom Icon */}
            <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-white/90 p-2 rounded-full shadow-lg cursor-pointer hover:bg-white">
                <ZoomIn className="w-5 h-5 text-gray-700" />
              </div>
            </div>

            {/* Media Content */}
            <div className="absolute inset-0 p-8 flex items-center justify-center">
              {currentMedia.type === 'image' ? (
                <img
                  src={currentMedia.url}
                  alt={`${productTitle} ${selectedIndex + 1}`}
                  className="max-w-full max-h-full object-contain cursor-zoom-in transition-transform hover:scale-105"
                />
              ) : (
                <div className="relative w-full h-full">
                  <video
                    src={currentMedia.url}
                    controls={isVideoPlaying}
                    className="w-full h-full object-contain"
                    onClick={() => setIsVideoPlaying(true)}
                  />
                  {!isVideoPlaying && (
                    <button
                      onClick={() => setIsVideoPlaying(true)}
                      className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 hover:bg-opacity-30 transition-all"
                    >
                      <div className="bg-white rounded-full p-6 shadow-xl hover:scale-110 transition-transform">
                        <Play className="w-10 h-10 text-gray-900" />
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Info Badges (Like on anser.in.ua) */}
        <div className="flex gap-2 mt-3">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 flex items-center gap-2">
            <span className="text-yellow-600 text-sm font-medium">⚡ Швидка доставка</span>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-2">
            <span className="text-green-600 text-sm font-medium">✓ Товар у наявності</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductImageGallery;
