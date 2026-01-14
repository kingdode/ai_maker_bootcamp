/**
 * Chrome Extension Integration
 * 
 * This module handles communication with the Dealstackr Chrome extension
 * to retrieve stored offer data. It supports both chrome.storage.local
 * and message passing methods.
 * 
 * The extension stores data in chrome.storage.local with the structure:
 * {
 *   dealCohorts: { "2026-01-07": [...offers] },
 *   allDeals: [...all offers],
 *   currentCohort: "2026-01-07"
 * }
 */

import { Offer, ExtensionOffer, DealCohorts } from '../types/offer';
import { mockOffers } from '../mockData/mockOffers';

// Type guard to check if Chrome extension APIs are available
function isChromeExtensionAvailable(): boolean {
  return typeof window !== 'undefined' &&
         typeof (window as any).chrome !== 'undefined' && 
         (window as any).chrome.storage !== undefined && 
         (window as any).chrome.storage.local !== undefined;
}

/**
 * Transform extension offer format to dashboard offer format
 * Extension uses: merchant_name, card_type, scanned_at
 * Dashboard expects: merchant, card_name, last_scanned_at
 */
function transformOffer(extOffer: ExtensionOffer): Offer {
  return {
    merchant: extOffer.merchant_name || extOffer.merchant || '',
    offer_value: extOffer.offer_value || '',
    offer_type: extOffer.offer_type,
    issuer: extOffer.issuer,
    card_name: extOffer.card_type || extOffer.card_name || `${extOffer.issuer === 'chase' ? 'Chase' : 'Amex'}`,
    channel: extOffer.channel,
    last_scanned_at: extOffer.scanned_at || extOffer.last_scanned_at || new Date().toISOString()
  };
}

/**
 * Retrieve offers from Chrome extension storage
 * Reads from chrome.storage.local where the extension stores dealCohorts
 * The extension stores: { dealCohorts: {...}, allDeals: [...], currentCohort: "..." }
 */
export async function getOffersFromExtension(): Promise<Offer[]> {
  // Check if Chrome extension APIs are available
  if (!isChromeExtensionAvailable()) {
    console.warn('[Dealstackr Dashboard] Chrome extension APIs not available');
    console.warn('[Dealstackr Dashboard] Make sure you are accessing this from a Chrome extension context or using the extension bridge');
    return mockOffers;
  }

  try {
    // Read from chrome.storage.local
    // The extension stores data as: 
    // { 
    //   dealCohorts: { "2026-01-07": [...offers] },
    //   allDeals: [...all offers],
    //   currentCohort: "2026-01-07"
    // }
    const chromeStorage = (window as any).chrome?.storage?.local;
    if (!chromeStorage) {
      throw new Error('Chrome storage API not available');
    }

    const result = await new Promise<{ 
      dealCohorts?: DealCohorts;
      allDeals?: ExtensionOffer[];
      currentCohort?: string;
    }>((resolve, reject) => {
      try {
        chromeStorage.get(['dealCohorts', 'allDeals', 'currentCohort'], (items: any) => {
          const chromeRuntime = (window as any).chrome?.runtime;
          if (chromeRuntime?.lastError) {
            reject(chromeRuntime.lastError);
          } else {
            resolve(items as { 
              dealCohorts?: DealCohorts;
              allDeals?: ExtensionOffer[];
              currentCohort?: string;
            });
          }
        });
      } catch (err) {
        reject(err);
      }
    });

    // Prefer dealCohorts (newer structure), fallback to allDeals (backward compatibility)
    let allOffers: ExtensionOffer[] = [];

    if (result.dealCohorts && Object.keys(result.dealCohorts).length > 0) {
      // Merge all cohorts into a single array
      Object.values(result.dealCohorts).forEach(cohortOffers => {
        if (Array.isArray(cohortOffers)) {
          allOffers.push(...cohortOffers);
        }
      });
      console.log(`[Dealstackr Dashboard] Loaded from dealCohorts: ${Object.keys(result.dealCohorts).length} cohorts`);
    } else if (result.allDeals && Array.isArray(result.allDeals) && result.allDeals.length > 0) {
      // Fallback to allDeals for backward compatibility
      allOffers = result.allDeals;
      console.log(`[Dealstackr Dashboard] Loaded from allDeals (legacy format)`);
    }

    if (allOffers.length === 0) {
      console.info('[Dealstackr Dashboard] No extension data found, using mock data');
      return mockOffers;
    }

    // Transform to dashboard format
    const transformedOffers = allOffers
      .filter(offer => offer.merchant_name || offer.merchant) // Filter out invalid offers
      .map(transformOffer);

    console.log(`[Dealstackr Dashboard] Successfully loaded ${transformedOffers.length} offers from extension`);
    return transformedOffers;

  } catch (error) {
    console.error('[Dealstackr Dashboard] Error reading from extension storage:', error);
    console.error('[Dealstackr Dashboard] Falling back to mock data');
    return mockOffers;
  }
}

/**
 * Alternative method: Request data via message passing
 * This can be used if the extension exposes a message handler
 */
export async function getOffersViaMessage(): Promise<Offer[]> {
  if (!isChromeExtensionAvailable()) {
    const chromeRuntime = (window as any).chrome?.runtime;
    if (!chromeRuntime) {
      console.warn('[Dealstackr] Chrome runtime not available, using mock data');
      return mockOffers;
    }
  }

  try {
    // Get extension ID (you'll need to replace this with actual extension ID)
    // For development, this might be in a config file
    // Note: In Next.js, use NEXT_PUBLIC_ prefix for client-side env vars
    const extensionId = '';

    if (!extensionId) {
      console.warn('[Dealstackr] Extension ID not configured, using storage method');
      return getOffersFromExtension();
    }

    const chromeRuntime = (window as any).chrome?.runtime;
    if (!chromeRuntime) {
      return getOffersFromExtension();
    }

    // Send message to extension
    const response = await new Promise<ExtensionOffer[]>((resolve, reject) => {
      chromeRuntime.sendMessage(
        extensionId,
        { action: 'getOffers' },
        (response: any) => {
          if (chromeRuntime.lastError) {
            reject(chromeRuntime.lastError);
          } else {
            resolve(response?.offers || []);
          }
        }
      );
    });

    return response.map(transformOffer);

  } catch (error) {
    console.error('[Dealstackr] Error communicating with extension:', error);
    // Fallback to storage method
    return getOffersFromExtension();
  }
}

/**
 * Check if extension is installed and available
 */
export function checkExtensionAvailability(): boolean {
  return isChromeExtensionAvailable();
}

/**
 * Get extension ID by trying to detect it or using a known ID
 * In production, you'd want to store this in an env variable
 */
function getExtensionId(): string | null {
  // Try to get extension ID from window
  // For localhost development, we'll try to detect it
  if (typeof window !== 'undefined') {
    // Check if we're in an extension context
    const chromeRuntime = (window as any).chrome?.runtime;
    if (chromeRuntime?.id) {
      return chromeRuntime.id;
    }
  }
  
  // For localhost, we can try common extension IDs or detect from storage
  // The extension ID will be shown in chrome://extensions when you load unpacked
  return null;
}

/**
 * Request offers via message passing (works from external pages)
 */
async function getOffersViaMessagePassing(): Promise<Offer[]> {
  const chromeRuntime = (window as any).chrome?.runtime;
  if (!chromeRuntime || !chromeRuntime.sendMessage) {
    return mockOffers;
  }

  // Try to get extension ID from localStorage or try without ID first
  let extensionId: string | undefined = undefined;
  if (typeof window !== 'undefined') {
    extensionId = localStorage.getItem('dealstackr_extension_id') || undefined;
  }
  
  try {
    // Try sending message (with or without extension ID)
    const response = await new Promise<any>((resolve, reject) => {
      const message = { action: 'getOffers' };
      
      if (extensionId) {
        // Send to specific extension
        chromeRuntime.sendMessage(
          extensionId,
          message,
          (response: any) => {
            if (chromeRuntime.lastError) {
              reject(chromeRuntime.lastError);
            } else {
              resolve(response);
            }
          }
        );
      } else {
        // Try without extension ID (works if we're in extension context)
        chromeRuntime.sendMessage(
          message,
          (response: any) => {
            if (chromeRuntime.lastError) {
              reject(chromeRuntime.lastError);
            } else {
              resolve(response);
            }
          }
        );
      }
    });

    if (response && response.success) {
      // Merge cohorts
      let allOffers: ExtensionOffer[] = [];
      
      if (response.dealCohorts && Object.keys(response.dealCohorts).length > 0) {
        Object.values(response.dealCohorts).forEach((cohortOffers: any) => {
          if (Array.isArray(cohortOffers)) {
            allOffers.push(...cohortOffers);
          }
        });
      } else if (response.allDeals && Array.isArray(response.allDeals)) {
        allOffers = response.allDeals;
      }

      if (allOffers.length > 0) {
        const transformed = allOffers
          .filter(offer => offer.merchant_name || offer.merchant)
          .map(transformOffer);
        console.log(`[Dealstackr Dashboard] Loaded ${transformed.length} offers via message passing`);
        return transformed;
      }
    }
  } catch (error) {
    console.warn('[Dealstackr Dashboard] Message passing failed:', error);
  }

  return mockOffers;
}

/**
 * Primary function to get offers
 * Tries multiple methods: direct storage access, message passing, then mock data
 */
export async function getOffers(): Promise<Offer[]> {
  // Method 1: Try direct storage access (works in extension context)
  if (isChromeExtensionAvailable()) {
    try {
      const offers = await getOffersFromExtension();
      // Check if we got real data (not mock)
      if (offers.length > 0 && offers !== mockOffers) {
        return offers;
      }
    } catch (error) {
      console.warn('[Dealstackr Dashboard] Direct storage access failed:', error);
    }
  }

  // Method 2: Try message passing (works from external pages)
  try {
    const offers = await getOffersViaMessagePassing();
    if (offers.length > 0 && offers !== mockOffers) {
      return offers;
    }
  } catch (error) {
    console.warn('[Dealstackr Dashboard] Message passing failed:', error);
  }

  // Method 3: Fall back to mock data
  console.info('[Dealstackr Dashboard] Using mock data - extension not accessible');
  return mockOffers;
}

