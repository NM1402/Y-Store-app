import React, { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { productsAPI } from '../utils/api';
import { useLanguage } from '../contexts/LanguageContext';

const TestimonialsSection = () => {
  const { t } = useLanguage();
  const [testimonials, setTestimonials] = useState([]);

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    try {
      const productsResponse = await productsAPI.getAll({ limit: 10 });
      const products = productsResponse.data;

      if (!products || products.length === 0) {
        return;
      }

      const testimonialsPromises = products
        .filter(p => p.reviews_count > 0)
        .slice(0, 3)
        .map(async (product) => {
          try {
            const response = await fetch(
              `${process.env.REACT_APP_BACKEND_URL}/api/reviews/product/${product.id}`
            );
            if (!response.ok) return [];
            const reviews = await response.json();
            return reviews.map(review => ({
              ...review,
              product_title: product.title
            }));
          } catch (error) {
            return [];
          }
        });

      const allReviews = await Promise.all(testimonialsPromises);
      const flatReviews = allReviews.flat();

      const sortedReviews = flatReviews
        .filter(r => r.rating >= 4)
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 6);

      setTestimonials(sortedReviews);
    } catch (error) {
      console.error('Failed to fetch testimonials:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (testimonials.length === 0) {
    return null;
  }

  return (
    <section data-testid="testimonials-section" className="py-16 bg-[#F7F9FC] rounded-2xl">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">{t('customerReviews')}</h2>
          <p className="text-gray-600">Что говорят наши покупатели</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={`${testimonial.id}-${index}`}
              data-testid={`testimonial-${index}`}
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
                  {testimonial.user_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-semibold text-[#121212]">{testimonial.user_name}</h4>
                  <p className="text-xs text-gray-500">{formatDate(testimonial.created_at)}</p>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-3">
                {testimonial.product_title}
              </p>

              <p className="text-gray-700 mb-4">
                {testimonial.comment}
              </p>

              <div className="flex items-center">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < testimonial.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="ml-2 text-sm font-medium">{testimonial.rating}/5</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
