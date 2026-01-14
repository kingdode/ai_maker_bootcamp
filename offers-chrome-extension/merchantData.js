/**
 * Merchant URL Mappings for DealStackr
 * 
 * Maps merchant names to their landing URLs for signup offer detection.
 * Used by the merchant dashboard to link to merchant sites.
 */

/**
 * Known merchant URL mappings
 * Maps lowercase merchant names to their homepage URLs
 */
const MERCHANT_URL_MAPPINGS = {
  // Fashion
  'nike': 'https://www.nike.com/',
  'adidas': 'https://www.adidas.com/us',
  'gap': 'https://www.gap.com/',
  'old navy': 'https://oldnavy.gap.com/',
  'banana republic': 'https://bananarepublic.gap.com/',
  'nordstrom': 'https://www.nordstrom.com/',
  "macy's": 'https://www.macys.com/',
  'macys': 'https://www.macys.com/',
  'h&m': 'https://www2.hm.com/en_us/index.html',
  'uniqlo': 'https://www.uniqlo.com/us/en/',
  'asos': 'https://www.asos.com/us/',
  'zara': 'https://www.zara.com/us/',
  'rag & bone': 'https://www.rag-bone.com/',
  'everlane': 'https://www.everlane.com/',
  'allbirds': 'https://www.allbirds.com/',
  'lululemon': 'https://www.lululemon.com/',
  'athleta': 'https://athleta.gap.com/',
  'j.crew': 'https://www.jcrew.com/',
  'brooks brothers': 'https://www.brooksbrothers.com/',
  
  // Beauty
  'sephora': 'https://www.sephora.com/',
  'ulta': 'https://www.ulta.com/',
  'ulta beauty': 'https://www.ulta.com/',
  'glossier': 'https://www.glossier.com/',
  'bath & body works': 'https://www.bathandbodyworks.com/',
  'fenty beauty': 'https://fentybeauty.com/',
  
  // Electronics
  'best buy': 'https://www.bestbuy.com/',
  'bestbuy': 'https://www.bestbuy.com/',
  'apple': 'https://www.apple.com/',
  'samsung': 'https://www.samsung.com/us/',
  'dell': 'https://www.dell.com/en-us',
  'hp': 'https://www.hp.com/us-en/home.html',
  'b&h': 'https://www.bhphotovideo.com/',
  'b&h photo': 'https://www.bhphotovideo.com/',
  'newegg': 'https://www.newegg.com/',
  
  // Home & Furniture
  'wayfair': 'https://www.wayfair.com/',
  'west elm': 'https://www.westelm.com/',
  'pottery barn': 'https://www.potterybarn.com/',
  'crate & barrel': 'https://www.crateandbarrel.com/',
  'cb2': 'https://www.cb2.com/',
  'williams sonoma': 'https://www.williams-sonoma.com/',
  'overstock': 'https://www.overstock.com/',
  'home depot': 'https://www.homedepot.com/',
  "lowe's": 'https://www.lowes.com/',
  'lowes': 'https://www.lowes.com/',
  'bed bath & beyond': 'https://www.bedbathandbeyond.com/',
  'ikea': 'https://www.ikea.com/us/',
  
  // Travel
  'hotels.com': 'https://www.hotels.com/',
  'expedia': 'https://www.expedia.com/',
  'booking.com': 'https://www.booking.com/',
  'southwest': 'https://www.southwest.com/',
  'southwest airlines': 'https://www.southwest.com/',
  'delta': 'https://www.delta.com/',
  'delta airlines': 'https://www.delta.com/',
  'united': 'https://www.united.com/',
  'united airlines': 'https://www.united.com/',
  'american airlines': 'https://www.aa.com/',
  'marriott': 'https://www.marriott.com/',
  'hilton': 'https://www.hilton.com/',
  'hyatt': 'https://www.hyatt.com/',
  'airbnb': 'https://www.airbnb.com/',
  'vrbo': 'https://www.vrbo.com/',
  'kayak': 'https://www.kayak.com/',
  
  // General Retail
  'target': 'https://www.target.com/',
  'walmart': 'https://www.walmart.com/',
  'amazon': 'https://www.amazon.com/',
  'costco': 'https://www.costco.com/',
  'staples': 'https://www.staples.com/',
  'office depot': 'https://www.officedepot.com/',
  
  // Food & Delivery
  'doordash': 'https://www.doordash.com/',
  'uber eats': 'https://www.ubereats.com/',
  'ubereats': 'https://www.ubereats.com/',
  'instacart': 'https://www.instacart.com/',
  'grubhub': 'https://www.grubhub.com/',
  'starbucks': 'https://www.starbucks.com/',
  'chipotle': 'https://www.chipotle.com/',
  'panera': 'https://www.panerabread.com/',
  'panera bread': 'https://www.panerabread.com/',
  'shake shack': 'https://www.shakeshack.com/',
  'sweetgreen': 'https://www.sweetgreen.com/',
  
  // Pet
  'chewy': 'https://www.chewy.com/',
  'petco': 'https://www.petco.com/',
  'petsmart': 'https://www.petsmart.com/',
  
  // Health & Pharmacy
  'walgreens': 'https://www.walgreens.com/',
  'cvs': 'https://www.cvs.com/',
  'vitamin shoppe': 'https://www.vitaminshoppe.com/',
  'rite aid': 'https://www.riteaid.com/',
  
  // Entertainment & Subscriptions
  'ticketmaster': 'https://www.ticketmaster.com/',
  'stubhub': 'https://www.stubhub.com/',
  'spotify': 'https://www.spotify.com/',
  'netflix': 'https://www.netflix.com/',
  'hulu': 'https://www.hulu.com/',
  'disney+': 'https://www.disneyplus.com/',
  'hbo max': 'https://www.max.com/',
  'paramount+': 'https://www.paramountplus.com/',
  
  // Transportation
  'lyft': 'https://www.lyft.com/',
  'uber': 'https://www.uber.com/',
  
  // Sports & Outdoors
  'rei': 'https://www.rei.com/',
  'dick\'s sporting goods': 'https://www.dickssportinggoods.com/',
  'dicks sporting goods': 'https://www.dickssportinggoods.com/',
  'bass pro shops': 'https://www.basspro.com/',
  'cabela\'s': 'https://www.cabelas.com/',
  
  // Grocery
  'whole foods': 'https://www.wholefoodsmarket.com/',
  'trader joe\'s': 'https://www.traderjoes.com/',
  'safeway': 'https://www.safeway.com/',
  'kroger': 'https://www.kroger.com/',
  'albertsons': 'https://www.albertsons.com/'
};

/**
 * Get landing URL for a merchant
 * @param {string} merchantName - Merchant name to look up
 * @returns {string|null} Landing URL or null if not found
 */
function getMerchantLandingUrl(merchantName) {
  if (!merchantName) return null;
  
  const normalized = merchantName.toLowerCase().trim();
  
  // Direct match
  if (MERCHANT_URL_MAPPINGS[normalized]) {
    return MERCHANT_URL_MAPPINGS[normalized];
  }
  
  // Partial match
  for (const [key, url] of Object.entries(MERCHANT_URL_MAPPINGS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return url;
    }
  }
  
  return null;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MERCHANT_URL_MAPPINGS, getMerchantLandingUrl };
}
