import html2pdf from 'html2pdf.js';

export async function generatePDF(element: HTMLElement, options: any) {
  return html2pdf().set(options).from(element).save();
}
