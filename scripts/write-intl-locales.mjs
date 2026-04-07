/**
 * 一次性从模板生成各语言 JSON（与 en 结构一致）。
 * 修改译文后运行：node scripts/write-intl-locales.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import extraPacks from './intl-packs-extra.mjs'

const root = join(fileURLToPath(new URL('..', import.meta.url)))
const enPath = join(root, 'src/i18n/locales/en.json')
const en = JSON.parse(readFileSync(enPath, 'utf8'))

function deepClone(o) {
  return JSON.parse(JSON.stringify(o))
}

/** @param {Record<string, string>} map flat dot-path -> string */
function applyFlat(target, map) {
  for (const [path, value] of Object.entries(map)) {
    const parts = path.split('.')
    let cur = target
    for (let i = 0; i < parts.length - 1; i++) {
      cur = cur[parts[i]]
    }
    cur[parts[parts.length - 1]] = value
  }
}

const packs = {
  es: {
    'seo.titles.home': 'Caja de herramientas de imagen en línea gratis — en el navegador',
    'seo.titles.compress': 'Comprimir JPG/PNG en línea (local)',
    'seo.titles.upscale': 'Ampliar imagen y superresolución con IA',
    'seo.titles.removeBg': 'Quitar fondo de imagen en línea',
    'seo.titles.resize': 'Cambiar tamaño de imágenes en línea',
    'seo.titles.crop': 'Recortar imágenes en línea',
    'seo.titles.convertJpg': 'Convertir PNG/WebP a JPG en línea',
    'seo.titles.rotate': 'Rotar imágenes en línea',
    'seo.titles.watermark': 'Añadir marca de agua de texto en línea',
    'seo.titles.meme': 'Generador de memes y subtítulos en línea',
    'seo.titles.htmlToImage': 'HTML a captura PNG',
    'seo.titles.blur': 'Difuminar parte de una imagen (privacidad)',
    'seo.titles.webSkeleton': 'Generador de esqueleto / wireframe de página',
    'nav.home': 'Inicio',
    'nav.tools': 'Herramientas',
    'nav.menuTitle': 'Navegación',
    'nav.openMenu': 'Abrir menú',
    'nav.switchLanguage': 'Cambiar idioma',
    'footer.line': 'Las imágenes se procesan localmente en tu navegador y no se suben.',
    'home.title': 'Image Studio — Caja de herramientas de imagen en línea gratis',
    'home.lead':
      'Edita imágenes en el navegador: comprime, recorta, redimensiona, rota y convierte formatos, añade marcas de agua, elimina fondos lisos, amplía con interpolación o IA local, exporta HTML a PNG, difumina zonas sensibles y genera vistas esqueléticas. Todo en tu dispositivo: sin subidas ni instalación.',
    'tools.compress.title': 'Comprimir',
    'tools.compress.desc': 'Menor calidad JPEG o límite del lado largo',
    'tools.upscale.title': 'Ampliar',
    'tools.upscale.desc': 'Interpolación o IA local (2×/4×), sin subir',
    'tools.remove-bg.title': 'Quitar fondo',
    'tools.remove-bg.desc': 'Máscara por color con tolerancia; PNG transparente',
    'tools.resize.title': 'Redimensionar',
    'tools.resize.desc': 'Por porcentaje o píxeles; bloqueo de proporción opcional',
    'tools.crop.title': 'Recortar',
    'tools.crop.desc': 'Recorta una zona y descarga PNG',
    'tools.convert-jpg.title': 'A JPG',
    'tools.convert-jpg.desc': 'Transparencia sobre blanco y guardar JPEG',
    'tools.rotate.title': 'Rotar',
    'tools.rotate.desc': 'Preajustes 90° o ángulo personalizado',
    'tools.watermark.title': 'Marca de agua',
    'tools.watermark.desc': 'Texto: posición, color, opacidad',
    'tools.meme.title': 'Meme',
    'tools.meme.desc': 'Texto arriba/abajo con borde clásico',
    'tools.html-to-image.title': 'HTML a imagen',
    'tools.html-to-image.desc': 'Renderizar en el DOM y capturar',
    'tools.blur.title': 'Difuminar zona',
    'tools.blur.desc': 'Rectángulo para ocultar contenido privado',
    'tools.web-skeleton.title': 'Esqueleto web',
    'tools.web-skeleton.desc': 'Wireframe desde HTML; exportar HTML o PNG',
    'picker.dragText': 'Suelta una imagen aquí, o ',
    'picker.clickPick': 'haz clic para elegir',
    'picker.clear': 'Borrar',
    'picker.previewAlt': 'Vista previa',
    'msg.processing': 'Procesando…',
    'msg.selectImageFirst': 'Selecciona una imagen primero',
    'msg.selectImageCrop': 'Selecciona una imagen y espera a que cargue',
    'msg.selectImageRemoveBg': 'Selecciona una imagen y haz clic en el fondo en la vista previa',
    'msg.enterWatermark': 'Introduce el texto de la marca de agua',
    'msg.scaleGt100': 'La escala debe ser mayor que 100%',
    'msg.tooManyPixels': 'Salida demasiado grande — reduce la escala',
    'msg.downloaded': 'Descargado',
    'msg.downloadedPng': 'PNG descargado',
    'msg.downloadedJpg': 'Guardado como JPG',
    'msg.exportFail': 'Error al exportar',
    'msg.processFail': 'Error al procesar',
    'msg.processFailRetry': 'Error — prueba con otra imagen',
    'msg.cropFail': 'Error al recortar',
    'msg.rotateFail': 'Error al rotar',
    'msg.convertFail': 'Error al convertir',
    'msg.genFail': 'Error al generar',
    'msg.readImageFail': 'No se pudo leer la imagen',
    'msg.captureFail': 'Captura fallida — CORS puede bloquear imágenes externas',
    'msg.copiedHtml': 'HTML copiado',
    'msg.copyFail': 'Error al copiar',
    'msg.skeletonGenFail': 'Error al generar el esqueleto',
    'msg.skeletonNeedHtml': 'Pega HTML primero',
    'msg.sampledRgb': 'Muestreado RGB({r}, {g}, {b})',
    'msg.aiUpscaleFail': 'IA falló — prueba imagen más pequeña, modo rápido o recarga',
    'pages.compress.h1': 'Comprimir imágenes',
    'pages.compress.lead':
      'Reduce el tamaño con calidad JPEG y/o límite del lado largo; PNG sin pérdida se reduce sobre todo por dimensiones.',
    'pages.compress.outputFormat': 'Formato de salida',
    'pages.compress.jpegQuality': 'Calidad JPEG',
    'pages.compress.limitLongEdge': 'Límite lado largo',
    'pages.compress.edgeHint': 'px (se reduce si es mayor)',
    'pages.compress.action': 'Comprimir y descargar',
    'pages.resize.h1': 'Redimensionar',
    'pages.resize.lead': 'Escala proporcional o ancho fijo (bloqueo de proporción opcional).',
    'pages.resize.mode': 'Modo',
    'pages.resize.percent': 'Porcentaje',
    'pages.resize.pixel': 'Píxeles',
    'pages.resize.scalePercent': 'Escala',
    'pages.resize.width': 'Ancho',
    'pages.resize.keepRatio': 'Bloquear proporción',
    'pages.resize.height': 'Alto',
    'pages.resize.outputFormat': 'Formato de salida',
    'pages.resize.fmtOriginal': 'Igual que origen',
    'pages.resize.action': 'Redimensionar y descargar',
    'pages.crop.h1': 'Recortar',
    'pages.crop.lead': 'Arrastra el marco y los tiradores, luego exporta PNG.',
    'pages.crop.dialogTitle': 'Recortar imagen',
    'pages.crop.reopenCrop': 'Abrir editor de recorte',
    'pages.crop.cropAlt': 'Recorte',
    'pages.crop.action': 'Recortar y descargar',
    'pages.convertJpg.h1': 'Convertir a JPG',
    'pages.convertJpg.lead': 'PNG, WebP, GIF, etc. a JPEG; transparencia en blanco.',
    'pages.convertJpg.jpegQuality': 'Calidad JPEG',
    'pages.convertJpg.action': 'Convertir y descargar',
    'pages.rotate.h1': 'Rotar',
    'pages.rotate.lead':
      'Tras subir, usa el dial en el diálogo; atajos 90°/180°/270°.',
    'pages.rotate.dialogTitle': 'Rotar imagen',
    'pages.rotate.reopenRotate': 'Abrir diálogo de rotación',
    'pages.rotate.knobHint': 'Arrastra el dial circular — la imagen gira con él.',
    'pages.rotate.knobAria': 'Ángulo de rotación',
    'pages.rotate.presetQuick': 'Atajos',
    'pages.rotate.customAngleLabel': 'Personalizado (0–360°)',
    'pages.rotate.resetAngle': 'Restablecer',
    'pages.rotate.previewAlt': 'Vista previa de rotación',
    'pages.rotate.action': 'Descargar',
    'pages.watermark.h1': 'Marca de agua',
    'pages.watermark.lead':
      'Contorno azul = selección (interior transparente). Arrastra el borde o el relleno para mover; esquinas cambian el tamaño de fuente. Vacío: cursor parpadeante — clic para escribir. Con texto: doble clic para editar.',
    'pages.watermark.fontFamily': 'Fuente',
    'pages.watermark.fontLicenseNote':
      'Fuentes con licencias abiertas (SIL OFL 1.1 o Apache-2.0) vía Google Fonts.',
    'pages.watermark.fontSize': 'Tamaño de fuente',
    'pages.watermark.opacity': 'Opacidad',
    'pages.watermark.color': 'Color',
    'pages.watermark.dragHint':
      'Arrastra borde o relleno para mover. Esquinas ajustan tamaño. Vacío: clic en el cursor. Con texto: doble clic.',
    'pages.watermark.dragHandle': 'Arrastra dentro del marco para mover',
    'pages.watermark.resizeHandle': 'Arrastra para redimensionar el cuadro de texto',
    'pages.watermark.previewSize': 'Tamaño de vista previa',
    'pages.watermark.preview': 'Vista previa',
    'pages.watermark.previewTitle': 'Vista previa de marca de agua',
    'pages.watermark.action': 'Aplicar y descargar',
    'pages.meme.h1': 'Meme / subtítulo',
    'pages.meme.lead': 'Texto grande arriba y abajo, relleno blanco y borde negro (saltos de línea para varias líneas).',
    'pages.meme.defaultTop': 'TEXTO ARRIBA',
    'pages.meme.defaultBottom': 'TEXTO ABAJO',
    'pages.meme.top': 'Texto superior',
    'pages.meme.bottom': 'Texto inferior',
    'pages.meme.fontSize': 'Tamaño de fuente',
    'pages.meme.action': 'Generar y descargar',
    'pages.upscale.h1': 'Ampliar',
    'pages.upscale.lead':
      'Dos modos: interpolación bilineal rápida o superresolución neuronal local (UpscalerJS + TensorFlow.js).',
    'pages.upscale.leadFast':
      'Usa pica en local (Lanczos-3, WASM + workers). Si falla, resampling por canvas.',
    'pages.upscale.leadAi':
      'Modelo RDN ~2× por paso; 4× son dos pasos 2×. Primera vez descarga pesos; inferencia local.',
    'pages.upscale.mode': 'Modo',
    'pages.upscale.modeFast': 'Interpolación rápida',
    'pages.upscale.modeAi': 'Superresolución IA',
    'pages.upscale.scale': 'Escala (%)',
    'pages.upscale.aiFactor': 'Factor de ampliación',
    'pages.upscale.ai2x': '2× (recomendado)',
    'pages.upscale.ai4x': '4× (dos pasos 2×)',
    'pages.upscale.aiEdgeNote':
      'Para limitar VRAM, si el lado largo supera {n}px se reduce antes de la IA.',
    'pages.upscale.aiShrunk': 'El lado largo se limitó a {n}px antes de la IA.',
    'pages.upscale.refsIntro': 'Herramientas similares (nube / modelos propios):',
    'pages.upscale.outputFormat': 'Formato de salida',
    'pages.upscale.action': 'Ampliar y descargar',
    'pages.upscale.actionAi': 'Ampliar con IA y descargar',
    'pages.removeBg.h1': 'Quitar fondo',
    'pages.removeBg.lead':
      'Ideal para fondos lisos o casi lisos. Clic en la vista previa para muestrear color; ajusta tolerancia y suavizado.',
    'pages.removeBg.hintPick': 'Clic en el fondo de la vista previa para muestrear:',
    'pages.removeBg.tolerance': 'Tolerancia de color',
    'pages.removeBg.feather': 'Suavizado de borde',
    'pages.removeBg.picked': 'Color clave:',
    'pages.removeBg.action': 'Quitar y descargar',
    'pages.removeBg.previewAlt': 'Vista previa para muestreo',
    'pages.htmlToImage.h1': 'HTML a imagen',
    'pages.htmlToImage.lead':
      'Renderiza el fragmento y captúralo. Estilos en línea son más fiables; imágenes remotas requieren CORS.',
    'pages.htmlToImage.warnTitle':
      'No pegues HTML no confiable (mismos riesgos que abrir una web aleatoria).',
    'pages.htmlToImage.placeholder': 'Pega HTML aquí…',
    'pages.htmlToImage.action': 'Renderizar y exportar PNG',
    'pages.htmlToImage.previewHeader': 'Vista previa (área capturada)',
    'pages.blur.h1': 'Difuminar zona',
    'pages.blur.lead':
      'Arrastra el recuadro discontinuo; esquinas para redimensionar. La intensidad es el radio inferior.',
    'pages.blur.regionHint': 'Arrastra dentro del cuadro para mover; esquina para redimensionar.',
    'pages.blur.blurArea': 'Zona a difuminar',
    'pages.blur.previewSize': 'Tamaño de vista previa',
    'pages.blur.preview': 'Vista previa',
    'pages.blur.previewTitle': 'Vista previa del desenfoque',
    'pages.blur.radius': 'Radio de desenfoque',
    'pages.blur.action': 'Difuminar y descargar',
    'pages.webSkeleton.h1': 'Esqueleto web',
    'pages.webSkeleton.lead':
      'HTML en un sandbox oculto; bloques grises como la extensión Skeleton Generator. Cambia color y vuelve a generar. Sin scripts en el sandbox.',
    'pages.webSkeleton.warnTitle':
      'No pegues HTML no confiable. Sin scripts, pero pueden pedirse recursos remotos.',
    'pages.webSkeleton.placeholder': 'Pega HTML aquí…',
    'pages.webSkeleton.backgroundColor': 'Color del bloque',
    'pages.webSkeleton.granularity': 'Granularidad',
    'pages.webSkeleton.granularityHint':
      'Menor = bloques más grandes; mayor = tiras de texto más finas. Tras generar, el deslizador actualiza en vivo.',
    'pages.webSkeleton.actionGenerate': 'Generar esqueleto',
    'pages.webSkeleton.actionCopyHtml': 'Copiar HTML',
    'pages.webSkeleton.actionDownloadPng': 'Exportar PNG',
    'pages.webSkeleton.previewHeader': 'Vista previa del esqueleto',
    'pages.webSkeleton.previewEmpty': 'El esqueleto aparecerá aquí tras generar.',
    'pages.webSkeleton.previewAria': 'Vista previa del esqueleto',
    'pages.webSkeleton.previewUpdating': 'Actualizando…',
  },
}

// Add SEO descriptions for es (long) - merge via flat keys
packs.es['seo.descriptions.home'] =
  'Image Studio: herramientas de imagen en el navegador — comprimir JPG/PNG, recortar, redimensionar, rotar, convertir a JPEG, marca de agua, quitar fondo liso, ampliar (interpolación o IA local), HTML a PNG, desenfoque y esqueleto de página. Procesamiento local; sin subidas; sin instalación.'
packs.es['seo.descriptions.compress'] =
  'Reduce JPEG y PNG en el navegador: calidad JPEG y tope del lado largo — sin subir archivos.'
packs.es['seo.descriptions.upscale'] =
  'Amplía con escalado bilineal o superresolución IA local (TensorFlow.js). 2× o 4× encadenado; todo en el navegador.'
packs.es['seo.descriptions.removeBg'] =
  'Muestrea un color de fondo plano y usa tolerancia para recortar fondos blancos o chroma. PNG transparente en tu dispositivo.'
packs.es['seo.descriptions.resize'] =
  'Escala por porcentaje o píxeles con bloqueo de proporción opcional. JPEG o PNG; edición local.'
packs.es['seo.descriptions.crop'] =
  'Recorta con tiradores y descarga PNG — capturas, avatares y redes sin software de escritorio.'
packs.es['seo.descriptions.convertJpg'] =
  'Convierte PNG, WebP, GIF, etc. a JPEG con blanco detrás de la transparencia.'
packs.es['seo.descriptions.rotate'] =
  'Rota con 90°/180°/270° o ángulo personalizado. PNG o JPEG con vista previa local.'
packs.es['seo.descriptions.watermark'] =
  'Superpone texto con posición, color, tamaño y opacidad. PNG para muestras o avisos de copyright.'
packs.es['seo.descriptions.meme'] =
  'Subtítulos clásicos blanco con borde negro arriba y abajo; varias líneas; PNG local.'
packs.es['seo.descriptions.htmlToImage'] =
  'Renderiza HTML y captura PNG. Los recursos externos necesitan CORS; usa fragmentos de confianza.'
packs.es['seo.descriptions.blur'] =
  'Difumina un rectángulo para ocultar datos sensibles. PNG o JPEG; procesamiento local.'
packs.es['seo.descriptions.webSkeleton'] =
  'Renderiza HTML en sandbox y genera wireframe con bloques grises — exporta HTML o PNG; algoritmo tipo extensión Skeleton Generator; local.'

// --- French ---
packs.fr = {
  'seo.titles.home': 'Boîte à outils image en ligne gratuite — navigateur local',
  'seo.titles.compress': 'Compresser JPG/PNG en ligne (local)',
  'seo.titles.upscale': 'Agrandissement & super-résolution IA',
  'seo.titles.removeBg': 'Supprimer le fond en ligne',
  'seo.titles.resize': 'Redimensionner des images en ligne',
  'seo.titles.crop': 'Recadrer des images en ligne',
  'seo.titles.convertJpg': 'Convertir PNG/WebP en JPG en ligne',
  'seo.titles.rotate': 'Pivoter des images en ligne',
  'seo.titles.watermark': 'Ajouter un filigrane texte en ligne',
  'seo.titles.meme': 'Générateur de mèmes et légendes en ligne',
  'seo.titles.htmlToImage': 'HTML vers capture PNG',
  'seo.titles.blur': 'Flouter une zone (confidentialité)',
  'seo.titles.webSkeleton': 'Squelette / fil de page web',
  'nav.home': 'Accueil',
  'nav.tools': 'Outils',
  'nav.menuTitle': 'Navigation',
  'nav.openMenu': 'Ouvrir le menu',
  'nav.switchLanguage': 'Changer de langue',
  'footer.line': 'Les images sont traitées localement dans votre navigateur et ne sont pas envoyées.',
  'home.title': 'Image Studio — Boîte à outils image en ligne gratuite',
  'home.lead':
    'Modifiez vos images dans le navigateur : compression, recadrage, redimensionnement, rotation, conversion, filigrane, fond uni, agrandissement rapide ou IA locale, HTML vers PNG, floutage et squelette de page. Tout sur votre appareil — pas d’envoi ni d’installation.',
  'tools.compress.title': 'Compresser',
  'tools.compress.desc': 'Qualité JPEG ou limite du grand côté',
  'tools.upscale.title': 'Agrandir',
  'tools.upscale.desc': 'Interpolation ou IA locale (2×/4×), sans envoi',
  'tools.remove-bg.title': 'Supprimer le fond',
  'tools.remove-bg.desc': 'Tolérance de couleur ; PNG transparent',
  'tools.resize.title': 'Redimensionner',
  'tools.resize.desc': 'Pourcentage ou pixels ; ratio optionnel',
  'tools.crop.title': 'Recadrer',
  'tools.crop.desc': 'Zone puis télécharger PNG',
  'tools.convert-jpg.title': 'Vers JPG',
  'tools.convert-jpg.desc': 'Transparence blanche puis JPEG',
  'tools.rotate.title': 'Pivoter',
  'tools.rotate.desc': 'Préréglages 90° ou angle libre',
  'tools.watermark.title': 'Filigrane',
  'tools.watermark.desc': 'Texte : position, couleur, opacité',
  'tools.meme.title': 'Mème',
  'tools.meme.desc': 'Légendes haut/bas style classique',
  'tools.html-to-image.title': 'HTML vers image',
  'tools.html-to-image.desc': 'Rendu DOM puis capture',
  'tools.blur.title': 'Flouter une zone',
  'tools.blur.desc': 'Rectangle pour masquer le contenu privé',
  'tools.web-skeleton.title': 'Squelette web',
  'tools.web-skeleton.desc': 'Fil depuis HTML ; export HTML ou PNG',
  'picker.dragText': 'Déposez une image ici, ou ',
  'picker.clickPick': 'cliquez pour choisir',
  'picker.clear': 'Effacer',
  'picker.previewAlt': 'Aperçu',
  'msg.processing': 'Traitement…',
  'msg.selectImageFirst': 'Sélectionnez d’abord une image',
  'msg.selectImageCrop': 'Sélectionnez une image et attendez le chargement',
  'msg.selectImageRemoveBg': 'Sélectionnez une image puis cliquez sur le fond dans l’aperçu',
  'msg.enterWatermark': 'Saisissez le texte du filigrane',
  'msg.scaleGt100': 'L’échelle doit être supérieure à 100 %',
  'msg.tooManyPixels': 'Sortie trop grande — réduisez l’échelle',
  'msg.downloaded': 'Téléchargé',
  'msg.downloadedPng': 'PNG téléchargé',
  'msg.downloadedJpg': 'Enregistré en JPG',
  'msg.exportFail': 'Échec de l’export',
  'msg.processFail': 'Échec du traitement',
  'msg.processFailRetry': 'Échec — essayez une autre image',
  'msg.cropFail': 'Échec du recadrage',
  'msg.rotateFail': 'Échec de la rotation',
  'msg.convertFail': 'Échec de la conversion',
  'msg.genFail': 'Échec de la génération',
  'msg.readImageFail': 'Impossible de lire l’image',
  'msg.captureFail': 'Échec de capture — CORS peut bloquer les images externes',
  'msg.copiedHtml': 'HTML copié',
  'msg.copyFail': 'Échec de la copie',
  'msg.skeletonGenFail': 'Échec du squelette',
  'msg.skeletonNeedHtml': 'Collez d’abord du HTML',
  'msg.sampledRgb': 'Échantillon RGB({r}, {g}, {b})',
  'msg.aiUpscaleFail': 'IA échouée — image plus petite, mode rapide ou recharger',
  'pages.compress.h1': 'Compresser des images',
  'pages.compress.lead':
    'Réduire via qualité JPEG et/ou limite du grand côté ; PNG sans perte surtout par dimensions.',
  'pages.compress.outputFormat': 'Format de sortie',
  'pages.compress.jpegQuality': 'Qualité JPEG',
  'pages.compress.limitLongEdge': 'Limiter le grand côté',
  'pages.compress.edgeHint': 'px (réduit si plus grand)',
  'pages.compress.action': 'Compresser et télécharger',
  'pages.resize.h1': 'Redimensionner',
  'pages.resize.lead': 'Échelle proportionnelle ou largeur (verrouillage du ratio optionnel).',
  'pages.resize.mode': 'Mode',
  'pages.resize.percent': 'Pourcentage',
  'pages.resize.pixel': 'Pixels',
  'pages.resize.scalePercent': 'Échelle',
  'pages.resize.width': 'Largeur',
  'pages.resize.keepRatio': 'Verrouiller le ratio',
  'pages.resize.height': 'Hauteur',
  'pages.resize.outputFormat': 'Format de sortie',
  'pages.resize.fmtOriginal': 'Comme la source',
  'pages.resize.action': 'Redimensionner et télécharger',
  'pages.crop.h1': 'Recadrer',
  'pages.crop.lead': 'Faites glisser le cadre et les poignées, puis exportez en PNG.',
  'pages.crop.dialogTitle': 'Recadrer l’image',
  'pages.crop.reopenCrop': 'Ouvrir l’éditeur de recadrage',
  'pages.crop.cropAlt': 'Recadrage',
  'pages.crop.action': 'Recadrer et télécharger',
  'pages.convertJpg.h1': 'Convertir en JPG',
  'pages.convertJpg.lead': 'PNG, WebP, GIF, etc. en JPEG ; transparence en blanc.',
  'pages.convertJpg.jpegQuality': 'Qualité JPEG',
  'pages.convertJpg.action': 'Convertir et télécharger',
  'pages.rotate.h1': 'Pivoter',
  'pages.rotate.lead': 'Après import, utilisez le cadran ; raccourcis 90°/180°/270°.',
  'pages.rotate.dialogTitle': 'Pivoter l’image',
  'pages.rotate.reopenRotate': 'Ouvrir la boîte de rotation',
  'pages.rotate.knobHint': 'Appuyez et faites glisser sur le cadran — l’image suit.',
  'pages.rotate.knobAria': 'Angle de rotation',
  'pages.rotate.presetQuick': 'Raccourcis',
  'pages.rotate.customAngleLabel': 'Personnalisé (0–360°)',
  'pages.rotate.resetAngle': 'Réinitialiser',
  'pages.rotate.previewAlt': 'Aperçu de rotation',
  'pages.rotate.action': 'Télécharger',
  'pages.watermark.h1': 'Filigrane',
  'pages.watermark.lead':
    'Contour bleu = sélection (intérieur transparent). Glissez le bord ou la marge pour déplacer ; les coins changent la taille du texte. Vide : clignotant — clic pour taper. Avec texte : double-clic pour éditer.',
  'pages.watermark.fontFamily': 'Police',
  'pages.watermark.fontLicenseNote':
    'Polices sous licences ouvertes (SIL OFL 1.1 ou Apache-2.0) via Google Fonts.',
  'pages.watermark.fontSize': 'Taille de police',
  'pages.watermark.opacity': 'Opacité',
  'pages.watermark.color': 'Couleur',
  'pages.watermark.dragHint':
    'Glissez bord ou marge pour déplacer. Coins = taille. Vide : clic sur le curseur. Avec texte : double-clic.',
  'pages.watermark.dragHandle': 'Glisser dans le cadre pour déplacer',
  'pages.watermark.resizeHandle': 'Glisser pour redimensionner la zone de texte',
  'pages.watermark.previewSize': 'Taille d’aperçu',
  'pages.watermark.preview': 'Aperçu',
  'pages.watermark.previewTitle': 'Aperçu du filigrane',
  'pages.watermark.action': 'Appliquer et télécharger',
  'pages.meme.h1': 'Mème / légende',
  'pages.meme.lead': 'Grand texte haut et bas, blanc et contour noir (lignes multiples).',
  'pages.meme.defaultTop': 'TEXTE HAUT',
  'pages.meme.defaultBottom': 'TEXTE BAS',
  'pages.meme.top': 'Texte du haut',
  'pages.meme.bottom': 'Texte du bas',
  'pages.meme.fontSize': 'Taille de police',
  'pages.meme.action': 'Générer et télécharger',
  'pages.upscale.h1': 'Agrandir',
  'pages.upscale.lead':
    'Deux modes : interpolation bilinéaire rapide ou super-résolution locale (UpscalerJS + TensorFlow.js).',
  'pages.upscale.leadFast':
    'pica en local (noyau Lanczos-3, WASM + workers). Sinon rééchantillonnage canvas.',
  'pages.upscale.leadAi':
    'Modèle RDN ~2× par passe ; 4× = deux passes 2×. Premier lancement télécharge les poids ; inférence locale.',
  'pages.upscale.mode': 'Mode',
  'pages.upscale.modeFast': 'Interpolation rapide',
  'pages.upscale.modeAi': 'Super-résolution IA',
  'pages.upscale.scale': 'Échelle (%)',
  'pages.upscale.aiFactor': 'Facteur d’agrandissement',
  'pages.upscale.ai2x': '2× (recommandé)',
  'pages.upscale.ai4x': '4× (deux 2×)',
  'pages.upscale.aiEdgeNote':
    'Pour limiter la VRAM, si le grand côté dépasse {n}px, réduction avant IA.',
  'pages.upscale.aiShrunk': 'Grand côté limité à {n}px avant IA.',
  'pages.upscale.refsIntro': 'Outils similaires (souvent cloud) :',
  'pages.upscale.outputFormat': 'Format de sortie',
  'pages.upscale.action': 'Agrandir et télécharger',
  'pages.upscale.actionAi': 'IA agrandir et télécharger',
  'pages.removeBg.h1': 'Supprimer le fond',
  'pages.removeBg.lead':
    'Idéal pour fonds plats. Cliquez sur l’aperçu pour échantillonner la couleur ; tolérance et adoucissement.',
  'pages.removeBg.hintPick': 'Cliquez sur le fond dans l’aperçu pour échantillonner :',
  'pages.removeBg.tolerance': 'Tolérance de couleur',
  'pages.removeBg.feather': 'Adoucir le bord',
  'pages.removeBg.picked': 'Couleur clé :',
  'pages.removeBg.action': 'Supprimer et télécharger',
  'pages.removeBg.previewAlt': 'Aperçu pour échantillonnage',
  'pages.htmlToImage.h1': 'HTML vers image',
  'pages.htmlToImage.lead':
    'Rendez le fragment ci-dessous et capturez. Styles inline plus fiables ; images distantes = CORS.',
  'pages.htmlToImage.warnTitle':
    'Ne collez pas de HTML non fiable (mêmes risques qu’un site inconnu).',
  'pages.htmlToImage.placeholder': 'Collez le HTML ici…',
  'pages.htmlToImage.action': 'Rendre et exporter PNG',
  'pages.htmlToImage.previewHeader': 'Aperçu (zone capturée)',
  'pages.blur.h1': 'Flouter une zone',
  'pages.blur.lead':
    'Glissez le cadre en pointillés ; coins pour redimensionner. Intensité = rayon ci-dessous.',
  'pages.blur.regionHint': 'Glisser dans le cadre pour déplacer ; poignée de coin pour redimensionner.',
  'pages.blur.blurArea': 'Zone à flouter',
  'pages.blur.previewSize': 'Taille d’aperçu',
  'pages.blur.preview': 'Aperçu',
  'pages.blur.previewTitle': 'Aperçu du flou',
  'pages.blur.radius': 'Rayon de flou',
  'pages.blur.action': 'Flouter et télécharger',
  'pages.webSkeleton.h1': 'Squelette web',
  'pages.webSkeleton.lead':
    'HTML dans un bac à sable caché ; blocs gris comme l’extension Skeleton Generator. Changez la couleur et régénérez. Pas de scripts.',
  'pages.webSkeleton.warnTitle':
    'HTML non fiable : pas de scripts, mais ressources distantes possibles.',
  'pages.webSkeleton.placeholder': 'Collez le HTML ici…',
  'pages.webSkeleton.backgroundColor': 'Couleur des blocs',
  'pages.webSkeleton.granularity': 'Granularité',
  'pages.webSkeleton.granularityHint':
    'Plus bas = blocs plus gros ; plus haut = bandes de texte plus fines. Curseur en direct après génération.',
  'pages.webSkeleton.actionGenerate': 'Générer le squelette',
  'pages.webSkeleton.actionCopyHtml': 'Copier le HTML',
  'pages.webSkeleton.actionDownloadPng': 'Exporter PNG',
  'pages.webSkeleton.previewHeader': 'Aperçu du squelette',
  'pages.webSkeleton.previewEmpty': 'Le squelette apparaîtra ici après génération.',
  'pages.webSkeleton.previewAria': 'Aperçu du squelette',
  'pages.webSkeleton.previewUpdating': 'Mise à jour…',
}
packs.fr['seo.descriptions.home'] =
  'Image Studio : outils image dans le navigateur — compression JPG/PNG, recadrage, redimensionnement, rotation, JPEG, filigrane, fond uni, agrandissement (interpolation ou IA locale), HTML vers PNG, flou, squelette. Traitement local ; pas d’envoi ; sans installation.'
packs.fr['seo.descriptions.compress'] =
  'Réduisez JPEG et PNG dans le navigateur : qualité et limite du grand côté — sans envoi.'
packs.fr['seo.descriptions.upscale'] =
  'Agrandissement bilinéaire ou super-résolution IA locale (TensorFlow.js). 2× ou 4× chaîné ; tout dans le navigateur.'
packs.fr['seo.descriptions.removeBg'] =
  'Échantillonnez une couleur de fond plate ; tolérance pour détourer. PNG transparent sur l’appareil.'
packs.fr['seo.descriptions.resize'] =
  'Échelle en % ou pixels avec ratio optionnel. JPEG ou PNG ; édition locale.'
packs.fr['seo.descriptions.crop'] =
  'Recadrez avec poignées et téléchargez PNG — captures, avatars, réseaux.'
packs.fr['seo.descriptions.convertJpg'] =
  'PNG, WebP, GIF… en JPEG avec blanc derrière la transparence.'
packs.fr['seo.descriptions.rotate'] =
  '90°/180°/270° ou angle libre. PNG ou JPEG avec aperçu local.'
packs.fr['seo.descriptions.watermark'] =
  'Texte positionnable : couleur, taille, opacité. PNG pour échantillons ou mentions.'
packs.fr['seo.descriptions.meme'] =
  'Légendes classiques haut/bas ; plusieurs lignes ; PNG local.'
packs.fr['seo.descriptions.htmlToImage'] =
  'Rendu HTML et capture PNG. Actifs externes = CORS ; fragments de confiance.'
packs.fr['seo.descriptions.blur'] =
  'Rectangle pour masquer données sensibles. PNG ou JPEG ; local.'
packs.fr['seo.descriptions.webSkeleton'] =
  'HTML en bac à sable → squelette gris ; export HTML ou PNG ; algorithme type extension ; local.'

Object.assign(packs, extraPacks)

for (const [code, flat] of Object.entries(packs)) {
  const out = deepClone(en)
  applyFlat(out, flat)
  writeFileSync(
    join(root, 'src/i18n/locales', `${code}.json`),
    `${JSON.stringify(out, null, 2)}\n`,
    'utf8',
  )
  console.log('wrote', code)
}

