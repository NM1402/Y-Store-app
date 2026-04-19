import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Globe } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

const LanguageSwitcher = () => {
  const { language, changeLanguage } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button data-testid="language-switcher" variant="ghost" size="sm" className="gap-2">
          <Globe className="w-4 h-4" />
          <span className="text-sm font-medium">{language === 'ru' ? 'RU' : 'UA'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          data-testid="lang-ru"
          onClick={() => changeLanguage('ru')}
          className={language === 'ru' ? 'bg-gray-100' : ''}
        >
          <span className="mr-2">🇷🇺</span>
          Русский
        </DropdownMenuItem>
        <DropdownMenuItem
          data-testid="lang-ua"
          onClick={() => changeLanguage('ua')}
          className={language === 'ua' ? 'bg-gray-100' : ''}
        >
          <span className="mr-2">🇺🇦</span>
          Українська
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;