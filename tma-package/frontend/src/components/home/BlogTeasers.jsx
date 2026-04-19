import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Clock, Eye } from "lucide-react";

/**
 * BlogTeasers - Blog/news preview section
 * BLOCK V2-14: Homepage Retail Component
 */
const blogPosts = [
  {
    title: "Як обрати смартфон у 2026 році: повний гід",
    excerpt: "Розбираємо основні критерії вибору смартфона: процесор, камера, батарея...",
    image: "📱",
    category: "Гіди",
    readTime: "5 хв",
    views: 1240,
  },
  {
    title: "Топ-10 аксесуарів для вашого ноутбука",
    excerpt: "Підвищуємо продуктивність роботи за допомогою корисних гаджетів...",
    image: "💻",
    category: "Підбірки",
    readTime: "3 хв",
    views: 890,
  },
  {
    title: "Порівняння iPhone 15 Pro vs Samsung S24 Ultra",
    excerpt: "Детальне порівняння двох флагманів: що краще вибрати у 2026 році...",
    image: "⚔️",
    category: "Порівняння",
    readTime: "8 хв",
    views: 2100,
  },
];

const BlogTeasers = () => {
  const navigate = useNavigate();

  return (
    <div className="blog-teasers" data-testid="blog-teasers">
      <div className="section-header">
        <h2 className="section-title">Корисні статті</h2>
        <button 
          className="section-link"
          onClick={() => navigate('/blog')}
        >
          Всі статті
          <ArrowRight size={18} />
        </button>
      </div>
      
      <div className="blog-grid">
        {blogPosts.map((post, i) => (
          <div key={i} className="blog-card">
            <div className="blog-card-image">
              <span className="blog-card-emoji">{post.image}</span>
              <span className="blog-card-category">{post.category}</span>
            </div>
            <div className="blog-card-content">
              <h3 className="blog-card-title">{post.title}</h3>
              <p className="blog-card-excerpt">{post.excerpt}</p>
              <div className="blog-card-meta">
                <span className="blog-meta-item">
                  <Clock size={14} />
                  {post.readTime}
                </span>
                <span className="blog-meta-item">
                  <Eye size={14} />
                  {post.views}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BlogTeasers;
