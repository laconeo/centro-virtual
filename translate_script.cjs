const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'src', 'locales');
const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));

const translations = {
    es: {
        ext_landing_res_1_title: 'Oportunidades del Templo',
        ext_landing_res_1_desc: 'Encuentra antepasados listos para las ordenanzas.',
        ext_landing_res_2_title: 'Sugerencias del Templo para la Familia',
        ext_landing_res_2_desc: 'Descubre nuevas oportunidades de servicio.',
        ext_landing_res_3_title: 'El Árbol Familiar Global',
        ext_landing_res_3_desc: 'Explora y conecta con tu familia en todo el mundo.',
        ext_landing_res_4_title: 'Collage de Fotos',
        ext_landing_res_4_desc: 'Crea hermosos recuerdos con tus fotos familiares.',
        ext_landing_res_5_title: 'Busca tu Apellido',
        ext_landing_res_5_desc: 'Descubre el origen y significado de tu apellido.'
    },
    pt: {
        ext_landing_res_1_title: 'Oportunidades do Templo',
        ext_landing_res_1_desc: 'Encontre antepassados prontos para as ordenanças.',
        ext_landing_res_2_title: 'Sugestões do Templo para a Família',
        ext_landing_res_2_desc: 'Descubra novas oportunidades de serviço.',
        ext_landing_res_3_title: 'A Árvore Familiar Global',
        ext_landing_res_3_desc: 'Explore e conecte-se com sua família em todo o mundo.',
        ext_landing_res_4_title: 'Colagem de Fotos',
        ext_landing_res_4_desc: 'Crie belas lembranças com as fotos de sua família.',
        ext_landing_res_5_title: 'Pesquise seu Sobrenome',
        ext_landing_res_5_desc: 'Descubra a origem e o significado de seu sobrenome.',
        ext_landing_title_1: 'Centro Virtual do FamilySearch',
        ext_landing_title_2: 'na sua casa!',
        ext_landing_desc: 'Receba a ajuda de nossos missionários especialistas diretamente na sua tela. Instale a extensão e, com um único clique, você pode iniciar um chat ou videochamada para suporte sem sair do que está fazendo no FamilySearch.',
        ext_landing_download_title: 'Baixe agora!',
        ext_landing_download_desc: 'É segura, gratuita e mudará a forma como você recebe suporte.',
        ext_landing_download_btn: 'Baixar Arquivo ZIP',
        ext_landing_inst_title: 'Instruções de instalação muito fáceis',
        ext_landing_inst_1_title: 'Descompacte o arquivo baixado',
        ext_landing_inst_1_desc: 'Procure o arquivo <code class="bg-gray-100 px-2 py-1 rounded text-sm text-[var(--color-fs-blue)]">ext-usuario-prod.zip</code> em seus Downloads, clique com o botão direito e selecione <strong>Extrair tudo...</strong>',
        ext_landing_inst_2_title: 'Abra as extensões do seu navegador Chrome',
        ext_landing_inst_2_desc: 'Digite <code class="bg-gray-100 px-2 py-1 rounded text-sm text-[var(--color-fs-blue)]">chrome://extensions/</code> na sua barra de endereços e pressione Enter.',
        ext_landing_inst_3_title: 'Ative o Modo do Desenvolvedor',
        ext_landing_inst_3_desc: 'Ligue o botão no canto superior direito.',
        ext_landing_inst_4_title: 'Faça upload da extensão',
        ext_landing_inst_4_desc: 'Clique no botão superior esquerdo <strong>Carregar sem compactação</strong> (ou Load unpacked) e selecione a pasta que você extraiu no passo 1.',
        ext_landing_inst_pin_title: 'Passo extra e importante: Fixe a extensão (Pin)!',
        ext_landing_inst_pin_desc: 'Clique no ícone de quebra-cabeça no canto superior direito do seu navegador Chrome. Depois clique no ícone de alfinete/pin ao lado de <strong>Centro Virtual</strong> para mantê-la sempre visível.',
        ext_landing_resources_title: 'Recursos Interessantes para Explorar'
    },
    fr: {
        ext_landing_res_1_title: 'Opportunités du Temple',
        ext_landing_res_1_desc: 'Trouvez des ancêtres prêts pour les ordonnances.',
        ext_landing_res_2_title: 'Suggestions du Temple pour la Famille',
        ext_landing_res_2_desc: 'Découvrez de nouvelles opportunités de service.',
        ext_landing_res_3_title: "L'Arbre Familial Global",
        ext_landing_res_3_desc: 'Explorez et connectez-vous avec votre famille partout dans le monde.',
        ext_landing_res_4_title: 'Collage de Photos',
        ext_landing_res_4_desc: 'Créez de beaux souvenirs avec vos photos de famille.',
        ext_landing_res_5_title: 'Cherchez votre Nom de Famille',
        ext_landing_res_5_desc: "Découvrez l'origine et la signification de votre nom.",
        ext_landing_title_1: 'Centre Virtuel de FamilySearch',
        ext_landing_title_2: 'à la maison !',
        ext_landing_desc: "Obtenez l'aide de nos missionnaires spécialistes directement sur votre écran. Installez l'extension et d'un simple clic, lancez une discussion ou un appel vidéo pour obtenir du soutien sans quitter FamilySearch.",
        ext_landing_download_title: 'Téléchargez maintenant !',
        ext_landing_download_desc: "C'est sûr, gratuit et cela changera votre façon de recevoir de l'aide.",
        ext_landing_download_btn: 'Télécharger le fichier ZIP',
        ext_landing_inst_title: "Instructions d'installation très faciles",
        ext_landing_inst_1_title: 'Décompressez le fichier téléchargé',
        ext_landing_inst_1_desc: 'Trouvez le fichier <code class="bg-gray-100 px-2 py-1 rounded text-sm text-[var(--color-fs-blue)]">ext-usuario-prod.zip</code> dans vos Téléchargements, faites un clic droit et sélectionnez <strong>Extraire tout...</strong>',
        ext_landing_inst_2_title: 'Ouvrez les extensions de votre navigateur Chrome',
        ext_landing_inst_2_desc: 'Tapez <code class="bg-gray-100 px-2 py-1 rounded text-sm text-[var(--color-fs-blue)]">chrome://extensions/</code> dans votre barre d\'adresse et appuyez sur Entrée.',
        ext_landing_inst_3_title: 'Activez le Mode Développeur',
        ext_landing_inst_3_desc: 'Allumez le bouton dans le coin supérieur droit.',
        ext_landing_inst_4_title: "Chargez l'extension",
        ext_landing_inst_4_desc: "Cliquez sur le bouton en haut à gauche <strong>Chargez l'extension non empaquetée</strong> (ou Load unpacked) et sélectionnez le dossier extrait à l'étape 1.",
        ext_landing_inst_pin_title: "Étape supplémentaire très importante : Épinglez l'extension (Pin) !",
        ext_landing_inst_pin_desc: "Cliquez sur l'icône de puzzle dans le coin supérieur droit de votre navigateur Chrome. Cliquez ensuite sur l'icône en forme d'épingle à côté de <strong>Centro Virtual</strong> pour la garder toujours visible.",
        ext_landing_resources_title: 'Ressources Intéressantes à Explorer'
    },
    ht: {
        ext_landing_res_1_title: 'Opòtinite nan Tanp lan',
        ext_landing_res_1_desc: 'Jwenn zansèt ki pare pou òdonans yo.',
        ext_landing_res_2_title: 'Sijesyon nan Tanp pou Fanmi an',
        ext_landing_res_2_desc: 'Dekouvri nouvo opòtinite pou sèvi.',
        ext_landing_res_3_title: 'Pye Fanmi Global la',
        ext_landing_res_3_desc: 'Eksplore epi konekte ak fanmi ou nan tout mond lan.',
        ext_landing_res_4_title: 'Kolaj Foto',
        ext_landing_res_4_desc: 'Kreye bèl souvni ak foto fanmi ou.',
        ext_landing_res_5_title: 'Cheche Non Fanmi Ou',
        ext_landing_res_5_desc: 'Dekouvri orijin ak siyifikasyon non fanmi ou.',
        ext_landing_title_1: 'Sant Vityèl FamilySearch',
        ext_landing_title_2: 'lakay ou!',
        ext_landing_desc: 'Jwenn èd nan men misyonè espesyalis nou yo dirèkteman sou ekran ou. Enstale ekstansyon an, ak yon sèl klik ou ka kòmanse yon chat oswa videyo apèl pou jwenn sipò san ou pa kite sa w ap fè nan FamilySearch la.',
        ext_landing_download_title: 'Telechaje kounye a!',
        ext_landing_download_desc: 'Li an sekirite, gratis, li pral chanje fason ou resevwa sipò.',
        ext_landing_download_btn: 'Telechaje Fichye ZIP la',
        ext_landing_inst_title: 'Enstriksyon trè fasil pou enstalasyon',
        ext_landing_inst_1_title: 'Dekonprese fichye telechaje a',
        ext_landing_inst_1_desc: 'Cheche fichye <code class="bg-gray-100 px-2 py-1 rounded text-sm text-[var(--color-fs-blue)]">ext-usuario-prod.zip</code> nan Telechajman ou yo, fè klik dwat epi chwazi <strong>Ekstrè tout...</strong>',
        ext_landing_inst_2_title: 'Louvri ekstansyon navigatè Chrome ou a',
        ext_landing_inst_2_desc: 'Ekri <code class="bg-gray-100 px-2 py-1 rounded text-sm text-[var(--color-fs-blue)]">chrome://extensions/</code> nan ba adrès ou a epi peze Enter.',
        ext_landing_inst_3_title: 'Aktive Mòd Pwomotè a',
        ext_landing_inst_3_desc: 'Limen bouton chanje nan kwen siperyè adwat.',
        ext_landing_inst_4_title: 'Mete ekstansyon an',
        ext_landing_inst_4_desc: 'Klike sou bouton ki nan kwen anwo agòch <strong>Chaje dekonprese</strong> (oswa Load unpacked) epi chwazi dosye ou ekstrè nan etap 1 an.',
        ext_landing_inst_pin_title: 'Etap siplemantè trè enpòtan: Epingle ekstansyon an (Pin)!',
        ext_landing_inst_pin_desc: 'Klike sou ikòn devinèt nan kwen siperyè adwat navigatè Chrome ou a. Apre sa, klike sou ikòn peny/pikèt akote <strong>Sant Vityèl la</strong> pou l toujou vizib.',
        ext_landing_resources_title: 'Resous Enteresan Pou Eksplore'
    }
};

files.forEach(file => {
    const langKey = file.replace('.json', '');
    const t = translations[langKey] || translations['es'];
    const filepath = path.join(localesDir, file);
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));

    Object.keys(t).forEach(k => {
        data[k] = t[k];
    });

    // also add english translations
    if (langKey !== 'pt' && langKey !== 'fr' && langKey !== 'ht' && langKey !== 'es') {
        const tes = translations['es'];
        Object.keys(tes).forEach(k => {
            if (!data[k]) data[k] = tes[k]; // default to spanish for other minor langs just in case
        });
    }

    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
});
console.log('Translations updated.');
