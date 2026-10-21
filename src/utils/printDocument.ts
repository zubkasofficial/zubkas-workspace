import html2pdf from 'html2pdf.js';

export const generatePdfBlob = (elementId: string, filename: string): Promise<Blob | null> => {
  const element = document.getElementById(elementId);
  if (!element) return Promise.resolve(null);

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

  return html2pdf().set(opt).from(element).outputPdf('blob') as Promise<Blob>;
};

export const downloadPdfFromElement = async (elementId: string, filename: string): Promise<void> => {
  const blob = await generatePdfBlob(elementId, filename);
  if (!blob) return;

  const safeName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = safeName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
