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
