import React from 'react';
import { Download, BellRing, Settings, Zap } from 'lucide-react';

export const MissionaryExtensionInfo: React.FC = () => {
    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden max-w-4xl mx-auto">
            <div className="bg-[#8CB83E] p-6 text-white text-center">
                <h2 className="text-2xl font-bold mb-2">Extensión del Misionero de Servicio</h2>
                <p className="text-white/90">
                    Obtén alertas instantáneas de usuarios en espera directamente en tu escritorio, sin necesidad de mantener la página abierta.
                </p>
            </div>

            <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                    <div className="flex flex-col items-center text-center">
                        <div className="bg-[#f0fdf4] p-4 rounded-full text-[#8CB83E] mb-4">
                            <BellRing className="w-8 h-8" />
                        </div>
                        <h3 className="font-bold text-gray-800 mb-2">Notificaciones Push</h3>
                        <p className="text-sm text-gray-600">Recibe una notificación nativa de Windows con campanita cuando haya una nueva solicitud.</p>
                    </div>
                    <div className="flex flex-col items-center text-center">
                        <div className="bg-blue-50 p-4 rounded-full text-[#005994] mb-4">
                            <Zap className="w-8 h-8" />
                        </div>
                        <h3 className="font-bold text-gray-800 mb-2">Acceso Instantáneo</h3>
                        <p className="text-sm text-gray-600">Al hacer clic en la notificación, entrarás directo a la sesión autenticado y listo para ayudar.</p>
                    </div>
                    <div className="flex flex-col items-center text-center">
                        <div className="bg-gray-50 p-4 rounded-full text-gray-600 mb-4">
                            <Settings className="w-8 h-8" />
                        </div>
                        <h3 className="font-bold text-gray-800 mb-2">Siempre en Segundo Plano</h3>
                        <p className="text-sm text-gray-600">Funciona en segundo plano mientras Chrome esté abierto. Mantén tu disponibilidad sin esfuerzo.</p>
                    </div>
                </div>

                <hr className="border-gray-100 my-8" />

                <div className="space-y-6">
                    <h3 className="text-xl font-bold text-gray-800">¿Cómo instalarla?</h3>

                    <div className="bg-blue-50 border-l-4 border-[#005994] p-4 rounded-r-md">
                        <ol className="list-decimal list-inside space-y-3 text-gray-700 text-sm">
                            <li>Pídele a tu líder o administrador el archivo <strong>chrome-extension-missionary.zip</strong> y descomprímelo en una carpeta.</li>
                            <li>Abre Google Chrome y ve a la dirección: <code className="bg-white px-2 py-1 rounded font-mono text-[#005994]">chrome://extensions/</code></li>
                            <li>Activa el <strong>Modo Desarrollador</strong> en la esquina superior derecha.</li>
                            <li>Haz clic en el botón <strong>Cargar descomprimida</strong>.</li>
                            <li>Selecciona la carpeta donde extrajiste la extensión.</li>
                            <li>¡Listo! Verás el icono de FamilySearch en tu barra de extensiones.</li>
                        </ol>
                    </div>

                    <h3 className="text-xl font-bold text-gray-800 mt-8 mt-6">¿Cómo usarla?</h3>
                    <div className="bg-gray-50 border border-gray-200 p-6 rounded-md">
                        <ul className="list-disc list-inside space-y-3 text-gray-700 text-sm">
                            <li>Haz clic en el icono de la extensión en Chrome.</li>
                            <li>La primera vez, ingresa tu <strong>Email</strong> con el que accedes al Centro Virtual y tu <strong>Nombre</strong>.</li>
                            <li>Asegúrate de que el estado esté marcado como <span className="text-green-600 font-bold">Disponible</span>.</li>
                            <li>Ahora puedes cerrar la pestaña del Centro Virtual. Mientras Chrome esté minimizado o abierto en otra página, <strong>escucharás una campana</strong> cuando un usuario solicite ayuda.</li>
                            <li>Si necesitas ver cuántas personas están esperando en silencio o abrir el portal SGO, simplemente pulsa sobre la extensión en cualquier momento.</li>
                        </ul>
                    </div>
                </div>

                <div className="mt-8 flex justify-center">
                    <a
                        className="bg-[#005994] hover:bg-[#004a7c] text-white px-6 py-3 rounded-md font-bold flex items-center gap-2 transition-colors transition-shadow shadow-md hover:shadow-lg inline-flex"
                        href="/ext-misionero-prod.zip" download="ext-misionero-prod.zip"
                    >
                        <Download className="w-5 h-5" />
                        Descargar Archivo de Extensión
                    </a>
                </div>

            </div>
        </div>
    );
};
