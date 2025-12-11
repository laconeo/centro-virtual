import React from 'react';
import { ChevronLeft } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  onVolunteerClick?: () => void;
  rightContent?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children, title, showBack, onBack, onVolunteerClick, rightContent }) => {
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
              <span className="font-bold text-lg text-[var(--color-primary)]">Centro Virtual</span>
              {title && <span className="text-xs text-[var(--color-fs-text-light)]">{title}</span>}
            </div>
          </div>
          {rightContent && <div>{rightContent}</div>}
        </div>
      </nav>

      {/* Content */}
      <main className="w-full max-w-5xl px-4 py-8 flex-1">
        {children}
      </main>

      <footer className="w-full py-6 text-center text-sm text-[var(--color-fs-text-light)]">
        <div className="flex flex-col items-center gap-2">
          <span>© 2025 Servicios de apoyo para usuarios de FS</span>
          {onVolunteerClick && (
            <button
              onClick={onVolunteerClick}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer border-none bg-transparent underline"
            >
              Acceso misioneros de servicio
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};