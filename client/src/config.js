// Centralized configuration for client-side external links, numbers and endpoints
export const APP_CONFIG = {
  // Support & Community WhatsApp links (configurable via Vite env vars or fallbacks)
  WHATSAPP_NUMBER: import.meta.env.VITE_WHATSAPP_NUMBER || '7380405227',
  WHATSAPP_GROUP_LINK: import.meta.env.VITE_WHATSAPP_GROUP_LINK || 'https://whatsapp.com/channel/0029VbE4uQtICVfekgrW712X',
  WHATSAPP_CHANNEL_LINK: 'https://whatsapp.com/channel/0029VbE4uQtICVfekgrW712X',
  STORE_PHONE: '7380405227',
  STORE_EMAIL: 'acubebeauty@gmail.com',
  STORE_NAME: 'Panda Nest',

  // Helper to build WhatsApp chat URL
  getWhatsAppChatUrl(customMsg = 'Hi Panda Nest! I have an inquiry about my order / toys.') {
    const cleanNumber = String(this.WHATSAPP_NUMBER).replace(/\D/g, '').slice(-10);
    const encoded = encodeURIComponent(customMsg);
    return `https://wa.me/91${cleanNumber}?text=${encoded}`;
  }
};
