import html2pdf from 'html2pdf.js';

export async function generatePDF(element: HTMLElement, options: any) {
  // Asegurarse de que todas las fuentes estén cargadas antes de capturar el elemento
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await document.fonts.ready;
    } catch (e) {
      console.warn('Error esperando a document.fonts.ready:', e);
    }
  }

  // Dar tiempo al navegador para computar y cargar los estilos
  await new Promise((resolve) => setTimeout(resolve, 150));

  return html2pdf().set(options).from(element).save();
}

