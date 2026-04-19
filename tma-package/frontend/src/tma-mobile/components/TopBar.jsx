/**
 * TopBar - Dynamic top navigation
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import telegram from '../lib/telegram-sdk';
import './TopBar.css';

const TopBar = ({ title, showBack = false, onBack, children }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
    telegram.haptic('light');
  };

  return (
    <header className="top-bar" data-testid="top-bar">
      <div className="top-bar__left">
        {showBack && (
          <button className="top-bar__back" onClick={handleBack} data-testid="top-bar-back">
            <ChevronLeft size={24} />
          </button>
        )}
      </div>
      <div className="top-bar__center">
        <h1 className="top-bar__title">{title}</h1>
      </div>
      <div className="top-bar__right">
        {children}
      </div>
    </header>
  );
};

export default TopBar;
