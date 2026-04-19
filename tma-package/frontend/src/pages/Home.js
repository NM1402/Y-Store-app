import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { categoriesAPI, productsAPI } from '../utils/api';
import CustomSection from '../components/CustomSection';
import SEO from '../components/SEO';
import FeaturedReviews from '../components/FeaturedReviews';
import { useLanguage } from '../contexts/LanguageContext';
import { OrganizationSchema, WebSiteSchema, LocalBusinessSchema } from '../components/seo';
import useIsMobile from '../hooks/useIsMobile';

import { 
  DealOfDay, 
  PromoGrid, 
  BrandsStrip, 
  AdvantagesStrip, 
  Testimonials, 
  HeroCarousel,
  ProductSection,
  RecentlyViewed,
  NewsletterBlock,
  NewArrivals,
  MiniBannersRow,
  HomeSidebar
} from '../components/home';
import MobileCategoriesSlider from '../components/home/MobileCategoriesSlider';

const Home = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const isMobile = useIsMobile(1024); // Hide sidebar below 1024px
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [bestsellers, setBestsellers] = useState([]);
  const [customSections, setCustomSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [categoriesRes, featuredRes, sectionsRes] = await Promise.all([
        categoriesAPI.getAll(),
        productsAPI.getAll({ limit: 12, sort_by: 'popularity' }),
        axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/custom-sections`),
      ]);
      
      // Получаем бестселлеры
      const bestsellersRes = await productsAPI.getAll({ limit: 12 });
      const bestsellersData = bestsellersRes.data.filter(p => p.is_bestseller) || bestsellersRes.data.slice(0, 8);
      
      setCategories(categoriesRes.data);
      setFeaturedProducts(featuredRes.data);
      setBestsellers(bestsellersData);
      setCustomSections(sectionsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (categoryId) => {
    navigate(`/products?category=${categoryId}`);
  };

  return (
    <>
      {/* RETAIL LAYOUT CORE v2 - PROTECTED LAYOUT: Sidebar 280px + Banner */}
      <main data-testid="home-page">
        {/* Hero Section with Category Sidebar - FIXED LAYOUT */}
        <section className="ys-section">
          <div className="ys-container">
            <div 
              className="ys-home-hero" 
              data-layout="sidebar-banner"
              style={{ 
                display: 'grid', 
                /* PROTECTED: Always show sidebar space on desktop */
                gridTemplateColumns: isMobile ? '1fr' : '280px 1fr', 
                gap: '20px', 
                alignItems: 'stretch',
                width: '100%'
              }}
            >
              {/* PROTECTED: HomeSidebar always rendered on desktop, it handles loading internally */}
              {!isMobile && <HomeSidebar />}
              <HeroCarousel />
            </div>
          </div>
        </section>

        {/* Mobile Categories Slider - Only on mobile */}
        {isMobile && (
          <section className="ys-section-sm">
            <div className="ys-container">
              <MobileCategoriesSlider />
            </div>
          </section>
        )}

        {/* 1. ТОВАР сразу после баннера - Топ продажів */}
        <section className="ys-section">
          <div className="ys-container">
            <ProductSection title="Топ продажів" sort="popular" link="/catalog?sort=popular" />
          </div>
        </section>

        {/* 2. Популярні категорії (3 карточки: Топ смартфони, Ноутбуки, Розумний дім) */}
        <section className="ys-section-sm">
          <div className="ys-container">
            <MiniBannersRow />
          </div>
        </section>

        {/* 3. Advantages Strip - 6 иконок (Швидка доставка...) */}
        <section className="ys-section-sm">
          <div className="ys-container">
            <AdvantagesStrip />
          </div>
        </section>

        {/* 5. Ещё товары - New Arrivals */}
        <section className="ys-section">
          <div className="ys-container">
            <NewArrivals />
          </div>
        </section>

        {/* Deal of Day */}
        <section className="ys-section">
          <div className="ys-container">
            <DealOfDay />
          </div>
        </section>

        {/* Promo Grid */}
        <section className="ys-section">
          <div className="ys-container">
            <PromoGrid />
          </div>
        </section>

        {/* Custom Sections */}
        {customSections.map((section) => (
          <section key={section.id} className="ys-section">
            <div className="ys-container">
              <CustomSection sectionData={section} />
            </div>
          </section>
        ))}

        {/* Brands */}
        <section className="ys-section">
          <div className="ys-container">
            <BrandsStrip />
          </div>
        </section>

        {/* Recently Viewed */}
        <section className="ys-section">
          <div className="ys-container">
            <RecentlyViewed />
          </div>
        </section>

        {/* Testimonials */}
        <section className="ys-section">
          <div className="ys-container">
            <Testimonials />
          </div>
        </section>

        {/* Newsletter */}
        <section className="ys-section">
          <div className="ys-container">
            <NewsletterBlock />
          </div>
        </section>

        {/* Full Width Sections */}
        <FeaturedReviews />
      </main>
    </>
  );
};

export default Home;
