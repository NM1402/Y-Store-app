import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  MessageCircle,
  ChevronRight,
  Send,
} from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { toast } from "sonner";
import api from "../utils/api";
import { getHeaderConfig } from "../api/site";

// Social Icons - same as Header
const SocialIcon = ({ type, size = 20 }) => {
  const icons = {
    telegram: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    ),
    instagram: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
    tiktok: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
    facebook: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    viber: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.398.002C9.474.028 5.186.251 3.01 2.31.513 4.691.041 8.33.002 12.041c-.04 3.712.323 7.352 2.852 10.134v2.825s-.017.698.45.851c.558.185.908-.366.908-.366l1.937-2.161c3.293.628 7.023.534 10.333.02 3.872-.601 7.32-2.224 8.097-7.872.92-6.69-.217-11.012-3.536-13.126C18.398.765 15.64.02 11.398.002z" />
      </svg>
    ),
  };
  return icons[type] || null;
};

// Social colors
const socialColors = {
  telegram: "bg-[#0088cc]",
  instagram: "bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737]",
  tiktok: "bg-black",
  facebook: "bg-[#1877F2]",
  viber: "bg-[#7360f2]",
};

// Legal Modal Component
const LegalModal = ({ isOpen, onClose, title, content }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 bg-white border-b">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 transition-colors bg-gray-100 rounded-full hover:bg-gray-200"
          >
            <span className="text-xl leading-none text-gray-500">&times;</span>
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
          <div
            className="prose-sm prose max-w-none"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      </div>
    </div>
  );
};

const Footer = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const location = useLocation();
  const [callbackForm, setCallbackForm] = useState({
    name: "",
    phone: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [headerConfig, setHeaderConfig] = useState(null);
  const [legalModal, setLegalModal] = useState({ isOpen: false, type: null });
  const [legalContent, setLegalContent] = useState({
    terms: { title: "Угода користувача", content: "<p>Завантаження...</p>" },
    privacy: {
      title: "Політика конфіденційності",
      content: "<p>Завантаження...</p>",
    },
    cookies: { title: "Політика Cookie", content: "<p>Завантаження...</p>" },
  });

  // Hide map for logged in users or on admin/cabinet pages
  const isPrivatePage =
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/cabinet") ||
    location.pathname.startsWith("/profile") ||
    location.pathname.startsWith("/seller");
  const showMap = !user && !isPrivatePage;

  // Fetch header config (for socials sync)
  useEffect(() => {
    getHeaderConfig().then(setHeaderConfig).catch(console.error);

    // Fetch legal content
    fetch(`${process.env.REACT_APP_BACKEND_URL}/api/v2/site/legal`)
      .then((r) => r.json())
      .then((data) => {
        if (data) setLegalContent(data);
      })
      .catch(() => {});
  }, []);

  const enabledSocials = headerConfig?.socials?.filter((s) => s.enabled) || [];
  const phones = headerConfig?.phones || ["+380502474161", "+380637247703"];

  const handleCallbackSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/contact/callback", callbackForm);
      toast.success("Запит надіслано! Ми зв'яжемося з вами.");
      setCallbackForm({ name: "", phone: "", message: "" });
    } catch (error) {
      toast.error("Помилка надсилання");
    } finally {
      setLoading(false);
    }
  };

  const openLegalModal = (type) => {
    setLegalModal({ isOpen: true, type });
  };

  const infoLinks = [
    { to: "/contact", label: "Контактна інформація" },
    { to: "/delivery-payment", label: "Доставка і оплата" },
    { to: "/exchange-return", label: "Обмін і повернення" },
    { to: "/about", label: "Про нас" },
  ];

  const legalLinks = [
    { type: "terms", label: "Угода користувача" },
    { type: "privacy", label: "Політика конфіденційності" },
    { type: "cookies", label: "Політика Cookie" },
  ];

  return (
    <>
      <footer className="ys-footer" data-testid="footer">
        {/* Map Section - Hidden for logged in users and private pages */}
        {showMap && (
          <div className="ys-footer-map">
            <iframe
              title="Наше розташування"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2541.8355344869385!2d30.62019931574054!3d50.419936679474754!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40d4c5c6e3d3b3b3%3A0x1234567890abcdef!2z0L_RgNC-0YHQv9C10LrRgiDQnNC40LrQvtC70Lgg0JHQsNC20LDQvdCwLCAyNC8xLCDQmtC40ZfQsiwg0KPQutGA0LDRl9C90LAsIDAyMTQ5!5e0!3m2!1suk!2sua!4v1234567890123!5m2!1suk!2sua"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              className="transition-all duration-500 grayscale hover:grayscale-0"
            />

            {/* Map Overlay Card */}
            <div className="ys-footer-map-card">
              <div className="ys-footer-map-icon">
                <MapPin size={24} />
              </div>
              <div className="ys-footer-map-info">
                <h3>Y-store</h3>
                <p>
                  проспект Миколи Бажана, 24/1
                  <br />
                  Київ, Україна, 02149
                </p>
                <a
                  href="https://www.google.com/maps/dir//проспект+Миколи+Бажана,+24/1,+Київ,+02149"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ys-footer-map-btn"
                >
                  Як дістатись <ChevronRight size={16} />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Main Footer Content */}
        <div className="ys-footer-main">
          <div className="ys-container">
            <div className="ys-footer-grid">
              {/* Company Info */}
              <div className="ys-footer-col">
                <h3 className="ys-footer-logo">Y-store</h3>
                <p className="ys-footer-desc">
                  Приєднуйтесь до тисяч успішних продавців на нашій платформі.
                  Створіть свій магазин і почніть заробляти вже сьогодні.
                </p>
              </div>

              {/* Information Links */}
              <div className="ys-footer-col">
                <h4 className="ys-footer-heading">Інформація</h4>
                <ul className="ys-footer-links">
                  {infoLinks.map((link) => (
                    <li key={link.to}>
                      <Link to={link.to}>
                        <span className="ys-footer-dot" />
                        {link.label}
                      </Link>
                    </li>
                  ))}
                  {legalLinks.map((link) => (
                    <li key={link.type}>
                      <button onClick={() => openLegalModal(link.type)}>
                        <span className="ys-footer-dot" />
                        {link.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Contact Info */}
              <div className="ys-footer-col">
                <h4 className="ys-footer-heading">Контактна інформація</h4>
                <div className="ys-footer-contacts">
                  <div className="ys-footer-contact">
                    <MapPin size={18} />
                    <span>
                      проспект Миколи Бажана, 24/1
                      <br />
                      Київ, Україна, 02149
                    </span>
                  </div>
                  <div className="ys-footer-contact">
                    <Phone size={18} />
                    <div className="ys-footer-phones">
                      {phones.map((phone, i) => (
                        <a key={i} href={`tel:${phone.replace(/\s/g, "")}`}>
                          {phone}
                        </a>
                      ))}
                    </div>
                  </div>
                  <div className="ys-footer-contact">
                    <Mail size={18} />
                    <a href="mailto:support@y-store.in.ua">
                      support@y-store.in.ua
                    </a>
                  </div>
                </div>

                {/* Social Links - from admin config */}
                <div className="ys-footer-socials">
                  <p className="ys-footer-socials-label">Ми в соцмережах</p>
                  <div className="ys-footer-socials-list">
                    {enabledSocials.length > 0 ? (
                      enabledSocials.map((social) => (
                        <a
                          key={social.type}
                          href={social.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`ys-footer-social ${socialColors[social.type] || "bg-gray-600"}`}
                          title={social.type}
                        >
                          <SocialIcon type={social.type} size={18} />
                        </a>
                      ))
                    ) : (
                      <>
                        <a
                          href="https://t.me/ystore"
                          target="_blank"
                          rel="noreferrer"
                          className="ys-footer-social bg-[#0088cc]"
                        >
                          <SocialIcon type="telegram" size={18} />
                        </a>
                        <a
                          href="https://instagram.com/ystore"
                          target="_blank"
                          rel="noreferrer"
                          className="ys-footer-social bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737]"
                        >
                          <SocialIcon type="instagram" size={18} />
                        </a>
                        <a
                          href="viber://chat?number=%2B380502474161"
                          target="_blank"
                          rel="noreferrer"
                          className="ys-footer-social bg-[#7360f2]"
                        >
                          <SocialIcon type="viber" size={18} />
                        </a>
                      </>
                    )}
                  </div>
                </div>
                {/* Telegram Mini App Badge */}
                <div className="ys-tma-badge-wrapper">
                  <p className="ys-footer-socials-label">Магазин у Telegram</p>
                  <a
                    href="https://t.me/Ystore_app_bot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ys-tma-badge"
                    data-testid="tma-badge"
                    aria-label="Відкрити Y-Store у Telegram Mini App"
                  >
                    <span className="ys-tma-badge__icon">
                      <SocialIcon type="telegram" size={26} />
                    </span>
                    <span className="ys-tma-badge__label">
                      Telegram Mini App
                    </span>
                    <span className="ys-tma-badge__arrow" aria-hidden="true">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M9 6l6 6-6 6"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </a>
                </div>
              </div>

              {/* Working Hours */}
              <div className="ys-footer-col">
                <h4 className="ys-footer-heading">Години роботи</h4>
                <div className="ys-footer-hours">
                  <div className="ys-footer-hour">
                    <Clock size={16} />
                    <span>Пн-Пт: 9:00 - 19:00</span>
                  </div>
                  <div className="ys-footer-hour">
                    <Clock size={16} />
                    <span>Субота: 10:00 - 18:00</span>
                  </div>
                  <div className="ys-footer-hour">
                    <Clock size={16} />
                    <span>Неділя: 10:00 - 18:00</span>
                  </div>
                  <div className="ys-footer-online">
                    <span className="ys-footer-online-dot" />
                    Замовлення: online 24/7
                  </div>
                </div>
                <a
                  href="https://www.google.com/maps/dir//проспект+Миколи+Бажана,+24/1,+Київ,+02149"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ys-footer-directions"
                >
                  <MapPin size={16} />
                  Як дістатись
                </a>
              </div>

              {/* Callback Form */}
              <div className="ys-footer-col">
                <h4 className="ys-footer-heading">Замовити дзвінок</h4>
                <form
                  onSubmit={handleCallbackSubmit}
                  className="ys-footer-form"
                >
                  <Input
                    placeholder="Ваше ім'я"
                    value={callbackForm.name}
                    onChange={(e) =>
                      setCallbackForm({ ...callbackForm, name: e.target.value })
                    }
                    required
                    className="ys-footer-input"
                  />
                  <Input
                    type="tel"
                    placeholder="Ваш телефон"
                    value={callbackForm.phone}
                    onChange={(e) =>
                      setCallbackForm({
                        ...callbackForm,
                        phone: e.target.value,
                      })
                    }
                    required
                    className="ys-footer-input"
                  />
                  <Textarea
                    placeholder="Ваше повідомлення"
                    value={callbackForm.message}
                    onChange={(e) =>
                      setCallbackForm({
                        ...callbackForm,
                        message: e.target.value,
                      })
                    }
                    rows={3}
                    className="ys-footer-input"
                  />
                  <Button
                    type="submit"
                    disabled={loading}
                    className="ys-footer-submit"
                  >
                    <Send size={16} />
                    {loading ? "Надсилання..." : "Відправити"}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="ys-footer-bottom">
          <div className="ys-container">
            <p>© 2026 Y-store. Всі права захищені.</p>
          </div>
        </div>
      </footer>

      {/* Legal Modals */}
      {legalModal.type && (
        <LegalModal
          isOpen={legalModal.isOpen}
          onClose={() => setLegalModal({ isOpen: false, type: null })}
          title={legalContent[legalModal.type]?.title}
          content={legalContent[legalModal.type]?.content}
        />
      )}
    </>
  );
};

export default Footer;
