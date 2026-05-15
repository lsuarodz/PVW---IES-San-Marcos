import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

export async function generatePDF(element: HTMLElement, options: any) {
  const canvas = await html2canvas(element, options.html2canvas || {});
  const imgData = canvas.toDataURL(options.image?.type || 'image/jpeg', options.image?.quality || 0.95);
  
  const pdf = new jsPDF(options.jsPDF || { unit: 'in', format: 'a4', orientation: 'portrait' });
  
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  
  const rawMargin = options.margin || 0;
  let margin = [0, 0, 0, 0];
  if (typeof rawMargin === 'number') {
    margin = [rawMargin, rawMargin, rawMargin, rawMargin];
  } else if (Array.isArray(rawMargin)) {
    if (rawMargin.length === 1) margin = [rawMargin[0], rawMargin[0], rawMargin[0], rawMargin[0]];
    else if (rawMargin.length === 2) margin = [rawMargin[0], rawMargin[1], rawMargin[0], rawMargin[1]];
    else if (rawMargin.length === 4) margin = rawMargin;
  }
  
  const contentWidth = pdfWidth - margin[1] - margin[3];
  const contentHeight = pdfHeight - margin[0] - margin[2];
  const marginTop = margin[0];
  const marginLeft = margin[3];
  
  const imgWidth = contentWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  
  let heightLeft = imgHeight;
  let position = 0;
  
  pdf.addImage(imgData, 'JPEG', marginLeft, marginTop + position, imgWidth, imgHeight);
  heightLeft -= contentHeight;
  
  while (heightLeft > 0) {
    position -= contentHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', marginLeft, marginTop + position, imgWidth, imgHeight);
    heightLeft -= contentHeight;
  }
  
  pdf.save(options.filename || 'document.pdf');
}
