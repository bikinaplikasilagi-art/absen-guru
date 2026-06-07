import { WhatsappConfig } from '../types';

export const sendWhatsappMessage = async (
  to: string,
  message: string,
  config?: WhatsappConfig
): Promise<{ success: boolean; error?: string }> => {
  if (!config || !config.enabled || !config.apiKey) {
    return { success: false, error: 'WhatsApp not configured or disabled' };
  }

  if (!to) {
    return { success: false, error: 'Recipient phone number is missing' };
  }

  // Format phone number to ensure it starts with country code, assuming Indonesia (62)
  let formattedPhone = to.replace(/\D/g, '');
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '62' + formattedPhone.substring(1);
  }

  try {
    if (config.provider === 'fonnte') {
      const response = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          'Authorization': config.apiKey,
        },
        body: new URLSearchParams({
          target: formattedPhone,
          message: message,
          delay: '2',
          countryCode: '62'
        })
      });

      const result = await response.json();
      if (result.status === true) {
        return { success: true };
      } else {
        return { success: false, error: result.detail || result.reason || 'Unknown Fonnte API error' };
      }
    } else if (config.provider === 'wablas') {
      // Wablas default endpoint, requires specific domain usually, 
      // but we use a common one as placeholder.
      // E.g., 'https://selatan.wablas.com/api/send-message'
      // It's better to stick to Fonnte for simplicity or ask for a domain if we are serious.
      // But we will mock the Wablas call for now to show concept if they use it.
      return { success: false, error: 'Wablas provider requires specific domain endpoint in config which is not implemented yet. Please use Fonnte.' };
    }
    
    return { success: false, error: 'Unsupported provider' };
  } catch (error: any) {
    console.error('WhatsApp Error:', error);
    return { success: false, error: error.message };
  }
};
