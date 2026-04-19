import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ActualOffers = () => {
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/actual-offers`);
      setOffers(response.data);
    } catch (error) {
      console.error('Failed to fetch actual offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOfferClick = (offer) => {
    // Всегда ведем на страницу предложения
    navigate(`/offer/${offer.id}`);
  };

  if (loading) {
    return (
      <div className="py-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (offers.length === 0) {
    return null;
  }

  return (
    <div className="py-8">
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
          Актуальні пропозиції
        </h2>
      </div>

      {/* Сетка для 5 баннеров: 2 больших сверху, 3 снизу */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {offers.slice(0, 5).map((offer, index) => {
          // Первый баннер занимает 2 колонки на десктопе
          const gridClass = index === 0 
            ? 'col-span-2 md:col-span-2 row-span-1 md:row-span-2' 
            : index === 1
            ? 'col-span-2 md:col-span-1 md:row-span-2'
            : 'col-span-1';

          return (
            <button
              key={offer.id}
              onClick={() => handleOfferClick(offer)}
              className={`${gridClass} relative overflow-hidden rounded-2xl group cursor-pointer transition-transform hover:scale-[1.02] shadow-lg hover:shadow-2xl min-h-[200px] md:min-h-[250px]`}
              style={{
                backgroundColor: offer.background_color,
                color: offer.text_color
              }}
            >
              {/* Background Image */}
              {offer.image_url && (
                <div 
                  className="absolute inset-0 bg-cover bg-center transition-transform group-hover:scale-105"
                  style={{ backgroundImage: `url(${offer.image_url})` }}
                />
              )}

              {/* Gradient Overlay для читаемости текста */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

              {/* Content */}
              <div className="relative z-10 h-full flex flex-col justify-end p-6">
                <h3 className="text-xl md:text-2xl lg:text-3xl font-bold mb-2 drop-shadow-lg">
                  {offer.title}
                </h3>
                {offer.subtitle && (
                  <p className="text-sm md:text-base opacity-90 drop-shadow-md">
                    {offer.subtitle}
                  </p>
                )}
              </div>

              {/* Hover indicator */}
              <div className="absolute inset-0 border-4 border-transparent group-hover:border-blue-500 transition-colors rounded-2xl pointer-events-none" />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ActualOffers;
