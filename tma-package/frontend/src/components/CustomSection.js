import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Flame, Sparkles, TrendingUp } from 'lucide-react';
import axios from 'axios';
import ProductCardCompact from './ProductCardCompact';
import ScrollReveal from './ScrollReveal';

const CustomSection = ({ sectionData }) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sectionData?.product_ids?.length > 0) {
      fetchProducts();
    } else {
      setLoading(false);
    }
  }, [sectionData]);

  const fetchProducts = async () => {
    try {
      // Получаем товары для раздела
      const productPromises = sectionData.product_ids.slice(0, 8).map(id =>
        axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/products/${id}`).catch(() => null)
      );
      
      const responses = await Promise.all(productPromises);
      const validProducts = responses
        .filter(res => res !== null)
        .map(res => res.data);
      
      setProducts(validProducts);
    } catch (error) {
      console.error('Failed to fetch products for section:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = () => {
    const slug = sectionData?.slug?.toLowerCase();
    if (slug?.includes('bestseller') || slug?.includes('hit')) {
      return <Flame className="w-6 h-6 text-red-500" />;
    } else if (slug?.includes('new')) {
      return <Sparkles className="w-6 h-6 text-green-500" />;
    } else if (slug?.includes('popular') || slug?.includes('trending')) {
      return <TrendingUp className="w-6 h-6 text-blue-500" />;
    }
    return null;
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

  if (!sectionData || products.length === 0) {
    return null;
  }

  return (
    <ScrollReveal>
      <section className="py-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            {getIcon()}
            <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {sectionData.title}
            </h2>
          </div>
          
          {products.length > 0 && (
            <Link
              to={`/section/${sectionData.slug}`}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold transition-colors group"
            >
              <span className="hidden sm:inline">Дивитись все</span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
        </div>

        {sectionData.description && (
          <p className="text-gray-600 mb-6">{sectionData.description}</p>
        )}

        {products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCardCompact key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl p-8 text-center border border-blue-100">
            <p className="text-gray-600 text-lg">
              {sectionData.title} поки немає. Додайте товари в адмінці.
            </p>
          </div>
        )}
      </section>
    </ScrollReveal>
  );
};

export default CustomSection;
