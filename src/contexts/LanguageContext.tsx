import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Translations = Record<string, string>;
type LanguageData = {
    [key: string]: Translations;
};

interface LanguageContextType {
    language: string;
    setLanguage: (lang: string) => void;
    t: (key: string) => string;
    availableLanguages: { code: string; label: string }[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [language, setLanguage] = useState<string>('es');
    const [translations, setTranslations] = useState<LanguageData>({});
    const [availableLanguages, setAvailableLanguages] = useState<{ code: string; label: string }[]>([]);

    useEffect(() => {
        // Dynamically import all json files from the locales directory
        // Note: In Vite, import.meta.glob paths must be relative to the importING file
        const modules = import.meta.glob('../locales/*.json', { eager: true });

        const loadedTranslations: LanguageData = {};
        const languages: { code: string; label: string }[] = [];

        for (const path in modules) {
            // path is like "../locales/es.json"
            const code = path.split('/').pop()?.replace('.json', '');
            const content = (modules[path] as any).default || (modules[path] as any);

            if (code && content) {
                loadedTranslations[code] = content;
                // Use the "language" key in the JSON as the label, or fallback to the code
                languages.push({
                    code,
                    label: content.language || code.toUpperCase()
                });
            }
        }

        setTranslations(loadedTranslations);
        setAvailableLanguages(languages);

        // Load saved language
        const savedLang = localStorage.getItem('app_language');
        if (savedLang && Object.keys(loadedTranslations).includes(savedLang)) {
            setLanguage(savedLang);
        } else if (!Object.keys(loadedTranslations).includes(language) && languages.length > 0) {
            // Fallback to first available if default not found
            setLanguage(languages[0].code);
        }
    }, []);

    const handleSetLanguage = (lang: string) => {
        setLanguage(lang);
        localStorage.setItem('app_language', lang);
    };

    const t = (key: string): string => {
        const langData = translations[language];
        if (!langData) return key;
        return langData[key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t, availableLanguages }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
