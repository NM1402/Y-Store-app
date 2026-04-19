import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Flame, Sparkles, TrendingUp } from 'lucide-react';
import axios from 'axios';
import ProductCardCompact from '../components/ProductCardCompact';
import ScrollReveal from '../components/ScrollReveal';

const SectionDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [section, setSection] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSectionData();
  }, [slug]);

  const fetchSectionData = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/custom-sections/${slug}`);
      setSection(response.data.section);
      setProducts(response.data.products);
    } catch (error) {
      console.error('Failed to fetch section:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = () => {
    const sectionSlug = slug?.toLowerCase();
    if (sectionSlug?.includes('bestseller') || sectionSlug?.includes('hit')) {
      return <Flame className="w-8 h-8 md:w-10 md:h-10 text-red-500" />;
    } else if (sectionSlug?.includes('new')) {
      return <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-green-500" />;
    } else if (sectionSlug?.includes('popular') || sectionSlug?.includes('trending')) {
      return <TrendingUp className="w-8 h-8 md:w-10 md:h-10 text-blue-500" />;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!section) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Розділ не знайдено</h2>
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            Повернутися на головну
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-blue-50">
      {/* Hero Banner */}
      <div className="relative overflow-hidden">
        {section.banner_image_url ? (
          <div
            className="h-64 md:h-80 bg-cover bg-center"
            style={{ backgroundImage: `url(${section.banner_image_url})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/30" />
          </div>
        ) : (
          <div className="h-64 md:h-80 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600" />
        )}

        <div className="absolute inset-0 flex items-center">
          <div className="container-main">
            <ScrollReveal>
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-white hover:text-gray-200 mb-4 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Назад на головну</span>
              </button>
              
              <div className="flex items-center gap-4 mb-4">
                {getIcon()}
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
                  {section.title}
                </h1>
              </div>
              
              {section.description && (
                <p className="text-lg text-white/90 max-w-2xl">
                  {section.description}
                </p>
              )}
            </ScrollReveal>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container-main py-12">
        {section.description_html && (
          <ScrollReveal>
            <div 
              className="prose prose-lg max-w-none mb-12 bg-white rounded-3xl p-8 shadow-lg"
              dangerouslySetInnerHTML={{ __html: section.description_html }}
            />
          </ScrollReveal>
        )}

        {/* Products Grid */}
        {products.length > 0 ? (
          <ScrollReveal delay={200}>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Товари у цьому розділі ({products.length})
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {products.map((product) => (
                <ProductCardCompact key={product.id} product={product} />
              ))}
            </div>
          </ScrollReveal>
        ) : (
          <ScrollReveal>
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl p-12 text-center border border-blue-100">
              <div className="flex justify-center mb-4">
                {getIcon()}
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Товарів у цьому розділі поки немає
              </h3>
              <p className="text-gray-600">
                Незабаром тут з'являться нові товари!
              </p>
            </div>
          </ScrollReveal>
        )}
      </div>
    </div>
  );
};

export default SectionDetail;
