/**
 * SiteSettingsManagement - Admin component for site settings
 * Manages header config, socials, phones
 * Refactored: uses apiClient, validation, proper error handling
 */
import React, { useState, useEffect, useCallback } from 'react';
import { 
  getSiteSettings, 
  updateSiteSettings, 
  defaultHeaderConfig,
  validatePhone,
  validateSocialUrl,
  normalizePhone 
} from '../../api/site';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { toast } from 'sonner';
import { 
  Settings, Phone, Globe, Clock, Save, Plus, Trash2, 
  ToggleLeft, ToggleRight, RefreshCw, AlertCircle, CheckCircle
} from 'lucide-react';

const SOCIAL_TYPES = [
  { value: 'telegram', label: 'Telegram', placeholder: 'https://t.me/username' },
  { value: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/username' },
  { value: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@username' },
  { value: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/pagename' },
  { value: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/channel/...' },
  { value: 'viber', label: 'Viber', placeholder: 'viber://...' },
];

// Loading spinner component
const LoadingState = ({ message = 'Завантаження...' }) => (
  <div className="flex flex-col items-center justify-center py-12">
    <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-2" />
    <span className="text-gray-500">{message}</span>
  </div>
);

// Error display component
const ErrorState = ({ message, onRetry }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
    <p className="text-gray-700 mb-4">{message}</p>
    {onRetry && (
      <Button onClick={onRetry} variant="outline">
        <RefreshCw className="w-4 h-4 mr-2" />
        Спробувати знову
      </Button>
    )}
  </div>
);

export default function SiteSettingsManagement() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [settings, setSettings] = useState({ header: defaultHeaderConfig });
  const [validationErrors, setValidationErrors] = useState({ phones: [], socials: [] });

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSiteSettings();
      setSettings(data);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
      setError(err.message || 'Помилка завантаження налаштувань');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Validate all fields
  const validate = useCallback(() => {
    const errors = { phones: [], socials: [] };
    const header = settings.header || {};
    
    // Validate phones
    (header.phones || []).forEach((phone, index) => {
      if (phone && !validatePhone(phone)) {
        errors.phones[index] = 'Невірний формат телефону';
      }
    });
    
    // Validate social URLs
    (header.socials || []).forEach((social, index) => {
      if (social.url && !validateSocialUrl(social.type, social.url)) {
        errors.socials[index] = `Невірна URL для ${social.type}`;
      }
    });
    
    setValidationErrors(errors);
    
    // Check if there are any errors
    const hasPhoneErrors = errors.phones.some(e => e);
    const hasSocialErrors = errors.socials.some(e => e);
    return !hasPhoneErrors && !hasSocialErrors;
  }, [settings]);

  const handleSave = async () => {
    // Validate first
    if (!validate()) {
      toast.error('Виправте помилки валідації');
      return;
    }
    
    try {
      setSaving(true);
      
      // Normalize phones before saving
      const normalizedSettings = {
        ...settings,
        header: {
          ...settings.header,
          phones: (settings.header?.phones || [])
            .filter(p => p)
            .map(p => normalizePhone(p))
        }
      };
      
      await updateSiteSettings(normalizedSettings);
      toast.success('Налаштування збережено!');
    } catch (err) {
      console.error('Failed to save settings:', err);
      toast.error(err.message || 'Помилка збереження');
    } finally {
      setSaving(false);
    }
  };

  const updateHeader = (key, value) => {
    setSettings(prev => ({
      ...prev,
      header: {
        ...prev.header,
        [key]: value
      }
    }));
  };

  const updatePhone = (index, value) => {
    const phones = [...(settings.header?.phones || [])];
    phones[index] = value;
    updateHeader('phones', phones);
    
    // Clear validation error on edit
    setValidationErrors(prev => {
      const newPhones = [...prev.phones];
      newPhones[index] = null;
      return { ...prev, phones: newPhones };
    });
  };

  const addPhone = () => {
    const phones = [...(settings.header?.phones || []), ''];
    updateHeader('phones', phones);
  };

  const removePhone = (index) => {
    const phones = (settings.header?.phones || []).filter((_, i) => i !== index);
    updateHeader('phones', phones);
  };

  const updateSocial = (index, field, value) => {
    const socials = [...(settings.header?.socials || [])];
    socials[index] = { ...socials[index], [field]: value };
    updateHeader('socials', socials);
    
    // Clear validation error on edit
    if (field === 'url' || field === 'type') {
      setValidationErrors(prev => {
        const newSocials = [...prev.socials];
        newSocials[index] = null;
        return { ...prev, socials: newSocials };
      });
    }
  };

  const addSocial = () => {
    const socials = [...(settings.header?.socials || []), { type: 'telegram', url: '', enabled: true }];
    updateHeader('socials', socials);
  };

  const removeSocial = (index) => {
    const socials = (settings.header?.socials || []).filter((_, i) => i !== index);
    updateHeader('socials', socials);
  };

  if (loading) {
    return <LoadingState message="Завантаження налаштувань..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchSettings} />;
  }

  const header = settings.header || defaultHeaderConfig;

  return (
    <div className="space-y-6" data-testid="site-settings-management">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6" />
          Налаштування сайту
        </h2>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Збереження...' : 'Зберегти'}
        </Button>
      </div>

      {/* Topbar Settings */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Верхня панель (Topbar)
        </h3>

        <div className="space-y-4">
          {/* Show Topbar Toggle */}
          <div className="flex items-center justify-between">
            <Label>Показувати верхню панель</Label>
            <button
              onClick={() => updateHeader('showTopbar', !header.showTopbar)}
              className="flex items-center gap-2"
            >
              {header.showTopbar ? (
                <ToggleRight className="w-10 h-10 text-green-600" />
              ) : (
                <ToggleLeft className="w-10 h-10 text-gray-400" />
              )}
            </button>
          </div>

          {/* Topbar Style */}
          <div>
            <Label>Стиль панелі</Label>
            <div className="flex gap-4 mt-2">
              <button
                onClick={() => updateHeader('topbarStyle', 'dark')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  header.topbarStyle === 'dark' 
                    ? 'bg-gray-900 text-white' 
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                Темний
              </button>
              <button
                onClick={() => updateHeader('topbarStyle', 'light')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  header.topbarStyle === 'light' 
                    ? 'bg-white border-2 border-blue-600 text-blue-600' 
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                Світлий
              </button>
            </div>
          </div>

          {/* Working Hours */}
          <div>
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Графік роботи
            </Label>
            <Input
              value={header.workingHours || ''}
              onChange={(e) => updateHeader('workingHours', e.target.value)}
              placeholder="Пн-Пт: 9:00-19:00, Сб: 10:00-17:00"
              className="mt-2"
            />
          </div>
        </div>
      </Card>

      {/* Phone Numbers */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Phone className="w-5 h-5" />
          Телефони
          <span className="text-sm font-normal text-gray-500">(формат: +380XXXXXXXXX)</span>
        </h3>

        <div className="space-y-3">
          {(header.phones || []).map((phone, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    value={phone}
                    onChange={(e) => updatePhone(index, e.target.value)}
                    placeholder="+380502474161"
                    className={validationErrors.phones[index] ? 'border-red-500' : ''}
                  />
                  {phone && !validationErrors.phones[index] && validatePhone(phone) && (
                    <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => removePhone(index)}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
              {validationErrors.phones[index] && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {validationErrors.phones[index]}
                </p>
              )}
            </div>
          ))}
          <Button variant="outline" onClick={addPhone}>
            <Plus className="w-4 h-4 mr-2" />
            Додати телефон
          </Button>
        </div>
      </Card>

      {/* Social Links */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Соціальні мережі
          <span className="text-sm font-normal text-gray-500">(іконка вибирається автоматично за типом)</span>
        </h3>

        <div className="space-y-4">
          {(header.socials || []).map((social, index) => {
            const socialType = SOCIAL_TYPES.find(s => s.value === social.type);
            return (
              <div key={index} className="space-y-1">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <select
                    value={social.type}
                    onChange={(e) => updateSocial(index, 'type', e.target.value)}
                    className="px-3 py-2 border rounded-lg bg-white"
                  >
                    {SOCIAL_TYPES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  
                  <div className="flex-1 relative">
                    <Input
                      value={social.url}
                      onChange={(e) => updateSocial(index, 'url', e.target.value)}
                      placeholder={socialType?.placeholder || 'https://...'}
                      className={validationErrors.socials[index] ? 'border-red-500' : ''}
                    />
                    {social.url && !validationErrors.socials[index] && validateSocialUrl(social.type, social.url) && (
                      <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                    )}
                  </div>
                  
                  <button
                    onClick={() => updateSocial(index, 'enabled', !social.enabled)}
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      social.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {social.enabled ? 'Увімкнено' : 'Вимкнено'}
                  </button>
                  
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => removeSocial(index)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
                {validationErrors.socials[index] && (
                  <p className="text-sm text-red-500 flex items-center gap-1 ml-3">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.socials[index]}
                  </p>
                )}
              </div>
            );
          })}
          
          <Button variant="outline" onClick={addSocial}>
            <Plus className="w-4 h-4 mr-2" />
            Додати соцмережу
          </Button>
        </div>
      </Card>
    </div>
  );
}
