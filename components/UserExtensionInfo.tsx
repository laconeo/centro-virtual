import React from 'react';
import { Download, Puzzle, CheckCircle2, Globe, MonitorSmartphone, X } from 'lucide-react';
import { useLanguage } from '../src/contexts/LanguageContext';

interface UserExtensionInfoProps {
    onClose: () => void;
}

export const UserExtensionInfo: React.FC<UserExtensionInfoProps> = ({ onClose }) => {
    const { t } = useLanguage();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden relative my-auto">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full p-2 transition-colors z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="bg-[var(--color-primary-600)] p-8 text-white text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                        {/* Pattern background */}
                        <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                    </div>
                    <div className="relative z-10">
                        <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm shadow-inner">
                            <Puzzle className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold mb-3">{t('ext_modal_title') || 'Extensión para Usuarios'}</h2>
                        <p className="text-white/90 max-w-xl mx-auto text-sm md:text-base">
                            {t('ext_modal_desc') || 'Lleva el Centro Virtual contigo. Recibe ayuda instantánea sin salir de la página que estás investigando en FamilySearch.'}
                        </p>
                    </div>
                </div>

                <div className="p-6 md:p-8">
                    <div className="grid md:grid-cols-2 gap-8 mb-8">
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold text-gray-800 border-b pb-2">{t('ext_modal_benefits_title') || 'Beneficios principales'}</h3>
                            <ul className="space-y-4">
                                <li className="flex gap-3">
                                    <MonitorSmartphone className="w-6 h-6 text-[var(--color-fs-blue)] flex-shrink-0" />
                                    <div>
                                        <h4 className="font-semibold text-gray-800 text-sm">{t('ext_modal_benefit1_title') || 'Widget Flotante'}</h4>
                                        <p className="text-sm text-gray-600">{t('ext_modal_benefit1_desc') || 'Un pequeño botón de chat aparecerá en la esquina de tu pantalla mientras navegas por FamilySearch.'}</p>
                                    </div>
                                </li>
                                <li className="flex gap-3">
                                    <Globe className="w-6 h-6 text-[var(--color-fs-blue)] flex-shrink-0" />
                                    <div>
                                        <h4 className="font-semibold text-gray-800 text-sm">{t('ext_modal_benefit2_title') || 'Ayuda Contextual'}</h4>
                                        <p className="text-sm text-gray-600">{t('ext_modal_benefit2_desc') || 'No necesitas cambiar de pestaña. Conversa con un voluntario mientras miras el mismo registro.'}</p>
                                    </div>
                                </li>
                                <li className="flex gap-3">
                                    <CheckCircle2 className="w-6 h-6 text-[var(--color-fs-blue)] flex-shrink-0" />
                                    <div>
                                        <h4 className="font-semibold text-gray-800 text-sm">{t('ext_modal_benefit3_title') || 'Instalación Rápida'}</h4>
                                        <p className="text-sm text-gray-600">{t('ext_modal_benefit3_desc') || 'Ligera, segura y diseñada específicamente para mejorar tu experiencia de historia familiar.'}</p>
                                    </div>
                                </li>
                            </ul>
                        </div>

                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 h-full flex flex-col justify-center">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">{t('ext_modal_install_title') || '¿Cómo instalarla?'}</h3>
                            <ol className="list-decimal list-inside space-y-3 text-sm text-gray-700">
                                <li dangerouslySetInnerHTML={{ __html: t('ext_modal_install_step1') || 'Descarga el archivo <strong>chrome-extension.zip</strong> desde el botón de abajo.' }} />
                                <li>{t('ext_modal_install_step2') || 'Descomprímelo en una carpeta en tu computadora.'}</li>
                                <li>{t('ext_modal_install_step3') || 'En Chrome, abre'} <code className="bg-white px-2 py-0.5 rounded text-xs border border-gray-200">chrome://extensions/</code></li>
                                <li dangerouslySetInnerHTML={{ __html: t('ext_modal_install_step4') || 'Activa el <strong>Modo Desarrollador</strong> (arriba a la derecha).' }} />
                                <li dangerouslySetInnerHTML={{ __html: t('ext_modal_install_step5') || 'Haz clic en <strong>Cargar descomprimida</strong> y elige la carpeta.' }} />
                                <li>{t('ext_modal_install_step6') || '¡Navega a FamilySearch.org y verás el widget de ayuda!'}</li>
                            </ol>

                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <button
                                    onClick={() => alert("Acá se adjuntará el enlace directo para descargar el .zip de la extensión del usuario.")}
                                    className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-700)] text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-md hover:shadow-lg"
                                >
                                    <Download className="w-5 h-5" /> {t('ext_modal_download_btn') || 'Descargar Extensión'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
