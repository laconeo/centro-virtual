import React from 'react';
import { Download, Puzzle, Pin, ChevronsRight, MonitorPlay, HeartHandshake, Link as LinkIcon, BookOpen, Search, Image as ImageIcon } from 'lucide-react';
import { Layout } from './ui/Layout';
import { useLanguage } from '../src/contexts/LanguageContext';

export const UserLandingExtension: React.FC = () => {
    const { t } = useLanguage();

    const resources = [
        {
            title: t('ext_landing_res_1_title'),
            desc: t('ext_landing_res_1_desc'),
            url: 'https://www.familysearch.org/es/campaign/temple-opportunity',
            icon: <Search className="w-6 h-6" />
        },
        {
            title: t('ext_landing_res_2_title'),
            desc: t('ext_landing_res_2_desc'),
            url: 'https://www.familysearch.org/es/campaign/family-temple-hints',
            icon: <HeartHandshake className="w-6 h-6" />
        },
        {
            title: t('ext_landing_res_3_title'),
            desc: t('ext_landing_res_3_desc'),
            url: 'https://www.familysearch.org/es/tree-designs/global/',
            icon: <LinkIcon className="w-6 h-6" />
        },
        {
            title: t('ext_landing_res_4_title'),
            desc: t('ext_landing_res_4_desc'),
            url: 'https://www.familysearch.org/es/campaign/photocollage',
            icon: <ImageIcon className="w-6 h-6" />
        },
        {
            title: t('ext_landing_res_5_title'),
            desc: t('ext_landing_res_5_desc'),
            url: 'https://www.familysearch.org/es/surname',
            icon: <BookOpen className="w-6 h-6" />
        }
    ];

    return (
        <Layout showBack={false} fullWidth={true}>
            <div className="animate-fade-in text-[var(--color-fs-text)]">
                {/* Hero Section */}
                <div
                    className="w-full text-center mb-12 py-24 px-4 relative overflow-hidden bg-gray-900 shadow-xl"
                    style={{
                        backgroundImage: `url(${import.meta.env.BASE_URL}hero2.jpg)`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                >
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-md"></div>

                    <div className="relative z-10">
                        <div className="inline-flex items-center justify-center p-3 bg-white/20 text-white rounded-full mb-6 backdrop-blur-md">
                            <MonitorPlay className="w-10 h-10" />
                        </div>
                        <h1
                            className="text-4xl md:text-6xl font-black text-[var(--color-fs-blue)] mb-6 uppercase tracking-tight"
                            style={{
                                WebkitTextStroke: '2px white',
                                textShadow: '0 4px 15px rgba(255,255,255,0.7)'
                            }}
                        >
                            {t('ext_landing_title_1')} <span>{t('ext_landing_title_2')}</span>
                        </h1>
                        <p
                            className="text-lg md:text-xl text-white max-w-3xl mx-auto font-medium leading-relaxed"
                            style={{ textShadow: '0px 2px 10px rgba(0,0,0,1), 0px 2px 4px rgba(0,0,0,1)' }}
                        >
                            {t('ext_landing_desc')}
                        </p>
                    </div>
                </div>

                <div className="max-w-5xl mx-auto px-4">
                    {/* Download and Instructions Section */}
                    <div className="bg-white rounded-3xl shadow-[var(--shadow-card)] border border-gray-100 overflow-hidden mb-16">
                        <div className="md:flex">
                            <div className="md:w-1/3 bg-gray-50 p-8 md:p-12 flex flex-col justify-center items-center text-center border-b md:border-b-0 md:border-r border-gray-200">
                                <Puzzle className="w-20 h-20 text-[var(--color-fs-blue)] mb-6" />
                                <h2 className="text-2xl font-bold mb-4">{t('ext_landing_download_title')}</h2>
                                <p className="text-gray-600 mb-8 text-sm">
                                    {t('ext_landing_download_desc')}
                                </p>
                                <a
                                    href={`${import.meta.env.BASE_URL}ext-usuario-prod.zip`} download="ext-usuario-prod.zip"
                                    className="w-full bg-[var(--color-fs-blue)] hover:bg-[#004a7c] text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-transform hover:scale-105 shadow-md hover:shadow-lg text-lg"
                                >
                                    <Download className="w-6 h-6" /> {t('ext_landing_download_btn')}
                                </a>
                            </div>

                            <div className="md:w-2/3 p-8 md:p-12">
                                <h3 className="text-2xl font-bold mb-6 flex items-center gap-3 text-gray-800">
                                    {t('ext_landing_inst_title')}
                                </h3>

                                <div className="space-y-6">
                                    <div className="flex gap-4 items-start">
                                        <div className="bg-blue-100 text-[var(--color-fs-blue)] w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 mt-1">1</div>
                                        <div>
                                            <p className="font-semibold text-lg text-gray-800">{t('ext_landing_inst_1_title')}</p>
                                            <p className="text-gray-600" dangerouslySetInnerHTML={{ __html: t('ext_landing_inst_1_desc') }} />
                                        </div>
                                    </div>

                                    <div className="flex gap-4 items-start">
                                        <div className="bg-blue-100 text-[var(--color-fs-blue)] w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 mt-1">2</div>
                                        <div>
                                            <p className="font-semibold text-lg text-gray-800">{t('ext_landing_inst_2_title')}</p>
                                            <p className="text-gray-600" dangerouslySetInnerHTML={{ __html: t('ext_landing_inst_2_desc') }} />
                                        </div>
                                    </div>

                                    <div className="flex gap-4 items-start">
                                        <div className="bg-blue-100 text-[var(--color-fs-blue)] w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 mt-1">3</div>
                                        <div>
                                            <p className="font-semibold text-lg text-gray-800">{t('ext_landing_inst_3_title')}</p>
                                            <p className="text-gray-600">{t('ext_landing_inst_3_desc')}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 items-start">
                                        <div className="bg-blue-100 text-[var(--color-fs-blue)] w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 mt-1">4</div>
                                        <div>
                                            <p className="font-semibold text-lg text-gray-800">{t('ext_landing_inst_4_title')}</p>
                                            <p className="text-gray-600" dangerouslySetInnerHTML={{ __html: t('ext_landing_inst_4_desc') }} />
                                        </div>
                                    </div>

                                    <div className="flex gap-4 items-start bg-yellow-50 p-4 rounded-xl border border-yellow-200 mt-4">
                                        <div className="bg-yellow-200 text-yellow-800 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                            <Pin className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-lg text-yellow-900">{t('ext_landing_inst_pin_title')}</p>
                                            <p className="text-yellow-800">
                                                {t('ext_landing_inst_pin_desc')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Resources Section */}
                    <div className="mb-12">
                        <h3 className="text-3xl font-black text-center mb-10 text-gray-900">
                            {t('ext_landing_resources_title')}
                        </h3>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {resources.map((res, idx) => (
                                <a
                                    key={idx}
                                    href={res.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group bg-white border-2 border-transparent hover:border-[var(--color-fs-blue)] rounded-2xl p-6 transition-all shadow-sm hover:shadow-xl flex flex-col h-full"
                                >
                                    <div className="bg-blue-50 text-[var(--color-fs-blue)] w-14 h-14 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                                        {res.icon}
                                    </div>
                                    <h4 className="text-xl font-bold mb-2 group-hover:text-[var(--color-fs-blue)] transition-colors">
                                        {res.title}
                                    </h4>
                                    <p className="text-gray-600 flex-1">
                                        {res.desc}
                                    </p>
                                    <div className="mt-6 flex justify-end text-[var(--color-fs-blue)] opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ChevronsRight className="w-6 h-6" />
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};
