function cleanPhoneNumber(phone: string | undefined): string {
  if (!phone) return '';
  return phone.replace(/[^\d]/g, '').replace(/^0+/, '');
}

export function buildWhatsAppUrl(phone: string | undefined, message: string): string {
  const cleaned = cleanPhoneNumber(phone);
  const text = encodeURIComponent(message);
  return cleaned
    ? `https://wa.me/${cleaned}?text=${text}`
    : `https://wa.me/?text=${text}`;
}

export function buildTelegramUrl(message: string): string {
  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
  return `https://t.me/share/url?url=${encodeURIComponent(appUrl)}&text=${encodeURIComponent(message)}`;
}

export function openShareUrl(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

import { generatePdfBlob, downloadPdfFromElement } from '@/utils/printDocument';

type ShareTarget = 'whatsapp' | 'telegram';

interface SharePdfOptions {
  elementId: string;
  docNumber: string;
  docType: string;
  clientName: string;
  message: string;
  phone?: string;
  target: ShareTarget;
  showToast: (msg: string) => void;
}

export async function sharePdfDocument({
  elementId,
  docNumber,
  docType,
  clientName,
  message,
  phone,
  target,
  showToast,
}: SharePdfOptions): Promise<void> {
  const safeName = docNumber.replace(/\//g, '-');
  const fileName = `${safeName}.pdf`;

  const blob = await generatePdfBlob(elementId, fileName);
  if (!blob) {
    showToast('Could not generate the PDF. Please try again.');
    return;
  }

  const file = new File([blob], fileName, { type: 'application/pdf' });
  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
    share?: (data?: ShareData) => Promise<void>;
  };

  if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
    try {
      await nav.share({ title: docNumber, text: message, files: [file] });
      return;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
    }
  }

  // Desktop / unsupported fallback
  await downloadPdfFromElement(elementId, fileName);

  const fallbackText = `Hello ${clientName}, please find attached your ${docType} ${docNumber}. (PDF automatically downloaded to attach)`;
  if (target === 'whatsapp') {
    openShareUrl(buildWhatsAppUrl(phone, fallbackText));
  } else {
    openShareUrl(buildTelegramUrl(fallbackText));
  }
  showToast('PDF downloaded! You can now drag and drop it directly into your chat.');
}
