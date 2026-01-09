/**
 * Static Merchant-to-Affiliate Mapping for DealStackr
 * 
 * This file contains curated data about merchants and their typical affiliate program participation.
 * Updated periodically to reflect current affiliate landscape.
 * 
 * Reliability tiers:
 * - "high": Merchant consistently participates in multiple cashback programs
 * - "medium": Merchant participates but may pause periodically  
 * - "low": Merchant occasionally participates or has limited availability
 * 
 * Portals:
 * - rakuten: Rakuten (formerly Ebates)
 * - topcashback: TopCashback
 * - honey: Honey (PayPal)
 * - retailmenot: RetailMeNot
 * - befrugal: BeFrugal
 * - mrrebates: Mr. Rebates
 */

const AFFILIATE_MERCHANT_DATA = {
  // Major Retailers
  "target.com": {
    name: "Target",
    reliability: "high",
    portals: ["rakuten", "topcashback", "honey"],
    typicalRate: "1-2%",
    categories: ["general", "grocery", "home"]
  },
  "walmart.com": {
    name: "Walmart", 
    reliability: "medium",
    portals: ["rakuten", "topcashback"],
    typicalRate: "1-5%",
    categories: ["general", "grocery", "electronics"]
  },
  "amazon.com": {
    name: "Amazon",
    reliability: "low",
    portals: ["topcashback"],
    typicalRate: "0.5-1%",
    categories: ["general"],
    notes: "Limited categories, often excluded"
  },
  "costco.com": {
    name: "Costco",
    reliability: "medium",
    portals: ["rakuten"],
    typicalRate: "1-2%",
    categories: ["general", "grocery"]
  },
  "bestbuy.com": {
    name: "Best Buy",
    reliability: "high",
    portals: ["rakuten", "topcashback", "honey", "retailmenot"],
    typicalRate: "1-2%",
    categories: ["electronics", "appliances"]
  },
  "homedepot.com": {
    name: "Home Depot",
    reliability: "high",
    portals: ["rakuten", "topcashback", "befrugal"],
    typicalRate: "1-2%",
    categories: ["home", "hardware"]
  },
  "lowes.com": {
    name: "Lowe's",
    reliability: "high",
    portals: ["rakuten", "topcashback", "retailmenot"],
    typicalRate: "1-2%",
    categories: ["home", "hardware"]
  },
  
  // Fashion & Apparel
  "nike.com": {
    name: "Nike",
    reliability: "high",
    portals: ["rakuten", "topcashback", "honey", "befrugal"],
    typicalRate: "2-8%",
    categories: ["fashion", "sports"]
  },
  "adidas.com": {
    name: "Adidas",
    reliability: "high",
    portals: ["rakuten", "topcashback", "honey"],
    typicalRate: "4-8%",
    categories: ["fashion", "sports"]
  },
  "macys.com": {
    name: "Macy's",
    reliability: "high",
    portals: ["rakuten", "topcashback", "honey", "retailmenot", "befrugal"],
    typicalRate: "2-10%",
    categories: ["fashion", "home"]
  },
  "nordstrom.com": {
    name: "Nordstrom",
    reliability: "high",
    portals: ["rakuten", "topcashback", "honey"],
    typicalRate: "2-6%",
    categories: ["fashion", "luxury"]
  },
  "gap.com": {
    name: "Gap",
    reliability: "high",
    portals: ["rakuten", "topcashback", "honey", "retailmenot"],
    typicalRate: "4-10%",
    categories: ["fashion"]
  },
  "oldnavy.com": {
    name: "Old Navy",
    reliability: "high",
    portals: ["rakuten", "topcashback", "honey"],
    typicalRate: "4-8%",
    categories: ["fashion"]
  },
  "hm.com": {
    name: "H&M",
    reliability: "high",
    portals: ["rakuten", "topcashback"],
    typicalRate: "2-4%",
    categories: ["fashion"]
  },
  "zara.com": {
    name: "Zara",
    reliability: "medium",
    portals: ["rakuten"],
    typicalRate: "1-3%",
    categories: ["fashion"]
  },
  "uniqlo.com": {
    name: "Uniqlo",
    reliability: "high",
    portals: ["rakuten", "topcashback"],
    typicalRate: "2-4%",
    categories: ["fashion"]
  },
  "asos.com": {
    name: "ASOS",
    reliability: "high",
    portals: ["rakuten", "topcashback", "honey"],
    typicalRate: "3-7%",
    categories: ["fashion"]
  },
  
  // Beauty & Personal Care
  "sephora.com": {
    name: "Sephora",
    reliability: "high",
    portals: ["rakuten", "topcashback", "honey", "befrugal"],
    typicalRate: "2-8%",
    categories: ["beauty"]
  },
  "ulta.com": {
    name: "Ulta Beauty",
    reliability: "high",
    portals: ["rakuten", "topcashback", "retailmenot"],
    typicalRate: "2-6%",
    categories: ["beauty"]
  },
  "bathandbodyworks.com": {
    name: "Bath & Body Works",
    reliability: "high",
    portals: ["rakuten", "topcashback", "honey"],
    typicalRate: "2-6%",
    categories: ["beauty", "home"]
  },
  
  // Electronics & Tech
  "apple.com": {
    name: "Apple",
    reliability: "medium",
    portals: ["rakuten", "topcashback"],
    typicalRate: "0.5-2%",
    categories: ["electronics"],
    notes: "Excludes iPhone, limited products"
  },
  "samsung.com": {
    name: "Samsung",
    reliability: "high",
    portals: ["rakuten", "topcashback", "honey"],
    typicalRate: "1-4%",
    categories: ["electronics"]
  },
  "dell.com": {
    name: "Dell",
    reliability: "high",
    portals: ["rakuten", "topcashback", "befrugal"],
    typicalRate: "2-6%",
    categories: ["electronics", "computers"]
  },
  "hp.com": {
    name: "HP",
    reliability: "high",
    portals: ["rakuten", "topcashback"],
    typicalRate: "2-5%",
    categories: ["electronics", "computers"]
  },
  "newegg.com": {
    name: "Newegg",
    reliability: "high",
    portals: ["rakuten", "topcashback", "befrugal"],
    typicalRate: "1-2.5%",
    categories: ["electronics", "computers"]
  },
  "bhphotovideo.com": {
    name: "B&H Photo",
    reliability: "high",
    portals: ["rakuten", "topcashback"],
    typicalRate: "1-2%",
    categories: ["electronics", "photography"]
  },
  
  // Travel
  "hotels.com": {
    name: "Hotels.com",
    reliability: "high",
    portals: ["rakuten", "topcashback", "mrrebates"],
    typicalRate: "3-6%",
    categories: ["travel"]
  },
  "expedia.com": {
    name: "Expedia",
    reliability: "high",
    portals: ["rakuten", "topcashback", "befrugal"],
    typicalRate: "2-5%",
    categories: ["travel"]
  },
  "booking.com": {
    name: "Booking.com",
    reliability: "high",
    portals: ["rakuten", "topcashback"],
    typicalRate: "3-6%",
    categories: ["travel"]
  },
  "kayak.com": {
    name: "Kayak",
    reliability: "medium",
    portals: ["rakuten"],
    typicalRate: "1-2%",
    categories: ["travel"]
  },
  "airbnb.com": {
    name: "Airbnb",
    reliability: "low",
    portals: ["rakuten"],
    typicalRate: "1-2%",
    categories: ["travel"],
    notes: "Limited availability, often paused"
  },
  "southwest.com": {
    name: "Southwest Airlines",
    reliability: "high",
    portals: ["rakuten", "topcashback"],
    typicalRate: "1-2%",
    categories: ["travel", "airlines"]
  },
  "united.com": {
    name: "United Airlines",
    reliability: "medium",
    portals: ["rakuten"],
    typicalRate: "0.5-1%",
    categories: ["travel", "airlines"]
  },
  "delta.com": {
    name: "Delta Airlines",
    reliability: "medium",
    portals: ["rakuten"],
    typicalRate: "0.5-1%",
    categories: ["travel", "airlines"]
  },
  
  // Food & Grocery
  "doordash.com": {
    name: "DoorDash",
    reliability: "high",
    portals: ["rakuten", "topcashback"],
    typicalRate: "$1-5 per order",
    categories: ["food", "delivery"]
  },
  "ubereats.com": {
    name: "Uber Eats",
    reliability: "medium",
    portals: ["rakuten"],
    typicalRate: "$1-3 per order",
    categories: ["food", "delivery"]
  },
  "instacart.com": {
    name: "Instacart",
    reliability: "high",
    portals: ["rakuten", "topcashback"],
    typicalRate: "1-3%",
    categories: ["grocery", "delivery"]
  },
  
  // Home & Furniture
  "wayfair.com": {
    name: "Wayfair",
    reliability: "high",
    portals: ["rakuten", "topcashback", "honey", "retailmenot"],
    typicalRate: "2-6%",
    categories: ["home", "furniture"]
  },
  "overstock.com": {
    name: "Overstock",
    reliability: "high",
    portals: ["rakuten", "topcashback", "befrugal"],
    typicalRate: "2-5%",
    categories: ["home", "furniture"]
  },
  "ikea.com": {
    name: "IKEA",
    reliability: "medium",
    portals: ["rakuten", "topcashback"],
    typicalRate: "1-3%",
    categories: ["home", "furniture"]
  },
  "bedbathandbeyond.com": {
    name: "Bed Bath & Beyond",
    reliability: "high",
    portals: ["rakuten", "topcashback", "honey"],
    typicalRate: "2-6%",
    categories: ["home"]
  },
  "potterybarn.com": {
    name: "Pottery Barn",
    reliability: "high",
    portals: ["rakuten", "topcashback"],
    typicalRate: "2-4%",
    categories: ["home", "furniture"]
  },
  "westelm.com": {
    name: "West Elm",
    reliability: "high",
    portals: ["rakuten", "topcashback"],
    typicalRate: "2-4%",
    categories: ["home", "furniture"]
  },
  "crateandbarrel.com": {
    name: "Crate & Barrel",
    reliability: "high",
    portals: ["rakuten", "topcashback"],
    typicalRate: "2-4%",
    categories: ["home", "furniture"]
  },
  
  // Health & Wellness
  "walgreens.com": {
    name: "Walgreens",
    reliability: "high",
    portals: ["rakuten", "topcashback", "retailmenot"],
    typicalRate: "1-4%",
    categories: ["health", "pharmacy"]
  },
  "cvs.com": {
    name: "CVS",
    reliability: "high",
    portals: ["rakuten", "topcashback"],
    typicalRate: "1-3%",
    categories: ["health", "pharmacy"]
  },
  "vitaminshoppe.com": {
    name: "Vitamin Shoppe",
    reliability: "high",
    portals: ["rakuten", "topcashback"],
    typicalRate: "3-8%",
    categories: ["health", "supplements"]
  },
  
  // Office & Business
  "staples.com": {
    name: "Staples",
    reliability: "high",
    portals: ["rakuten", "topcashback", "befrugal"],
    typicalRate: "1-5%",
    categories: ["office", "electronics"]
  },
  "officedepot.com": {
    name: "Office Depot",
    reliability: "high",
    portals: ["rakuten", "topcashback"],
    typicalRate: "1-4%",
    categories: ["office"]
  },
  
  // Pet
  "chewy.com": {
    name: "Chewy",
    reliability: "high",
    portals: ["rakuten", "topcashback", "honey"],
    typicalRate: "2-5%",
    categories: ["pets"]
  },
  "petco.com": {
    name: "Petco",
    reliability: "high",
    portals: ["rakuten", "topcashback"],
    typicalRate: "2-4%",
    categories: ["pets"]
  },
  "petsmart.com": {
    name: "PetSmart",
    reliability: "high",
    portals: ["rakuten", "topcashback"],
    typicalRate: "2-4%",
    categories: ["pets"]
  },
  
  // Subscription & Services
  "spotify.com": {
    name: "Spotify",
    reliability: "medium",
    portals: ["rakuten"],
    typicalRate: "$1-3 signup bonus",
    categories: ["subscription", "entertainment"]
  },
  "hulu.com": {
    name: "Hulu",
    reliability: "medium",
    portals: ["rakuten", "topcashback"],
    typicalRate: "$1-5 signup bonus",
    categories: ["subscription", "entertainment"]
  },
  "audible.com": {
    name: "Audible",
    reliability: "high",
    portals: ["rakuten", "topcashback"],
    typicalRate: "$3-10 signup bonus",
    categories: ["subscription", "entertainment"]
  }
};

/**
 * Known affiliate network URL parameters and patterns
 * These indicate an affiliate link is present
 */
const AFFILIATE_URL_PATTERNS = {
  // Common affiliate parameters
  parameters: [
    "afsrc",
    "affid", 
    "affiliate_id",
    "clickref",
    "ranMID",
    "ranEAID",
    "ranSiteID",
    "utm_affiliate",
    "ref_id",
    "subid",
    "subId",
    "clickId",
    "click_id",
    "aff_id",
    "partner_id",
    "partnerId",
    "publisher_id",
    "pubid",
    "cjevent",
    "irclickid",
    "avad",
    "awc"
  ],
  
  // Known affiliate redirect domains
  redirectDomains: [
    "go.redirectingat.com",
    "go.skimresources.com",
    "linksynergy.com",
    "pntra.com",
    "pntrs.com",
    "pntrac.com",
    "gopjn.com",
    "pjtra.com",
    "anrdoezrs.net",
    "jdoqocy.com",
    "tkqlhce.com",
    "dpbolvw.net",
    "kqzyfj.com",
    "commission-junction.com",
    "emjcd.com",
    "shareasale.com",
    "awin1.com",
    "webgains.com",
    "impactradius-go.com",
    "ojrq.net",
    "evyy.net",
    "rstyle.me",
    "shopstyle.com",
    "narrativ.com",
    "howl.me"
  ],
  
  // Known cashback portal identifiers that may appear in URLs
  portalIdentifiers: {
    rakuten: ["rakuten", "ebates", "r.ebay"],
    topcashback: ["topcashback", "tcb"],
    honey: ["joinhoney", "honey"],
    retailmenot: ["retailmenot", "rmn"],
    befrugal: ["befrugal"],
    mrrebates: ["mrrebates"]
  }
};

/**
 * Portal display information
 */
const CASHBACK_PORTALS = {
  rakuten: {
    name: "Rakuten",
    url: "https://www.rakuten.com",
    color: "#bf0000"
  },
  topcashback: {
    name: "TopCashback",
    url: "https://www.topcashback.com",
    color: "#00a651"
  },
  honey: {
    name: "Honey",
    url: "https://www.joinhoney.com",
    color: "#ff6801"
  },
  retailmenot: {
    name: "RetailMeNot",
    url: "https://www.retailmenot.com",
    color: "#e41b23"
  },
  befrugal: {
    name: "BeFrugal",
    url: "https://www.befrugal.com",
    color: "#1a73e8"
  },
  mrrebates: {
    name: "Mr. Rebates",
    url: "https://www.mrrebates.com",
    color: "#333333"
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AFFILIATE_MERCHANT_DATA, AFFILIATE_URL_PATTERNS, CASHBACK_PORTALS };
}

