import React, { useState } from 'react';
import { ChevronLeft, Globe } from 'lucide-react';
import { useLanguage } from '../../src/contexts/LanguageContext';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  onVolunteerClick?: () => void;
  rightContent?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children, title, showBack, onBack, onVolunteerClick, rightContent }) => {
  const { language, setLanguage, availableLanguages, t } = useLanguage();
  const [isLangOpen, setIsLangOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col items-center bg-[var(--color-fs-bg-alt)]">
      {/* Navbar simulando estilo Frontier */}
      <nav className="w-full bg-white shadow-sm h-16 flex items-center px-4 md:px-8 border-b border-[var(--color-fs-border)]">
        <div className="flex items-center justify-between w-full max-w-5xl mx-auto">
          <div className="flex items-center gap-4">
            {showBack && (
              <button onClick={onBack} className="text-[var(--color-fs-blue)] hover:text-[var(--color-fs-blue-hover)] transition-colors cursor-pointer">
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            <div className="flex flex-col">
              <span className="font-bold text-lg text-[var(--color-primary)]">{t('app_title')}</span>
              {title && <span className="text-xs text-[var(--color-fs-text-light)]">{title}</span>}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {rightContent ? (
              rightContent
            ) : (
              <div className="relative">
                <button
                  onClick={() => setIsLangOpen(!isLangOpen)}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600 flex items-center gap-1"
                  title="Cambiar idioma"
                >
                  <Globe className="w-5 h-5" />
                  <span className="text-xs font-medium uppercase">{language}</span>
                </button>

                {isLangOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsLangOpen(false)}
                    ></div>
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20 border border-gray-100">
                      {availableLanguages.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setLanguage(lang.code);
                            setIsLangOpen(false);
                          }}
                          className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${language === lang.code ? 'text-[var(--color-primary)] font-semibold bg-blue-50' : 'text-gray-700'
                            }`}
                        >
                          {lang.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="w-full max-w-5xl px-4 py-8 flex-1">
        {children}
      </main>

      <footer className="w-full py-6 text-center text-sm text-[var(--color-fs-text-light)]">
        <div className="flex flex-col items-center gap-2">
          <span>{t('footer_text')}</span>
          {onVolunteerClick && (
            <button
              onClick={onVolunteerClick}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer border-none bg-transparent underline"
            >
              {t('footer_volunteer_access')}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};