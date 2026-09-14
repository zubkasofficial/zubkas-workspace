import html2pdf from 'html2pdf.js';

export const downloadPdfFromElement = (elementId: string, filename: string): void => {
  const element = document.getElementById(elementId);
  if (!element) return;

  const opt = {
    margin: [8, 8, 8, 8] as [number, number, number, number],
    filename: filename.endsWith('.pdf') ? filename : `${filename}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true,
      scrollY: 0,
      windowWidth: element.scrollWidth,
    },
    jsPDF: { unit: 'mm' as const, format: 'a4', orientation: 'portrait' as const },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  };

  html2pdf().set(opt).from(element).save();
};
