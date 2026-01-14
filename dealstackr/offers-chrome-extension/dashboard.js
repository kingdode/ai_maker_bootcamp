/**
 * Dashboard Script for DealStackr
 * 
 * Full-screen dashboard that displays all scanned offers from chrome.storage.local
 * Reads from dealCohorts and allDeals storage keys
 */

(function() {
  'use strict';

  // DOM Elements - with null checks
  const summaryBar = document.getElementById('summaryBar');
  const totalOffers = document.getElementById('totalOffers');
  const chaseCount = document.getElementById('chaseCount');
  const amexCount = document.getElementById('amexCount');
  const lastScan = document.getElementById('lastScan');
  const loadingState = document.getElementById('loadingState');
  const emptyState = document.getElementById('emptyState');
  const partialDataWarning = document.getElementById('partialDataWarning');
  const offersContainer = document.getElementById('offersContainer');
  const offersTableBody = document.getElementById('offersTableBody');
  const issuerFilter = document.getElementById('issuerFilter');
  const cardFilter = document.getElementById('cardFilter');
  const channelFilter = document.getElementById('channelFilter');
  const signupFilter = document.getElementById('signupFilter');
  const sortBy = document.getElementById('sortBy');

  // Validate critical elements
  const criticalElements = {
    loadingState, emptyState, offersContainer, offersTableBody,
    issuerFilter, cardFilter, channelFilter, sortBy
  };
  
  for (const [name, el] of Object.entries(criticalElements)) {
    if (!el) {
      console.error(`[Dealstackr Dashboard] Critical element missing: ${name}`);
    }
  }

  // State
  let allOffers = [];
  let filteredOffers = [];
  let sortField = 'deal_score'; // Default to DealStackr Score for best value ranking
  let sortDirection = 'desc';
  let stackableCount = 0;
  let signupDetections = {}; // domain -> detection result

  // Merchant URL mappings for clickable links
  // Comprehensive list with common variations and aliases
  const MERCHANT_URLS = {
    // American Express branded merchants (must come before generic matches)
    'american express pga tour': 'https://www.pgatour.com/',
    'amex pga tour': 'https://www.pgatour.com/',
    'pga tour': 'https://www.pgatour.com/',
    'american express travel': 'https://travel.americanexpress.com/',
    'amex travel': 'https://travel.americanexpress.com/',
    'american express experiences': 'https://www.americanexpress.com/en-us/entertainment/',
    'american express dining': 'https://dining.americanexpress.com/',
    'american express': null, // Explicitly no link for generic American Express
    
    // Retail - Fashion & Apparel
    'nike': 'https://www.nike.com/',
    'adidas': 'https://www.adidas.com/us',
    'gap': 'https://www.gap.com/',
    'old navy': 'https://oldnavy.gap.com/',
    'oldnavy': 'https://oldnavy.gap.com/',
    'nordstrom': 'https://www.nordstrom.com/',
    'nordstrom rack': 'https://www.nordstromrack.com/',
    "macy's": 'https://www.macys.com/',
    'macys': 'https://www.macys.com/',
    'bloomingdales': 'https://www.bloomingdales.com/',
    "bloomingdale's": 'https://www.bloomingdales.com/',
    'saks fifth avenue': 'https://www.saksfifthavenue.com/',
    'saks': 'https://www.saksfifthavenue.com/',
    'neiman marcus': 'https://www.neimanmarcus.com/',
    'jcpenney': 'https://www.jcpenney.com/',
    'jc penney': 'https://www.jcpenney.com/',
    "kohl's": 'https://www.kohls.com/',
    'kohls': 'https://www.kohls.com/',
    'h&m': 'https://www.hm.com/',
    'zara': 'https://www.zara.com/',
    'uniqlo': 'https://www.uniqlo.com/',
    'forever 21': 'https://www.forever21.com/',
    'asos': 'https://www.asos.com/',
    'shein': 'https://www.shein.com/',
    'lululemon': 'https://www.lululemon.com/',
    'athleta': 'https://athleta.gap.com/',
    'banana republic': 'https://bananarepublic.gap.com/',
    'express': 'https://www.express.com/',
    'abercrombie': 'https://www.abercrombie.com/',
    'abercrombie & fitch': 'https://www.abercrombie.com/',
    'hollister': 'https://www.hollisterco.com/',
    'american eagle': 'https://www.ae.com/',
    'aerie': 'https://www.ae.com/aerie/',
    'urban outfitters': 'https://www.urbanoutfitters.com/',
    'anthropologie': 'https://www.anthropologie.com/',
    'free people': 'https://www.freepeople.com/',
    'j.crew': 'https://www.jcrew.com/',
    'j crew': 'https://www.jcrew.com/',
    'brooks brothers': 'https://www.brooksbrothers.com/',
    'ralph lauren': 'https://www.ralphlauren.com/',
    'polo ralph lauren': 'https://www.ralphlauren.com/',
    'calvin klein': 'https://www.calvinklein.us/',
    'tommy hilfiger': 'https://usa.tommy.com/',
    'under armour': 'https://www.underarmour.com/',
    'puma': 'https://us.puma.com/',
    'new balance': 'https://www.newbalance.com/',
    'reebok': 'https://www.reebok.com/',
    'asics': 'https://www.asics.com/',
    'foot locker': 'https://www.footlocker.com/',
    'footlocker': 'https://www.footlocker.com/',
    'finish line': 'https://www.finishline.com/',
    'dick\'s sporting goods': 'https://www.dickssportinggoods.com/',
    'dicks sporting goods': 'https://www.dickssportinggoods.com/',
    "dick's": 'https://www.dickssportinggoods.com/',
    'academy sports': 'https://www.academy.com/',
    
    // Beauty & Personal Care
    'sephora': 'https://www.sephora.com/',
    'ulta': 'https://www.ulta.com/',
    'ulta beauty': 'https://www.ulta.com/',
    'bath & body works': 'https://www.bathandbodyworks.com/',
    'bath and body works': 'https://www.bathandbodyworks.com/',
    'the body shop': 'https://www.thebodyshop.com/',
    'lush': 'https://www.lushusa.com/',
    'glossier': 'https://www.glossier.com/',
    'fenty beauty': 'https://fentybeauty.com/',
    'mac cosmetics': 'https://www.maccosmetics.com/',
    'mac': 'https://www.maccosmetics.com/',
    'clinique': 'https://www.clinique.com/',
    'estee lauder': 'https://www.esteelauder.com/',
    
    // Big Box & General Retail
    'target': 'https://www.target.com/',
    'walmart': 'https://www.walmart.com/',
    'amazon': 'https://www.amazon.com/',
    'costco': 'https://www.costco.com/',
    "sam's club": 'https://www.samsclub.com/',
    'sams club': 'https://www.samsclub.com/',
    'bj\'s': 'https://www.bjs.com/',
    'bjs': 'https://www.bjs.com/',
    'dollar general': 'https://www.dollargeneral.com/',
    'dollar tree': 'https://www.dollartree.com/',
    'five below': 'https://www.fivebelow.com/',
    'big lots': 'https://www.biglots.com/',
    
    // Electronics & Tech
    'best buy': 'https://www.bestbuy.com/',
    'bestbuy': 'https://www.bestbuy.com/',
    'apple': 'https://www.apple.com/',
    'samsung': 'https://www.samsung.com/us/',
    'dell': 'https://www.dell.com/',
    'hp': 'https://www.hp.com/',
    'lenovo': 'https://www.lenovo.com/',
    'microsoft': 'https://www.microsoft.com/',
    'sony': 'https://www.sony.com/',
    'lg': 'https://www.lg.com/',
    'bose': 'https://www.bose.com/',
    'b&h photo': 'https://www.bhphotovideo.com/',
    'b&h': 'https://www.bhphotovideo.com/',
    'newegg': 'https://www.newegg.com/',
    'gamestop': 'https://www.gamestop.com/',
    
    // Home & Furniture
    'home depot': 'https://www.homedepot.com/',
    'the home depot': 'https://www.homedepot.com/',
    "lowe's": 'https://www.lowes.com/',
    'lowes': 'https://www.lowes.com/',
    'wayfair': 'https://www.wayfair.com/',
    'ikea': 'https://www.ikea.com/',
    'pottery barn': 'https://www.potterybarn.com/',
    'west elm': 'https://www.westelm.com/',
    'crate & barrel': 'https://www.crateandbarrel.com/',
    'crate and barrel': 'https://www.crateandbarrel.com/',
    'williams sonoma': 'https://www.williams-sonoma.com/',
    'williams-sonoma': 'https://www.williams-sonoma.com/',
    'bed bath & beyond': 'https://www.bedbathandbeyond.com/',
    'bed bath and beyond': 'https://www.bedbathandbeyond.com/',
    'pier 1': 'https://www.pier1.com/',
    'restoration hardware': 'https://www.restorationhardware.com/',
    'rh': 'https://www.restorationhardware.com/',
    'cb2': 'https://www.cb2.com/',
    'world market': 'https://www.worldmarket.com/',
    'cost plus world market': 'https://www.worldmarket.com/',
    'overstock': 'https://www.overstock.com/',
    'ashley furniture': 'https://www.ashleyfurniture.com/',
    'rooms to go': 'https://www.roomstogo.com/',
    'havertys': 'https://www.havertys.com/',
    'ethan allen': 'https://www.ethanallen.com/',
    'ace hardware': 'https://www.acehardware.com/',
    'menards': 'https://www.menards.com/',
    'harbor freight': 'https://www.harborfreight.com/',
    
    // Office Supplies
    'staples': 'https://www.staples.com/',
    'office depot': 'https://www.officedepot.com/',
    'officemax': 'https://www.officedepot.com/',
    
    // Grocery & Food
    'whole foods': 'https://www.wholefoodsmarket.com/',
    'whole foods market': 'https://www.wholefoodsmarket.com/',
    'trader joes': 'https://www.traderjoes.com/',
    "trader joe's": 'https://www.traderjoes.com/',
    'safeway': 'https://www.safeway.com/',
    'kroger': 'https://www.kroger.com/',
    'publix': 'https://www.publix.com/',
    'albertsons': 'https://www.albertsons.com/',
    'aldi': 'https://www.aldi.us/',
    'wegmans': 'https://www.wegmans.com/',
    'sprouts': 'https://www.sprouts.com/',
    'h-e-b': 'https://www.heb.com/',
    'heb': 'https://www.heb.com/',
    'instacart': 'https://www.instacart.com/',
    
    // Food Delivery & Restaurants
    'doordash': 'https://www.doordash.com/',
    'uber eats': 'https://www.ubereats.com/',
    'ubereats': 'https://www.ubereats.com/',
    'grubhub': 'https://www.grubhub.com/',
    'postmates': 'https://postmates.com/',
    'starbucks': 'https://www.starbucks.com/',
    'chipotle': 'https://www.chipotle.com/',
    'panera': 'https://www.panerabread.com/',
    'panera bread': 'https://www.panerabread.com/',
    'shake shack': 'https://www.shakeshack.com/',
    'sweetgreen': 'https://www.sweetgreen.com/',
    "mcdonald's": 'https://www.mcdonalds.com/',
    'mcdonalds': 'https://www.mcdonalds.com/',
    'burger king': 'https://www.bk.com/',
    "wendy's": 'https://www.wendys.com/',
    'wendys': 'https://www.wendys.com/',
    'taco bell': 'https://www.tacobell.com/',
    'chick-fil-a': 'https://www.chick-fil-a.com/',
    'chick fil a': 'https://www.chick-fil-a.com/',
    'chickfila': 'https://www.chick-fil-a.com/',
    'subway': 'https://www.subway.com/',
    "domino's": 'https://www.dominos.com/',
    'dominos': 'https://www.dominos.com/',
    'pizza hut': 'https://www.pizzahut.com/',
    "papa john's": 'https://www.papajohns.com/',
    'papa johns': 'https://www.papajohns.com/',
    'dunkin': 'https://www.dunkindonuts.com/',
    "dunkin'": 'https://www.dunkindonuts.com/',
    'dunkin donuts': 'https://www.dunkindonuts.com/',
    'krispy kreme': 'https://www.krispykreme.com/',
    'olive garden': 'https://www.olivegarden.com/',
    'outback steakhouse': 'https://www.outback.com/',
    'outback': 'https://www.outback.com/',
    'cheesecake factory': 'https://www.thecheesecakefactory.com/',
    'the cheesecake factory': 'https://www.thecheesecakefactory.com/',
    "applebee's": 'https://www.applebees.com/',
    'applebees': 'https://www.applebees.com/',
    "chili's": 'https://www.chilis.com/',
    'chilis': 'https://www.chilis.com/',
    'buffalo wild wings': 'https://www.buffalowildwings.com/',
    'red lobster': 'https://www.redlobster.com/',
    'texas roadhouse': 'https://www.texasroadhouse.com/',
    "ruth's chris": 'https://www.ruthschris.com/',
    'the capital grille': 'https://www.thecapitalgrille.com/',
    'morton\'s': 'https://www.mortons.com/',
    
    // Meal Kits
    'green chef': 'https://www.greenchef.com/',
    'greenchef': 'https://www.greenchef.com/',
    'hello fresh': 'https://www.hellofresh.com/',
    'hellofresh': 'https://www.hellofresh.com/',
    'blue apron': 'https://www.blueapron.com/',
    'factor': 'https://www.factor75.com/',
    'factor_': 'https://www.factor75.com/',
    'freshly': 'https://www.freshly.com/',
    'home chef': 'https://www.homechef.com/',
    'homechef': 'https://www.homechef.com/',
    'sunbasket': 'https://www.sunbasket.com/',
    'sun basket': 'https://www.sunbasket.com/',
    'daily harvest': 'https://www.daily-harvest.com/',
    'hungryroot': 'https://www.hungryroot.com/',
    'gobble': 'https://www.gobble.com/',
    'dinnerly': 'https://www.dinnerly.com/',
    'everyplate': 'https://www.everyplate.com/',
    'marley spoon': 'https://marleyspoon.com/',
    
    // Pharmacy & Health
    'walgreens': 'https://www.walgreens.com/',
    'cvs': 'https://www.cvs.com/',
    'cvs pharmacy': 'https://www.cvs.com/',
    'rite aid': 'https://www.riteaid.com/',
    'gnc': 'https://www.gnc.com/',
    'vitamin shoppe': 'https://www.vitaminshoppe.com/',
    '1800contacts': 'https://www.1800contacts.com/',
    '1-800 contacts': 'https://www.1800contacts.com/',
    
    // Pet Supplies
    'chewy': 'https://www.chewy.com/',
    'petco': 'https://www.petco.com/',
    'petsmart': 'https://www.petsmart.com/',
    'pet supplies plus': 'https://www.petsuppliesplus.com/',
    
    // Travel & Hotels
    'hotels.com': 'https://www.hotels.com/',
    'expedia': 'https://www.expedia.com/',
    'booking.com': 'https://www.booking.com/',
    'priceline': 'https://www.priceline.com/',
    'kayak': 'https://www.kayak.com/',
    'trivago': 'https://www.trivago.com/',
    'vrbo': 'https://www.vrbo.com/',
    'airbnb': 'https://www.airbnb.com/',
    'southwest': 'https://www.southwest.com/',
    'southwest airlines': 'https://www.southwest.com/',
    'delta': 'https://www.delta.com/',
    'delta airlines': 'https://www.delta.com/',
    'united': 'https://www.united.com/',
    'united airlines': 'https://www.united.com/',
    'american airlines': 'https://www.aa.com/',
    'jetblue': 'https://www.jetblue.com/',
    'alaska airlines': 'https://www.alaskaair.com/',
    'frontier': 'https://www.flyfrontier.com/',
    'spirit': 'https://www.spirit.com/',
    'spirit airlines': 'https://www.spirit.com/',
    'marriott': 'https://www.marriott.com/',
    'hilton': 'https://www.hilton.com/',
    'hyatt': 'https://www.hyatt.com/',
    'ihg': 'https://www.ihg.com/',
    'holiday inn': 'https://www.ihg.com/holidayinn/',
    'wyndham': 'https://www.wyndhamhotels.com/',
    'best western': 'https://www.bestwestern.com/',
    'choice hotels': 'https://www.choicehotels.com/',
    'hertz': 'https://www.hertz.com/',
    'enterprise': 'https://www.enterprise.com/',
    'avis': 'https://www.avis.com/',
    'budget': 'https://www.budget.com/',
    'national': 'https://www.nationalcar.com/',
    
    // Rideshare & Transportation
    'uber': 'https://www.uber.com/',
    'lyft': 'https://www.lyft.com/',
    
    // Job Sites & Professional Services
    'indeed': 'https://www.indeed.com/',
    'indeed.com': 'https://www.indeed.com/',
    'linkedin': 'https://www.linkedin.com/',
    'ziprecruiter': 'https://www.ziprecruiter.com/',
    'glassdoor': 'https://www.glassdoor.com/',
    'monster': 'https://www.monster.com/',
    'fiverr': 'https://www.fiverr.com/',
    'upwork': 'https://www.upwork.com/',
    
    // Business Services & Software
    'constant contact': 'https://www.constantcontact.com/',
    'mailchimp': 'https://mailchimp.com/',
    'hubspot': 'https://www.hubspot.com/',
    'salesforce': 'https://www.salesforce.com/',
    'quickbooks': 'https://quickbooks.intuit.com/',
    'intuit': 'https://www.intuit.com/',
    'turbotax': 'https://turbotax.intuit.com/',
    'squarespace': 'https://www.squarespace.com/',
    'wix': 'https://www.wix.com/',
    'godaddy': 'https://www.godaddy.com/',
    'dropbox': 'https://www.dropbox.com/',
    'slack': 'https://slack.com/',
    'zoom': 'https://zoom.us/',
    'adobe': 'https://www.adobe.com/',
    'microsoft': 'https://www.microsoft.com/',
    'google': 'https://store.google.com/',
    
    // Legal & Financial Services
    'trust & will': 'https://trustandwill.com/',
    'trustandwill': 'https://trustandwill.com/',
    'legalzoom': 'https://www.legalzoom.com/',
    'rocket lawyer': 'https://www.rocketlawyer.com/',
    
    // Fashion & Luxury
    'mackage': 'https://www.mackage.com/',
    'briggs & riley': 'https://www.briggs-riley.com/',
    'briggs-riley': 'https://www.briggs-riley.com/',
    'briggs-riley.com': 'https://www.briggs-riley.com/',
    'tumi': 'https://www.tumi.com/',
    'away': 'https://www.awaytravel.com/',
    'rimowa': 'https://www.rimowa.com/',
    'burberry': 'https://www.burberry.com/',
    'gucci': 'https://www.gucci.com/',
    'louis vuitton': 'https://www.louisvuitton.com/',
    'prada': 'https://www.prada.com/',
    'fendi': 'https://www.fendi.com/',
    
    // News & Magazines
    'the economist': 'https://www.economist.com/',
    'economist': 'https://www.economist.com/',
    'new york times': 'https://www.nytimes.com/',
    'nytimes': 'https://www.nytimes.com/',
    'wall street journal': 'https://www.wsj.com/',
    'wsj': 'https://www.wsj.com/',
    'washington post': 'https://www.washingtonpost.com/',
    'bloomberg': 'https://www.bloomberg.com/',
    'forbes': 'https://www.forbes.com/',
    'time': 'https://time.com/',
    'wired': 'https://www.wired.com/',
    'atlantic': 'https://www.theatlantic.com/',
    'the atlantic': 'https://www.theatlantic.com/',
    'new yorker': 'https://www.newyorker.com/',
    'the new yorker': 'https://www.newyorker.com/',
    
    // Entertainment & Streaming
    'spotify': 'https://www.spotify.com/',
    'netflix': 'https://www.netflix.com/',
    'hulu': 'https://www.hulu.com/',
    'disney+': 'https://www.disneyplus.com/',
    'disney plus': 'https://www.disneyplus.com/',
    'hbo max': 'https://www.max.com/',
    'max': 'https://www.max.com/',
    'paramount+': 'https://www.paramountplus.com/',
    'peacock': 'https://www.peacocktv.com/',
    'apple tv+': 'https://tv.apple.com/',
    'amazon prime': 'https://www.amazon.com/prime',
    'prime video': 'https://www.amazon.com/Prime-Video/',
    'audible': 'https://www.audible.com/',
    'kindle': 'https://www.amazon.com/kindle/',
    'sirius xm': 'https://www.siriusxm.com/',
    'siriusxm': 'https://www.siriusxm.com/',
    'amc theatres': 'https://www.amctheatres.com/',
    'amc': 'https://www.amctheatres.com/',
    'regal': 'https://www.regmovies.com/',
    'cinemark': 'https://www.cinemark.com/',
    'fandango': 'https://www.fandango.com/',
    'stubhub': 'https://www.stubhub.com/',
    'ticketmaster': 'https://www.ticketmaster.com/',
    'vivid seats': 'https://www.vividseats.com/',
    'seatgeek': 'https://seatgeek.com/',
    
    // Outdoor & Sporting Goods
    'rei': 'https://www.rei.com/',
    'cabelas': 'https://www.cabelas.com/',
    "cabela's": 'https://www.cabelas.com/',
    'bass pro shops': 'https://www.basspro.com/',
    'bass pro': 'https://www.basspro.com/',
    'patagonia': 'https://www.patagonia.com/',
    'the north face': 'https://www.thenorthface.com/',
    'north face': 'https://www.thenorthface.com/',
    'columbia': 'https://www.columbia.com/',
    'columbia sportswear': 'https://www.columbia.com/',
    'eddie bauer': 'https://www.eddiebauer.com/',
    'll bean': 'https://www.llbean.com/',
    'l.l.bean': 'https://www.llbean.com/',
    'yeti': 'https://www.yeti.com/',
    'traeger': 'https://www.traeger.com/',
    'weber': 'https://www.weber.com/',
    
    // Subscription Boxes & Services
    'birchbox': 'https://www.birchbox.com/',
    'boxycharm': 'https://www.boxycharm.com/',
    'ipsy': 'https://www.ipsy.com/',
    'fabfitfun': 'https://fabfitfun.com/',
    'stitch fix': 'https://www.stitchfix.com/',
    'stitchfix': 'https://www.stitchfix.com/',
    'trunk club': 'https://www.trunkclub.com/',
    'rent the runway': 'https://www.renttherunway.com/',
    'nuuly': 'https://www.nuuly.com/',
    
    // Baby & Kids
    'buy buy baby': 'https://www.buybuybaby.com/',
    'buybuy baby': 'https://www.buybuybaby.com/',
    'carter\'s': 'https://www.carters.com/',
    'carters': 'https://www.carters.com/',
    'oshkosh': 'https://www.carters.com/oshkosh',
    'the children\'s place': 'https://www.childrensplace.com/',
    'children\'s place': 'https://www.childrensplace.com/',
    'pottery barn kids': 'https://www.potterybarnkids.com/',
    'gymboree': 'https://www.gymboree.com/',
    
    // Jewelry & Accessories
    'kay jewelers': 'https://www.kay.com/',
    'kay': 'https://www.kay.com/',
    'jared': 'https://www.jared.com/',
    'zales': 'https://www.zales.com/',
    'tiffany': 'https://www.tiffany.com/',
    'tiffany & co': 'https://www.tiffany.com/',
    'pandora': 'https://us.pandora.net/',
    'blue nile': 'https://www.bluenile.com/',
    'james allen': 'https://www.jamesallen.com/',
    'brilliant earth': 'https://www.brilliantearth.com/',
    'warby parker': 'https://www.warbyparker.com/',
    'zenni': 'https://www.zennioptical.com/',
    'zenni optical': 'https://www.zennioptical.com/',
    
    // Books & Learning
    'barnes & noble': 'https://www.barnesandnoble.com/',
    'barnes and noble': 'https://www.barnesandnoble.com/',
    'half price books': 'https://www.hpb.com/',
    'chegg': 'https://www.chegg.com/',
    'coursera': 'https://www.coursera.org/',
    'udemy': 'https://www.udemy.com/',
    'skillshare': 'https://www.skillshare.com/',
    'masterclass': 'https://www.masterclass.com/',
    'linkedin learning': 'https://www.linkedin.com/learning/',
    
    // Fitness
    'peloton': 'https://www.onepeloton.com/',
    'planet fitness': 'https://www.planetfitness.com/',
    '24 hour fitness': 'https://www.24hourfitness.com/',
    'equinox': 'https://www.equinox.com/',
    'orangetheory': 'https://www.orangetheory.com/',
    'classpass': 'https://classpass.com/',
    'whoop': 'https://www.whoop.com/',
    'fitbit': 'https://www.fitbit.com/',
    'garmin': 'https://www.garmin.com/',
    
    // Wireless & Telecom
    'verizon': 'https://www.verizon.com/',
    'at&t': 'https://www.att.com/',
    'att': 'https://www.att.com/',
    't-mobile': 'https://www.t-mobile.com/',
    'tmobile': 'https://www.t-mobile.com/',
    'sprint': 'https://www.t-mobile.com/',
    'mint mobile': 'https://www.mintmobile.com/',
    'visible': 'https://www.visible.com/',
    'google fi': 'https://fi.google.com/',
    
    // Insurance & Finance
    'geico': 'https://www.geico.com/',
    'progressive': 'https://www.progressive.com/',
    'state farm': 'https://www.statefarm.com/',
    'allstate': 'https://www.allstate.com/',
    'liberty mutual': 'https://www.libertymutual.com/',
    'usaa': 'https://www.usaa.com/',
    
    // Flowers & Gifts
    '1800flowers': 'https://www.1800flowers.com/',
    '1-800-flowers': 'https://www.1800flowers.com/',
    'ftd': 'https://www.ftd.com/',
    'teleflora': 'https://www.teleflora.com/',
    'proflowers': 'https://www.proflowers.com/',
    'bouqs': 'https://www.bouqs.com/',
    'the bouqs': 'https://www.bouqs.com/',
    'harry & david': 'https://www.harryanddavid.com/',
    'harry and david': 'https://www.harryanddavid.com/',
    'edible arrangements': 'https://www.ediblearrangements.com/',
    'hickory farms': 'https://www.hickoryfarms.com/',
    'godiva': 'https://www.godiva.com/',
    'sees candies': 'https://www.sees.com/',
    "see's candies": 'https://www.sees.com/',
    'lindt': 'https://www.lindt.com/',
    
    // Wine & Alcohol
    'wine.com': 'https://www.wine.com/',
    'winc': 'https://www.winc.com/',
    'drizly': 'https://www.drizly.com/',
    'total wine': 'https://www.totalwine.com/',
    'total wine & more': 'https://www.totalwine.com/',
    'bevmo': 'https://www.bevmo.com/',
    
    // Auto
    'autozone': 'https://www.autozone.com/',
    'advance auto parts': 'https://www.advanceautoparts.com/',
    "o'reilly auto parts": 'https://www.oreillyauto.com/',
    'oreilly auto parts': 'https://www.oreillyauto.com/',
    'napa': 'https://www.napaonline.com/',
    'carmax': 'https://www.carmax.com/',
    'carvana': 'https://www.carvana.com/',
    'jiffy lube': 'https://www.jiffylube.com/',
    'valvoline': 'https://www.valvoline.com/',
    'discount tire': 'https://www.discounttire.com/',
    'tire rack': 'https://www.tirerack.com/',
    
    // Craft & Hobby
    'michaels': 'https://www.michaels.com/',
    'joann': 'https://www.joann.com/',
    'hobby lobby': 'https://www.hobbylobby.com/',
    'etsy': 'https://www.etsy.com/',
    'cricut': 'https://www.cricut.com/',
    
    // Luxury
    'louis vuitton': 'https://us.louisvuitton.com/',
    'gucci': 'https://www.gucci.com/',
    'prada': 'https://www.prada.com/',
    'chanel': 'https://www.chanel.com/',
    'hermes': 'https://www.hermes.com/',
    'burberry': 'https://us.burberry.com/',
    'coach': 'https://www.coach.com/',
    'kate spade': 'https://www.katespade.com/',
    'michael kors': 'https://www.michaelkors.com/',
    'tory burch': 'https://www.toryburch.com/',
    'stuart weitzman': 'https://www.stuartweitzman.com/',
    'cole haan': 'https://www.colehaan.com/',
    
    // Mattress & Sleep
    'casper': 'https://casper.com/',
    'purple': 'https://purple.com/',
    'tempur-pedic': 'https://www.tempurpedic.com/',
    'tempurpedic': 'https://www.tempurpedic.com/',
    'sleep number': 'https://www.sleepnumber.com/',
    'mattress firm': 'https://www.mattressfirm.com/',
    'nectar': 'https://www.nectarsleep.com/',
    'helix': 'https://helixsleep.com/',
    'saatva': 'https://www.saatva.com/',
    'leesa': 'https://www.leesa.com/',
    'tuft & needle': 'https://www.tuftandneedle.com/',
    'tuft and needle': 'https://www.tuftandneedle.com/',
    
    // Home Services
    'thumbtack': 'https://www.thumbtack.com/',
    'angi': 'https://www.angi.com/',
    "angie's list": 'https://www.angi.com/',
    'homeadvisor': 'https://www.homeadvisor.com/',
    'taskrabbit': 'https://www.taskrabbit.com/',
    'handy': 'https://www.handy.com/',
    
    // Additional Merchants from Amex/Chase Offers
    '1800flowers': 'https://www.1800flowers.com/',
    '1800flowers.com': 'https://www.1800flowers.com/',
    'aarp': 'https://www.aarp.org/',
    'ag1': 'https://drinkag1.com/',
    'aldo': 'https://www.aldoshoes.com/',
    'aldoshoes.com': 'https://www.aldoshoes.com/',
    'armra': 'https://tryarmra.com/',
    'air india': 'https://www.airindia.com/',
    'airalo': 'https://www.airalo.com/',
    'alamo': 'https://www.alamo.com/',
    'alamo rent-a-car': 'https://www.alamo.com/',
    'american home shield': 'https://www.ahs.com/',
    'ancestry': 'https://www.ancestry.com/',
    'ariat': 'https://www.ariat.com/',
    'at home': 'https://www.athome.com/',
    'avocado': 'https://www.avocadogreenmattress.com/',
    'avocado green mattress': 'https://www.avocadogreenmattress.com/',
    'b-21': 'https://www.b-21.com/',
    'baskin robbins': 'https://www.baskinrobbins.com/',
    'bedbathandbeyond': 'https://www.bedbathandbeyond.com/',
    'bedbathandbeyond.com': 'https://www.bedbathandbeyond.com/',
    'bissell': 'https://www.bissell.com/',
    'bloomsybox': 'https://bloomsybox.com/',
    'blue apron': 'https://www.blueapron.com/',
    'bouqs': 'https://bouqs.com/',
    'the bouqs': 'https://bouqs.com/',
    'the bouqs co.': 'https://bouqs.com/',
    'brilliant earth': 'https://www.brilliantearth.com/',
    'cnn': 'https://www.cnn.com/',
    'calm': 'https://www.calm.com/',
    'chevron': 'https://www.chevron.com/',
    'cle de peau': 'https://www.cledepeaubeaute.com/',
    'clé de peau beauté': 'https://www.cledepeaubeaute.com/',
    'contactsdirect': 'https://www.contactsdirect.com/',
    'contactsdirect.com': 'https://www.contactsdirect.com/',
    'cookunity': 'https://www.cookunity.com/',
    'cotopaxi': 'https://www.cotopaxi.com/',
    'cozy earth': 'https://cozyearth.com/',
    'daily harvest': 'https://www.daily-harvest.com/',
    'elizabeth arden': 'https://www.elizabetharden.com/',
    'event tickets center': 'https://www.eventticketscenter.com/',
    'eventticketscenter.com': 'https://www.eventticketscenter.com/',
    'expedia': 'https://www.expedia.com/',
    'eyebuydirect': 'https://www.eyebuydirect.com/',
    'eyebuydirect.com': 'https://www.eyebuydirect.com/',
    'factor': 'https://www.factor75.com/',
    'fanduel': 'https://www.fanduel.com/',
    'fanatics': 'https://www.fanatics.com/',
    'fanatics.com': 'https://www.fanatics.com/',
    'farmgirl flowers': 'https://farmgirlflowers.com/',
    'forme': 'https://formewear.com/',
    'fragrance.com': 'https://www.fragrance.com/',
    'fragrancenet': 'https://www.fragrancenet.com/',
    'fragrancenet.com': 'https://www.fragrancenet.com/',
    'gametime': 'https://gametime.co/',
    'gardyn': 'https://www.mygardyn.com/',
    'glassesusa': 'https://www.glassesusa.com/',
    'glassesusa.com': 'https://www.glassesusa.com/',
    'gobble': 'https://www.gobble.com/',
    'green chef': 'https://www.greenchef.com/',
    'grown brilliance': 'https://grownbrilliance.com/',
    'grüns': 'https://getgruns.com/',
    'gruns': 'https://getgruns.com/',
    'harper wilde': 'https://harperwilde.com/',
    'hatch': 'https://www.hatch.co/',
    'hatch sleep': 'https://www.hatch.co/',
    'home chef': 'https://www.homechef.com/',
    'hrblock': 'https://www.hrblock.com/',
    'hrblock.com': 'https://www.hrblock.com/',
    'h&r block': 'https://www.hrblock.com/',
    'hungryroot': 'https://www.hungryroot.com/',
    'hyatt vacation club': 'https://www.hyattvacationclub.com/',
    'jamba juice': 'https://www.jamba.com/',
    'jamba': 'https://www.jamba.com/',
    'johnson fitness': 'https://www.johnsonfitness.com/',
    'kicks crew': 'https://www.kickscrew.com/',
    'kipling': 'https://www.kipling-usa.com/',
    'kohler': 'https://www.kohler.com/',
    'lake pajamas': 'https://lakepajamas.com/',
    'labcorp': 'https://www.labcorp.com/',
    'lancôme': 'https://www.lancome-usa.com/',
    'lancome': 'https://www.lancome-usa.com/',
    "lands' end": 'https://www.landsend.com/',
    'lands end': 'https://www.landsend.com/',
    'lensdirect': 'https://www.lensdirect.com/',
    "levi's": 'https://www.levi.com/',
    'levis': 'https://www.levi.com/',
    'liquid i.v.': 'https://www.liquid-iv.com/',
    'liquid iv': 'https://www.liquid-iv.com/',
    'lululemon': 'https://www.lululemon.com/',
    'lume': 'https://lumedeodorant.com/',
    'lume deodorant': 'https://lumedeodorant.com/',
    'maui jim': 'https://www.mauijim.com/',
    'meta': 'https://store.meta.com/',
    'meta store': 'https://store.meta.com/',
    'misfits market': 'https://www.misfitsmarket.com/',
    'mizzen+main': 'https://www.mizzenandmain.com/',
    'mizzen main': 'https://www.mizzenandmain.com/',
    'nbastore': 'https://store.nba.com/',
    'nbastore.com': 'https://store.nba.com/',
    'nba store': 'https://store.nba.com/',
    'nhl shop': 'https://shop.nhl.com/',
    'nobull': 'https://www.nobullproject.com/',
    'nordictrack': 'https://www.nordictrack.com/',
    'nuts.com': 'https://nuts.com/',
    'oxo': 'https://www.oxo.com/',
    'ode à la rose': 'https://www.odealarose.com/',
    'once upon a farm': 'https://www.onceuponafarmorganics.com/',
    'onnit': 'https://www.onnit.com/',
    'onnit labs': 'https://www.onnit.com/',
    'paramount+': 'https://www.paramountplus.com/',
    'paramount plus': 'https://www.paramountplus.com/',
    'peak design': 'https://www.peakdesign.com/',
    "peet's": 'https://www.peets.com/',
    'peets': 'https://www.peets.com/',
    'peets.com': 'https://www.peets.com/',
    'pimsleur': 'https://www.pimsleur.com/',
    'popstroke': 'https://popstroke.com/',
    'prenuvo': 'https://www.prenuvo.com/',
    'prettylitter': 'https://www.prettylitter.com/',
    'pureformulas': 'https://www.pureformulas.com/',
    'pureology': 'https://www.pureology.com/',
    'qdoba': 'https://www.qdoba.com/',
    'quicken': 'https://www.quicken.com/',
    'redken': 'https://www.redken.com/',
    'rent the runway': 'https://www.renttherunway.com/',
    'ruggable': 'https://ruggable.com/',
    'rugs.com': 'https://www.rugs.com/',
    'rugsusa': 'https://www.rugsusa.com/',
    'rugsusa.com': 'https://www.rugsusa.com/',
    'shiseido': 'https://www.shiseido.com/',
    'simplehuman': 'https://www.simplehuman.com/',
    'skinceuticals': 'https://www.skinceuticals.com/',
    'sling tv': 'https://www.sling.com/',
    'smashburger': 'https://smashburger.com/',
    'solgaard': 'https://solgaard.co/',
    'sony': 'https://electronics.sony.com/',
    'sony electronics': 'https://electronics.sony.com/',
    'southern tide': 'https://www.southerntide.com/',
    'stitch fix': 'https://www.stitchfix.com/',
    'straight talk': 'https://www.straighttalk.com/',
    't-mobile': 'https://www.t-mobile.com/',
    'taxact': 'https://www.taxact.com/',
    'tecovas': 'https://www.tecovas.com/',
    'teleflora': 'https://www.teleflora.com/',
    'tender greens': 'https://www.tendergreens.com/',
    'the art of shaving': 'https://www.theartofshaving.com/',
    'the atlantic': 'https://www.theatlantic.com/',
    'the container store': 'https://www.containerstore.com/',
    "the farmer's dog": 'https://www.thefarmersdog.com/',
    'the motley fool': 'https://www.fool.com/',
    'the vitamin shoppe': 'https://www.vitaminshoppe.com/',
    'vitamin shoppe': 'https://www.vitaminshoppe.com/',
    'theory': 'https://www.theory.com/',
    'therabody': 'https://www.therabody.com/',
    'thuma': 'https://www.thuma.co/',
    'ticketsmarter': 'https://www.ticketsmarter.com/',
    'ticketsmarter.com': 'https://www.ticketsmarter.com/',
    'tocaya': 'https://tocaya.com/',
    'tommy hilfiger': 'https://usa.tommy.com/',
    'tommy john': 'https://tommyjohn.com/',
    'tonal': 'https://www.tonal.com/',
    'tory burch': 'https://www.toryburch.com/',
    'total wireless': 'https://www.totalwireless.com/',
    'tracfone': 'https://www.tracfone.com/',
    'true religion': 'https://www.truereligion.com/',
    'turo': 'https://turo.com/',
    'viator': 'https://www.viator.com/',
    'visible': 'https://www.visible.com/',
    'visible by verizon': 'https://www.visible.com/',
    'vistaprint': 'https://www.vistaprint.com/',
    'wsj wine': 'https://www.wsjwine.com/',
    'whisker': 'https://www.litter-robot.com/',
    'litter-robot': 'https://www.litter-robot.com/',
    'litter-robot.com': 'https://www.litter-robot.com/',
    'wild alaskan company': 'https://wildalaskancompany.com/',
    'wilson': 'https://www.wilson.com/',
    'wine insiders': 'https://www.wineinsiders.com/',
    'youtube tv': 'https://tv.youtube.com/',
    'zenni': 'https://www.zennioptical.com/',
    'zenni optical': 'https://www.zennioptical.com/',
    'bonobos': 'https://bonobos.com/',
    'bonobos.com': 'https://bonobos.com/',
    'canon': 'https://www.usa.canon.com/',
    'canon.com': 'https://www.usa.canon.com/',
    'discovery+': 'https://www.discoveryplus.com/',
    'discovery plus': 'https://www.discoveryplus.com/',
    'fubo': 'https://www.fubo.tv/',
    'fubotv': 'https://www.fubo.tv/',
    'iherb': 'https://www.iherb.com/',
    'iherb.com': 'https://www.iherb.com/',
    'intimissimi': 'https://www.intimissimi.com/',
    'intimissimi.com': 'https://www.intimissimi.com/',
    'kiwico': 'https://www.kiwico.com/',
    'kiwico.com': 'https://www.kiwico.com/',
    'kuhl': 'https://www.kuhl.com/',
    'kuhl.com': 'https://www.kuhl.com/',
    "l'agence": 'https://www.lagence.com/',
    'lagence': 'https://www.lagence.com/',
    'lagence.com': 'https://www.lagence.com/',
    'lg': 'https://www.lg.com/',
    'lg.com': 'https://www.lg.com/',
    'nars': 'https://www.narscosmetics.com/',
    'narscosmetics.com': 'https://www.narscosmetics.com/',
    'newegg': 'https://www.newegg.com/',
    'newegg.com': 'https://www.newegg.com/',
    'olaplex': 'https://www.olaplex.com/',
    'olaplex.com': 'https://www.olaplex.com/',
    'pura': 'https://www.pura.com/',
    'pura.com': 'https://www.pura.com/',
    'tnuck': 'https://www.tnuck.com/',
    'tnuck.com': 'https://www.tnuck.com/',
    'vera bradley': 'https://www.verabradley.com/',
    'verabradley.com': 'https://www.verabradley.com/',
    'faherty': 'https://fahertybrand.com/',
    'fahertybrand.com': 'https://fahertybrand.com/',
    'consumer reports': 'https://www.consumerreports.org/',
    'hp': 'https://www.hp.com/',
    'express': 'https://www.express.com/',
    'avis': 'https://www.avis.com/',
    'avis car rental': 'https://www.avis.com/'
  };

  /**
   * Safely parse a date string, returning null if invalid
   * @param {string|Date} dateInput - Date string or Date object
   * @returns {Date|null}
   */
  /**
   * Safely parse a date string, returning null if invalid
   * Also validates that the date is reasonable (not too far in past/future)
   * @param {string|Date} dateInput - Date string or Date object
   * @param {boolean} isExpiration - If true, applies stricter validation for expiration dates
   * @returns {Date|null}
   */
  function safeParseDate(dateInput, isExpiration = false) {
    if (!dateInput) return null;
    
    // Skip obviously invalid values
    if (typeof dateInput === 'string') {
      const lower = dateInput.toLowerCase().trim();
      // Skip if it looks like UI text, not a date
      if (lower.length < 6 || 
          lower === 'null' || 
          lower === 'undefined' ||
          lower === 'n/a' ||
          lower.startsWith('expir') ||  // "expiring", "expires soon" etc
          lower.startsWith('limit') ||  // "limited time"
          /^[a-z\s]+$/.test(lower)) {   // Only letters, no numbers = not a date
        return null;
      }
    }
    
    try {
      let parsed;
      if (dateInput instanceof Date) {
        parsed = dateInput;
      } else {
        parsed = new Date(dateInput);
      }
      
      if (isNaN(parsed.getTime())) {
        return null;
      }
      
      // For expiration dates, apply stricter validation
      if (isExpiration) {
        const now = new Date();
        const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
        const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        
        // Expiration dates should be reasonable:
        // - Not more than 1 year in the past (already expired long ago)
        // - Not more than 1 year in the future (too far out to be real)
        if (parsed < oneYearAgo || parsed > oneYearFromNow) {
          console.log('[Dealstackr Dashboard] Ignoring unreasonable expiration date:', dateInput);
          return null;
        }
      }
      
      return parsed;
    } catch (e) {
      console.warn('[Dealstackr Dashboard] Invalid date:', dateInput);
      return null;
    }
  }

  /**
   * Extract numeric value from offer string for sorting
   * Handles formats like: "10%", "$20 back", "$60 back (20%) on $300+ spend"
   * @param {string} offerValue - Offer value string
   * @returns {Object} { percent: number|null, dollar: number|null, type: string }
   */
  function parseOfferValue(offerValue) {
    if (!offerValue || typeof offerValue !== 'string') {
      return { percent: null, dollar: null, type: 'unknown', sortValue: 0 };
    }

    const result = { percent: null, dollar: null, type: 'unknown', sortValue: 0 };
    const text = offerValue.toLowerCase();

    // Try to extract percentage
    const percentMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);
    if (percentMatch) {
      result.percent = parseFloat(percentMatch[1]);
      result.type = 'percent';
    }

    // Try to extract dollar amount (prioritize cashback amount, not spend amount)
    // Pattern: "earn $X", "$X back", "$X off"
    const earnMatch = text.match(/earn\s*\$(\d+(?:,\d{3})*(?:\.\d+)?)/i);
    const backMatch = text.match(/\$(\d+(?:,\d{3})*(?:\.\d+)?)\s*back/i);
    const dollarMatch = text.match(/\$(\d+(?:,\d{3})*(?:\.\d+)?)/);

    if (earnMatch) {
      result.dollar = parseFloat(earnMatch[1].replace(/,/g, ''));
      result.type = 'flat';
    } else if (backMatch) {
      result.dollar = parseFloat(backMatch[1].replace(/,/g, ''));
      result.type = 'flat';
    } else if (dollarMatch && !text.includes('spend')) {
      // Only use generic dollar match if it's not a spend amount
      result.dollar = parseFloat(dollarMatch[1].replace(/,/g, ''));
      result.type = 'flat';
    }

    // Calculate sort value - percentages get a multiplier for comparison
    if (result.percent !== null) {
      result.sortValue = result.percent * 10; // Scale percentages
    } else if (result.dollar !== null) {
      result.sortValue = result.dollar;
    }

    return result;
  }

  /**
   * Normalize a string for comparison (lowercase, trim, collapse whitespace)
   * @param {string} str - Input string
   * @returns {string}
   */
  function normalizeString(str) {
    if (!str || typeof str !== 'string') return '';
    return str.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  /**
   * Check if a merchant name is valid (not UI text, card names, or marketing phrases)
   * @param {string} name - The merchant name to validate
   * @returns {boolean}
   */
  function isValidMerchantName(name) {
    if (!name || typeof name !== 'string') return false;
    const lower = name.toLowerCase().trim();
    
    // Too short or too long
    if (lower.length < 2 || lower.length > 60) return false;
    
    // Explicit exclusion list
    const invalidMerchants = [
      'expiring soon', 'expiring', 'expires soon', 'expires', 'ending soon',
      'limited time', 'new offer', 'exclusive', 'added', 'featured',
      'keep the shopping going', 'shop iconic', 'available on',
      'sapphire reserve offers', 'sapphire preferred offers', 'freedom offers',
      'platinum offers', 'gold offers', 'blue cash offers',
      'all offers', 'my offers', 'your offers', 'more offers',
      'online only', 'in-store only', 'terms apply'
    ];
    if (invalidMerchants.includes(lower)) return false;
    
    // Starts with "expiring" or "expires"
    if (/^expir(ing|es?)/i.test(lower)) return false;
    
    // Ends with "offers" (e.g., "Sapphire Reserve offers")
    if (/\s+offers?$/i.test(lower)) return false;
    
    // Marketing/UI phrases
    if (/^(keep|shop|browse|discover|explore)\s+(the|your|our|iconic)/i.test(lower)) return false;
    
    // Card names (not merchants)
    if (/^(sapphire|freedom|platinum|gold|blue\s*cash|everyday|hilton|marriott|delta)\s*(reserve|preferred|flex|unlimited|plus)?(\s*\(|$)/i.test(lower)) return false;
    
    // Just numbers or percentages
    if (/^[\d\$%\s.,]+$/.test(lower)) return false;
    
    // Dollar amounts
    if (/^\$[\d,]+(\.\d+)?$/.test(name.trim())) return false;
    
    // Time remaining patterns
    if (/\d+\s*(d|days?|day)\s*(left|remaining)?/i.test(lower)) return false;
    
    return true;
  }

  /**
   * Get merchant URL from name with improved matching logic
   * @param {string} merchantName - Merchant name
   * @returns {string|null}
   */
  function getMerchantUrl(merchantName) {
    if (!merchantName) return null;
    
    // Normalize: lowercase, trim, collapse whitespace
    const normalized = merchantName.toLowerCase().trim().replace(/\s+/g, ' ');
    
    // Exclusion rules: prevent false positive matches
    // Format: { pattern: regex to match merchant name, exclude: array of keys to NOT match }
    const exclusionRules = [
      { pattern: /american express/i, exclude: ['express'] },
      { pattern: /pga tour/i, exclude: ['express', 'tour'] },
      { pattern: /pizza hut/i, exclude: ['hut'] },
      { pattern: /taco bell/i, exclude: ['bell'] },
      { pattern: /best buy/i, exclude: ['best'] },
      { pattern: /home depot/i, exclude: ['home', 'depot'] },
      { pattern: /dollar tree/i, exclude: ['tree', 'dollar'] },
      { pattern: /dollar general/i, exclude: ['general', 'dollar'] },
      { pattern: /bath\s*&?\s*body/i, exclude: ['bath', 'body'] },
      { pattern: /bed\s*bath/i, exclude: ['bath', 'bed'] },
    ];
    
    // Get list of excluded keys for this merchant
    const excludedKeys = new Set();
    for (const rule of exclusionRules) {
      if (rule.pattern.test(normalized)) {
        rule.exclude.forEach(key => excludedKeys.add(key));
      }
    }
    
    // 1. Direct exact match (check for key existence, not just truthy value)
    if (normalized in MERCHANT_URLS) {
      return MERCHANT_URLS[normalized]; // May return null for explicitly no-link merchants
    }
    
    // 2. Try without common suffixes/prefixes
    const cleanedVariants = [
      normalized.replace(/\s*(inc\.?|llc|corp\.?|co\.?|stores?|shop|usa|us|online)$/i, '').trim(),
      normalized.replace(/^(the|shop|buy)\s+/i, '').trim(),
      normalized.replace(/['']s?\s*$/i, '').trim(), // Remove possessives
      normalized.replace(/['']/g, ''), // Remove apostrophes entirely
    ];
    
    for (const variant of cleanedVariants) {
      if (variant && variant in MERCHANT_URLS) {
        return MERCHANT_URLS[variant];
      }
    }
    
    // 3. Word-boundary aware partial matching (prefer exact word matches)
    const normalizedWords = normalized.split(/\s+/);
    let bestMatch = null;
    let bestScore = 0;
    
    for (const [key, url] of Object.entries(MERCHANT_URLS)) {
      // Skip excluded keys for this merchant
      if (excludedKeys.has(key)) {
        continue;
      }
      
      // Skip null/undefined URLs (explicitly no-link merchants)
      if (!url) {
        continue;
      }
      
      const keyWords = key.split(/\s+/);
      
      // Exact key match within merchant name (word boundary)
      if (normalized.includes(key)) {
        // Prefer longer matches
        const score = key.length * 10;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = url;
        }
      }
      
      // Check if all words from the key appear in the merchant name
      const allKeyWordsMatch = keyWords.every(kw => 
        normalizedWords.some(nw => nw === kw || nw.includes(kw))
      );
      
      if (allKeyWordsMatch && keyWords.length >= 1) {
        const score = keyWords.length * 5 + key.length;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = url;
        }
      }
      
      // Check if the normalized name matches any single-word key exactly
      if (keyWords.length === 1 && normalizedWords.includes(key)) {
        const score = key.length * 8;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = url;
        }
      }
    }
    
    if (bestMatch) {
      return bestMatch;
    }
    
    // 4. Try matching first significant word only (for multi-word merchant names)
    if (normalizedWords.length > 1) {
      const firstWord = normalizedWords[0];
      // Skip very short, generic, or excluded first words
      if (firstWord.length >= 3 && 
          !['the', 'buy', 'get', 'shop', 'american'].includes(firstWord) &&
          !excludedKeys.has(firstWord)) {
        if (firstWord in MERCHANT_URLS && MERCHANT_URLS[firstWord]) {
          return MERCHANT_URLS[firstWord];
        }
      }
    }
    
    // 5. No match found - don't guess, return null
    // (Guessing often produces incorrect URLs)
    return null;
  }

  /**
   * Load signup detection results from storage
   */
  async function loadSignupDetections() {
    try {
      if (!chrome?.storage?.local) return;
      
      const result = await new Promise((resolve) => {
        chrome.storage.local.get(['signupDetectionResults'], (items) => {
          if (chrome.runtime.lastError) {
            console.warn('[Dealstackr Dashboard] Error loading signup detections:', chrome.runtime.lastError);
            resolve({ signupDetectionResults: [] });
          } else {
            resolve(items);
          }
        });
      });

      if (result.signupDetectionResults && Array.isArray(result.signupDetectionResults)) {
        // Build lookup by domain
        signupDetections = {};
        result.signupDetectionResults.forEach(detection => {
          if (detection.domain) {
            signupDetections[detection.domain.toLowerCase()] = detection;
          }
        });
        console.log('[Dealstackr Dashboard] Loaded', Object.keys(signupDetections).length, 'signup detections');
      }
    } catch (error) {
      console.warn('[Dealstackr Dashboard] Error loading signup detections:', error);
    }
  }

  /**
   * Get signup detection for a merchant
   * @param {string} merchantName - Merchant name
   * @returns {Object|null}
   */
  function getSignupDetection(merchantName) {
    if (!merchantName) return null;
    
    const normalized = merchantName.toLowerCase().trim();
    
    // Try direct domain match
    for (const [domain, detection] of Object.entries(signupDetections)) {
      const domainBase = domain.replace(/\.(com|net|org|co\.uk)$/, '').replace(/^www\./, '');
      if (normalized.includes(domainBase) || domainBase.includes(normalized.replace(/[^a-z0-9]/g, ''))) {
        return detection;
      }
    }
    
    return null;
  }

  /**
   * Get signup offer display info
   * @param {Object|null} detection - Detection result
   * @returns {Object} { class, label, score, confirmed, hasBoth }
   */
  function getSignupDisplayInfo(detection) {
    if (!detection) {
      return {
        class: 'signup-unknown',
        label: 'Check on site',
        score: 0,
        confirmed: null,
        hasBoth: false
      };
    }

    const confirmedDate = detection.userConfirmedAt ? formatRelativeDate(detection.userConfirmedAt) : '';
    
    // Check if BOTH Rakuten and promo are confirmed
    if (detection.rakutenConfirmed && detection.promoConfirmed) {
      return {
        class: 'signup-both',
        label: '🔴 Rakuten + 🎟️ Promo',
        score: detection.score || 95,
        confirmed: 'both',
        confirmedAt: confirmedDate,
        hasBoth: true
      };
    }

    // Check for user confirmations
    if (detection.rakutenConfirmed) {
      return {
        class: 'signup-rakuten',
        label: '🔴 Rakuten',
        score: detection.score || 90,
        confirmed: 'rakuten',
        confirmedAt: confirmedDate,
        hasBoth: false
      };
    }
    
    if (detection.promoConfirmed) {
      return {
        class: 'signup-high',
        label: '🎟️ Promo code',
        score: detection.score || 85,
        confirmed: 'promo',
        confirmedAt: confirmedDate,
        hasBoth: false
      };
    }

    const score = detection.score || 0;
    
    if (score >= 80) {
      return {
        class: 'signup-high',
        label: detection.value || 'Signup offer found',
        score: score,
        confirmed: null,
        hasBoth: false
      };
    } else if (score >= 50) {
      return {
        class: 'signup-medium',
        label: 'Likely available',
        score: score,
        confirmed: null,
        hasBoth: false
      };
    } else if (score > 0) {
      return {
        class: 'signup-low',
        label: 'Unlikely',
        score: score,
        confirmed: null,
        hasBoth: false
      };
    }
    
    return {
      class: 'signup-unknown',
      label: 'Check on site',
      score: 0,
      confirmed: null,
      hasBoth: false
    };
  }

  /**
   * Format relative date for confirmations
   * @param {string} dateString - ISO date string
   * @returns {string}
   */
  function formatRelativeDate(dateString) {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffHours < 1) {
        return 'just now';
      } else if (diffHours < 24) {
        return `${diffHours}h ago`;
      } else if (diffDays === 1) {
        return 'yesterday';
      } else if (diffDays < 7) {
        return `${diffDays}d ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch {
      return '';
    }
  }

  /**
   * Check if a merchant name is valid (not UI text or action words)
   * @param {string} merchant - Merchant name to validate
   * @returns {boolean}
   */
  function isValidMerchantName(merchant) {
    if (!merchant || typeof merchant !== 'string') return false;
    
    const lower = merchant.toLowerCase().trim();
    
    // Minimum length check
    if (lower.length < 2) return false;
    
    // Exact invalid names
    const invalidNames = [
      'earn', 'spend', 'get', 'back', 'off', 'save', 'add', 'view', 'more',
      'all offers', 'my offers', 'your offers', 'available offers', 'offers',
      'offer', 'deals', 'deal', 'rewards', 'points', 'bonus',
      'exclusive', 'new', 'limited', 'featured', 'recommended', 'popular',
      'online', 'in-store', 'store', 'website', 'shop', 'shopping',
      'card offers', 'chase offers', 'amex offers', 'credit card offers',
      'added to card', 'add to card', 'remove', 'activate', 'apply',
      'terms', 'conditions', 'details', 'see details', 'view details',
      'learn more', 'find out more', 'shop now', 'buy now',
      'expires', 'expiring', 'expires soon', 'expiring soon', 'limited time',
      'statement credit', 'cash back', 'cashback',
      'unknown', 'n/a', 'na', 'none', 'null', 'undefined',
      'entertainment', 'keep the shopping going', 'function',
      'sapphire reserve offers', 'sapphire preferred offers',
      'freedom offers', 'freedom unlimited offers', 'ink offers'
    ];
    
    if (invalidNames.includes(lower)) return false;
    
    // Patterns that indicate invalid merchant names
    const invalidPatterns = [
      /^(earn|spend|get|save|add|view|see|show|click|activate)\s/i,
      /^(all|my|your|available|featured|recommended)\s+(offers?|deals?)/i,
      /^\d+%/,  // Starts with percentage
      /^\$\d+/, // Starts with dollar amount
      /\d+\s*(days?|d)\s*(left|remaining)/i, // Time remaining
      /^(card|credit|chase|amex)\s+(offers?)/i,
      /^(online|in-store)\s+(only|offer)/i,
      /^sapphire\s+(reserve|preferred)\s*\(/i, // Card names with account numbers
      /\(\.\.\.\d+\)/i, // Contains account number pattern like "(...8234)"
      /^keep\s+(the\s+)?shopping/i,
      /^(bonus|reward)\s+(after|when|if)/i
    ];
    
    for (const pattern of invalidPatterns) {
      if (pattern.test(lower)) return false;
    }
    
    return true;
  }

  /**
   * Load all offers from chrome.storage.local
   * Reads from dealCohorts (preferred) or allDeals (legacy)
   */
  async function loadOffers() {
    console.log('[Dealstackr Dashboard] Loading offers...');
    
    try {
      showLoading();

      // Read from chrome.storage.local
      const result = await new Promise((resolve, reject) => {
        if (!chrome?.storage?.local) {
          reject(new Error('Chrome storage API not available'));
          return;
        }
        
        chrome.storage.local.get(['dealCohorts', 'allDeals'], (items) => {
          if (chrome.runtime.lastError) {
            console.error('[Dealstackr Dashboard] Storage error:', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            console.log('[Dealstackr Dashboard] Storage read successful:', {
              hasCohorts: !!items.dealCohorts,
              cohortsCount: items.dealCohorts ? Object.keys(items.dealCohorts).length : 0,
              hasDeals: !!items.allDeals,
              dealsCount: items.allDeals ? items.allDeals.length : 0
            });
            resolve(items);
          }
        });
      });

      let offers = [];

      // Prefer dealCohorts (newer structure)
      if (result.dealCohorts && typeof result.dealCohorts === 'object') {
        Object.entries(result.dealCohorts).forEach(([cohortDate, cohortOffers]) => {
          if (Array.isArray(cohortOffers)) {
            // Add cohort date to each offer for context
            cohortOffers.forEach(offer => {
              offers.push({
                ...offer,
                cohort_date: cohortDate
              });
            });
          }
        });
        console.log('[Dealstackr Dashboard] Loaded', offers.length, 'offers from', Object.keys(result.dealCohorts).length, 'cohorts');
      } 
      // Fallback to allDeals (legacy format)
      else if (result.allDeals && Array.isArray(result.allDeals)) {
        offers = result.allDeals;
        console.log('[Dealstackr Dashboard] Loaded', offers.length, 'offers from allDeals (legacy)');
      }

      if (offers.length === 0) {
        console.warn('[Dealstackr Dashboard] No offers found in storage');
        showEmptyState();
        return;
      }

      // Log sample offer for debugging
      if (offers.length > 0) {
        console.log('[Dealstackr Dashboard] Sample raw offer:', JSON.stringify(offers[0], null, 2));
      }

      // Transform extension format to dashboard format
      // First filter out null values (from transformOffer rejecting invalid merchants)
      let transformedOffers = offers.map(transformOffer).filter(offer => offer !== null).filter(offer => {
        // Filter out invalid offers - must have merchant and offer value
        const hasRequiredFields = offer.merchant && offer.merchant.length > 0 && 
                                  offer.offer_value && offer.offer_value.length > 0;
        
        if (!hasRequiredFields) {
          console.log('[Dealstackr Dashboard] Filtered out offer (missing fields):', offer);
          return false;
        }
        
        return true;
      });

      console.log('[Dealstackr Dashboard] Transformed', transformedOffers.length, 'valid offers');

      if (transformedOffers.length === 0) {
        console.warn('[Dealstackr Dashboard] No valid offers after transformation');
        showEmptyState();
        return;
      }

      // Log sample transformed offer for debugging
      console.log('[Dealstackr Dashboard] Sample transformed offer:', JSON.stringify(transformedOffers[0], null, 2));

      // Deduplicate offers
      const beforeDedup = transformedOffers.length;
      allOffers = deduplicateOffers(transformedOffers);
      const afterDedup = allOffers.length;
      
      if (beforeDedup !== afterDedup) {
        console.log(`[Dealstackr Dashboard] Deduplicated ${beforeDedup} offers to ${afterDedup} unique offers (removed ${beforeDedup - afterDedup} duplicates)`);
      } else {
        console.log('[Dealstackr Dashboard] Loaded', allOffers.length, 'offers (no duplicates found)');
      }

      // Fetch stackable data from background worker
      await enrichWithStackableData();

      // Check for partial data (offers missing key fields)
      const hasPartialData = allOffers.some(offer => 
        !offer.channel || offer.channel === 'unknown' || !offer.card_name
      );
      if (hasPartialData && partialDataWarning) {
        partialDataWarning.style.display = 'flex';
      }

      updateSummary();
      updateCardFilter();
      applyFiltersAndSort();
      showOffers();

    } catch (error) {
      console.error('[Dealstackr Dashboard] Error loading offers:', error);
      console.error('[Dealstackr Dashboard] Error stack:', error.stack);
      showEmptyState();
    }
  }

  /**
   * Enrich offers with stackable data from background worker
   */
  async function enrichWithStackableData() {
    try {
      const stackableResponse = await new Promise((resolve) => {
        if (!chrome?.runtime?.sendMessage) {
          resolve(null);
          return;
        }
        
        chrome.runtime.sendMessage({ action: 'getStackableOffers' }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn('[Dealstackr Dashboard] Error fetching stackable data:', chrome.runtime.lastError);
            resolve(null);
          } else {
            resolve(response);
          }
        });
      });

      if (stackableResponse && stackableResponse.success && stackableResponse.offers) {
        // Build a lookup map for stackable info
        const stackableMap = new Map();
        stackableResponse.offers.forEach(offer => {
          // Normalize keys for matching
          const merchantKey = normalizeString(offer.merchant_name || offer.merchant || '');
          const offerKey = normalizeString(offer.offer_value || '');
          const key = `${merchantKey}|${offerKey}`;
          stackableMap.set(key, offer);
        });

        // Merge stackable info into our offers
        allOffers = allOffers.map(offer => {
          const merchantKey = normalizeString(offer.merchant);
          const offerKey = normalizeString(offer.offer_value);
          const key = `${merchantKey}|${offerKey}`;
          const stackableInfo = stackableMap.get(key);
          
          return {
            ...offer,
            stackable: stackableInfo?.stackable || false,
            affiliateConfidence: stackableInfo?.affiliateConfidence || 'none',
            affiliatePortals: stackableInfo?.affiliatePortals || [],
            typicalRate: stackableInfo?.typicalRate || null
          };
        });

        stackableCount = allOffers.filter(o => o.stackable).length;
        console.log('[Dealstackr Dashboard] Found', stackableCount, 'stackable offers');
      }
    } catch (error) {
      console.warn('[Dealstackr Dashboard] Error enriching with stackable data:', error);
    }
  }

  /**
   * Transform extension offer format to dashboard format
   * Extension uses: merchant_name, card_type, scanned_at
   * Dashboard expects: merchant, card_name, last_scanned_at
   * @param {Object} extOffer - Offer from extension storage
   * @returns {Object} Transformed offer for dashboard
   */
  function transformOffer(extOffer) {
    if (!extOffer || typeof extOffer !== 'object') {
      return null; // Return null for invalid offers
    }

    // Handle different field naming conventions
    const merchant = extOffer.merchant_name || extOffer.merchant || extOffer.merchantName || '';
    const offerValue = extOffer.offer_value || extOffer.offerValue || extOffer.offer || '';
    
    // Validate merchant name - skip UI text, card names, marketing phrases
    if (!isValidMerchantName(merchant)) {
      console.log('[Dealstackr Dashboard] Skipping invalid merchant name:', merchant);
      return null;
    }
    const issuer = normalizeIssuer(extOffer.issuer);
    const cardName = extOffer.card_type || extOffer.card_name || extOffer.cardName || extOffer.cardType || getDefaultCardName(issuer);
    const channel = normalizeChannel(extOffer.channel);
    
    // Handle various date field names
    const scannedAt = extOffer.scanned_at || extOffer.scannedAt || 
                      extOffer.last_scanned_at || extOffer.lastScannedAt || 
                      extOffer.timestamp || new Date().toISOString();
    
    // Handle expiration date - check multiple field names
    let expiresAt = extOffer.expires_at || extOffer.expiresAt || 
                    extOffer.expiration_date || extOffer.expirationDate || null;
    
    // Validate the expiration date before storing
    if (expiresAt) {
      const validatedDate = safeParseDate(expiresAt, true);
      if (!validatedDate) {
        console.log('[Dealstackr Dashboard] Rejecting invalid expiration for', merchant, ':', expiresAt);
        expiresAt = null;
      } else {
        // Store as ISO string for consistency
        expiresAt = validatedDate.toISOString();
      }
    }

    // Parse offer value to determine type
    const parsed = parseOfferValue(offerValue);
    
    // Calculate DealStackr Score using the scoring utility
    // This prioritizes absolute cash back, then percentage, with light spend adjustment
    let dealScore = null;
    if (typeof calculateDealScore === 'function') {
      try {
        dealScore = calculateDealScore(offerValue.trim());
      } catch (e) {
        console.warn('[Dealstackr Dashboard] Error calculating deal score:', e);
      }
    }

    return {
      merchant: merchant.trim(),
      offer_value: offerValue.trim(),
      offer_type: parsed.type,
      offer_sort_value: parsed.sortValue,
      deal_score: dealScore, // DealStackr Score for ranking
      issuer: issuer,
      card_name: cardName,
      channel: channel,
      expires_at: expiresAt,
      last_scanned_at: scannedAt,
      cohort_date: extOffer.cohort_date || null,
      source_url: extOffer.source_url || extOffer.sourceUrl || ''
    };
  }

  /**
   * Normalize issuer value
   * @param {string} issuer - Raw issuer value
   * @returns {string}
   */
  function normalizeIssuer(issuer) {
    if (!issuer) return 'unknown';
    const lower = issuer.toLowerCase().trim();
    if (lower.includes('chase')) return 'chase';
    if (lower.includes('amex') || lower.includes('american express')) return 'amex';
    return lower;
  }

  /**
   * Get default card name based on issuer
   * @param {string} issuer - Issuer value
   * @returns {string}
   */
  function getDefaultCardName(issuer) {
    if (issuer === 'chase') return 'Chase';
    if (issuer === 'amex') return 'Amex';
    return 'Unknown';
  }

  /**
   * Normalize channel value
   * @param {string} channel - Raw channel value
   * @returns {string}
   */
  function normalizeChannel(channel) {
    if (!channel) return 'unknown';
    const lower = channel.toLowerCase().trim();
    if (lower === 'online' || lower.includes('online')) return 'online';
    if (lower === 'in_store' || lower === 'instore' || lower.includes('store')) return 'in_store';
    return 'unknown';
  }

  /**
   * Deduplicate offers based on normalized merchant name, offer value, card name, and issuer
   * Keeps the most recently scanned version of each duplicate
   * @param {Array} offers - Array of offer objects
   * @returns {Array} Deduplicated array of offers
   */
  function deduplicateOffers(offers) {
    if (!Array.isArray(offers)) return [];
    
    const offerMap = new Map();
    
    for (const offer of offers) {
      if (!offer) continue;
      
      // Create a unique key based on normalized values
      const normalizedMerchant = normalizeString(offer.merchant);
      const normalizedOfferValue = normalizeString(offer.offer_value);
      const normalizedCard = normalizeString(offer.card_name);
      const normalizedIssuer = normalizeString(offer.issuer);
      
      const key = `${normalizedMerchant}|${normalizedOfferValue}|${normalizedCard}|${normalizedIssuer}`;
      
      // If we haven't seen this offer, or this one is newer, keep it
      if (!offerMap.has(key)) {
        offerMap.set(key, offer);
      } else {
        const existingOffer = offerMap.get(key);
        const existingDate = safeParseDate(existingOffer.last_scanned_at);
        const newDate = safeParseDate(offer.last_scanned_at);
        
        // Keep the more recently scanned offer
        if (newDate && existingDate && newDate > existingDate) {
          offerMap.set(key, offer);
        } else if (newDate && !existingDate) {
          // Keep new one if existing has no valid date
          offerMap.set(key, offer);
        }
      }
    }
    
    return Array.from(offerMap.values());
  }

  /**
   * Update summary bar with counts and last scan date
   */
  function updateSummary() {
    const total = allOffers.length;
    const chase = allOffers.filter(o => o.issuer === 'chase').length;
    const amex = allOffers.filter(o => o.issuer === 'amex').length;

    // Find most recent scan
    let mostRecent = null;
    let mostRecentDate = null;
    
    for (const offer of allOffers) {
      const offerDate = safeParseDate(offer.last_scanned_at);
      if (offerDate && (!mostRecentDate || offerDate > mostRecentDate)) {
        mostRecentDate = offerDate;
        mostRecent = offer;
      }
    }

    if (totalOffers) totalOffers.textContent = `Total: ${total}`;
    if (chaseCount) chaseCount.textContent = `Chase: ${chase}`;
    if (amexCount) amexCount.textContent = `Amex: ${amex}`;

    if (lastScan) {
      if (mostRecentDate) {
        lastScan.textContent = `Last scan: ${formatDate(mostRecentDate)}`;
      } else {
        lastScan.textContent = 'Last scan: —';
      }
    }
  }

  /**
   * Update card filter dropdown with unique card names
   */
  function updateCardFilter() {
    if (!cardFilter) return;
    
    const uniqueCards = [...new Set(allOffers.map(o => o.card_name).filter(Boolean))].sort();
    
    // Clear existing options except "All"
    cardFilter.innerHTML = '<option value="all">All</option>';
    
    uniqueCards.forEach(card => {
      const option = document.createElement('option');
      option.value = card;
      option.textContent = card;
      cardFilter.appendChild(option);
    });
  }

  /**
   * Filter offers based on selected filters
   * @returns {Array} Filtered offers
   */
  function filterOffers() {
    filteredOffers = [...allOffers];

    // Data quality filter: Amex offers must have expiration dates
    // (Amex always provides expiration dates, so missing ones indicate parsing issues)
    filteredOffers = filteredOffers.filter(offer => {
      if (offer.issuer === 'amex' || offer.issuer === 'Amex') {
        // Must have a valid expiration date
        if (!offer.expires_at) {
          console.log('[Dashboard] Filtering out Amex offer without expiration:', offer.merchant);
          return false;
        }
      }
      return true;
    });

    // Filter by issuer
    if (issuerFilter) {
      const issuerValue = issuerFilter.value;
      if (issuerValue !== 'all') {
        filteredOffers = filteredOffers.filter(offer => offer.issuer === issuerValue);
      }
    }

    // Filter by card
    if (cardFilter) {
      const cardValue = cardFilter.value;
      if (cardValue !== 'all') {
        filteredOffers = filteredOffers.filter(offer => offer.card_name === cardValue);
      }
    }

    // Filter by channel
    if (channelFilter) {
      const channelValue = channelFilter.value;
      if (channelValue !== 'all') {
        filteredOffers = filteredOffers.filter(offer => offer.channel === channelValue);
      }
    }

    // Filter by signup offer likelihood
    if (signupFilter) {
      const signupValue = signupFilter.value;
      if (signupValue !== 'all') {
        filteredOffers = filteredOffers.filter(offer => {
          const detection = getSignupDetection(offer.merchant);
          const score = detection?.score || 0;
          
          if (signupValue === 'high') {
            return score >= 80;
          } else if (signupValue === 'medium') {
            return score >= 50 && score < 80;
          } else if (signupValue === 'unknown') {
            return score < 50;
          }
          return true;
        });
      }
    }

    return filteredOffers;
  }

  /**
   * Sort offers based on selected criteria
   * @param {Array} offers - Offers to sort
   * @returns {Array} Sorted offers
   */
  function sortOffers(offers) {
    if (!Array.isArray(offers)) return [];
    
    const sorted = [...offers];

    switch (sortField) {
      case 'deal_score':
        // Sort by DealStackr Score - highest value offers first
        sorted.sort((a, b) => {
          const aScore = a.deal_score?.finalScore ?? 0;
          const bScore = b.deal_score?.finalScore ?? 0;
          return bScore - aScore; // Descending (best deals first)
        });
        break;

      case 'merchant':
        sorted.sort((a, b) => {
          const aMerchant = a.merchant || '';
          const bMerchant = b.merchant || '';
          return aMerchant.localeCompare(bMerchant);
        });
        break;

      case 'offer_value':
        sorted.sort((a, b) => {
          // Use pre-computed sort values
          const aValue = a.offer_sort_value || 0;
          const bValue = b.offer_sort_value || 0;
          
          // If both are same type, compare directly
          if (a.offer_type === b.offer_type) {
            return bValue - aValue; // Descending
          }
          
          // Percentages generally rank higher than flat amounts
          if (a.offer_type === 'percent' && b.offer_type !== 'percent') return -1;
          if (b.offer_type === 'percent' && a.offer_type !== 'percent') return 1;
          
          return bValue - aValue; // Descending
        });
        break;

      case 'issuer':
        sorted.sort((a, b) => {
          const aIssuer = a.issuer || '';
          const bIssuer = b.issuer || '';
          return aIssuer.localeCompare(bIssuer);
        });
        break;

      case 'card_name':
        sorted.sort((a, b) => {
          const aCard = a.card_name || '';
          const bCard = b.card_name || '';
          return aCard.localeCompare(bCard);
        });
        break;

      case 'last_scanned_at':
        sorted.sort((a, b) => {
          const aDate = safeParseDate(a.last_scanned_at);
          const bDate = safeParseDate(b.last_scanned_at);
          
          if (!aDate && !bDate) return 0;
          if (!aDate) return 1; // Push nulls to end
          if (!bDate) return -1;
          
          return bDate - aDate; // Newest first
        });
        break;

      case 'signup_score':
        sorted.sort((a, b) => {
          // Higher signup scores first
          const aDetection = getSignupDetection(a.merchant);
          const bDetection = getSignupDetection(b.merchant);
          const aScore = aDetection?.score || 0;
          const bScore = bDetection?.score || 0;
          return bScore - aScore;
        });
        break;

      case 'expires_at':
        sorted.sort((a, b) => {
          const aDate = safeParseDate(a.expires_at, true);
          const bDate = safeParseDate(b.expires_at, true);
          
          // Push nulls to end
          if (!aDate && !bDate) return 0;
          if (!aDate) return 1;
          if (!bDate) return -1;
          
          // Soonest expiration first
          return aDate - bDate;
        });
        break;

      case 'channel':
        sorted.sort((a, b) => {
          const aChannel = a.channel || '';
          const bChannel = b.channel || '';
          return aChannel.localeCompare(bChannel);
        });
        break;

      default:
        break;
    }

    // Apply sort direction for non-special fields
    if (sortDirection === 'asc' && 
        sortField !== 'deal_score' &&
        sortField !== 'offer_value' && 
        sortField !== 'last_scanned_at' && 
        sortField !== 'signup_score' &&
        sortField !== 'expires_at') {
      sorted.reverse();
    }

    return sorted;
  }

  /**
   * Apply filters and sorting, then render
   */
  function applyFiltersAndSort() {
    const filtered = filterOffers();
    const sorted = sortOffers(filtered);
    renderOffers(sorted);
  }

  /**
   * Render offers table
   * @param {Array} offers - Offers to display
   */
  function renderOffers(offers) {
    if (!offersTableBody) {
      console.error('[Dealstackr Dashboard] offersTableBody not found');
      return;
    }
    
    offersTableBody.innerHTML = '';

    if (!offers || offers.length === 0) {
      if (offersContainer) offersContainer.style.display = 'none';
      if (emptyState) {
        emptyState.style.display = 'block';
        const emptyMsg = emptyState.querySelector('p');
        if (emptyMsg) {
          emptyMsg.textContent = allOffers.length > 0 
            ? 'No offers match the current filters.' 
            : 'No offers found. Scan your Chase or Amex offers to populate Dealstackr.';
        }
      }
      return;
    }

    // Track merchants that appear multiple times (for highlighting)
    const merchantCounts = {};
    offers.forEach(offer => {
      const merchant = offer.merchant || 'Unknown';
      merchantCounts[merchant] = (merchantCounts[merchant] || 0) + 1;
    });

    offers.forEach(offer => {
      const row = document.createElement('tr');
      const merchant = offer.merchant || 'Unknown';
      const isMultipleCards = merchantCounts[merchant] > 1;
      const merchantUrl = getMerchantUrl(merchant);

      // Score cell - DealStackr Score with badge
      const scoreCell = document.createElement('td');
      scoreCell.className = 'score-cell';
      if (offer.deal_score) {
        const { finalScore, bandInfo } = offer.deal_score;
        scoreCell.innerHTML = createScoreBadgeHTML(offer.deal_score, true);
        scoreCell.title = bandInfo.description;
      } else {
        scoreCell.textContent = '—';
      }
      row.appendChild(scoreCell);

      // Merchant cell - now clickable
      const merchantCell = document.createElement('td');
      merchantCell.className = 'merchant-cell';
      
      if (merchantUrl) {
        try {
          const merchantLink = document.createElement('a');
          // Add dealstackr=report parameter to trigger auto-popup of the reporting widget
          const urlWithParam = new URL(merchantUrl);
          urlWithParam.searchParams.set('dealstackr', 'report');
          merchantLink.href = urlWithParam.toString();
          merchantLink.target = '_blank';
          merchantLink.rel = 'noopener noreferrer';
          merchantLink.className = 'merchant-link';
          merchantLink.textContent = merchant;
          merchantLink.title = `Visit ${merchant} - DealStackr will prompt you to log any deals you see`;
          merchantCell.appendChild(merchantLink);
        } catch (urlError) {
          // If URL parsing fails, still create a clickable link with the raw URL
          console.warn(`[Dashboard] Invalid URL for ${merchant}:`, merchantUrl, urlError);
          const merchantLink = document.createElement('a');
          merchantLink.href = merchantUrl;
          merchantLink.target = '_blank';
          merchantLink.rel = 'noopener noreferrer';
          merchantLink.className = 'merchant-link';
          merchantLink.textContent = merchant;
          merchantLink.title = `Visit ${merchant}`;
          merchantCell.appendChild(merchantLink);
        }
      } else {
        merchantCell.textContent = merchant;
      }
      
      if (isMultipleCards) {
        merchantCell.classList.add('highlight-merchant');
        merchantCell.title = `Available on ${merchantCounts[merchant]} cards`;
      }
      row.appendChild(merchantCell);

      // Card Offer cell
      const offerCell = document.createElement('td');
      offerCell.className = 'offer-cell';
      offerCell.textContent = offer.offer_value || '—';
      row.appendChild(offerCell);

      // Issuer cell
      const issuerCell = document.createElement('td');
      const issuer = offer.issuer || 'unknown';
      issuerCell.className = `issuer-cell issuer-${issuer}`;
      issuerCell.textContent = formatIssuerName(issuer);
      row.appendChild(issuerCell);

      // Card cell
      const cardCell = document.createElement('td');
      cardCell.className = 'card-cell';
      cardCell.textContent = offer.card_name || '—';
      row.appendChild(cardCell);

      // Expires cell - use strict validation for expiration dates
      const expiresCell = document.createElement('td');
      expiresCell.className = 'expires-cell';
      const expiresDate = safeParseDate(offer.expires_at, true); // true = strict expiration validation
      if (expiresDate) {
        const now = new Date();
        const daysUntil = Math.ceil((expiresDate - now) / (1000 * 60 * 60 * 24));
        
        if (daysUntil < -30) {
          // Expired more than 30 days ago - just show dash, don't clutter with old expired offers
          expiresCell.textContent = '—';
        } else if (daysUntil < 0) {
          expiresCell.innerHTML = `<span class="expires-badge expired">Expired</span>`;
        } else if (daysUntil <= 3) {
          expiresCell.innerHTML = `<span class="expires-badge expires-soon">${daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : daysUntil + 'd left'}</span>`;
        } else if (daysUntil <= 7) {
          expiresCell.innerHTML = `<span class="expires-badge expires-week">${daysUntil}d left</span>`;
        } else {
          expiresCell.textContent = formatShortDate(expiresDate);
        }
        expiresCell.title = `Expires ${expiresDate.toLocaleDateString()}`;
      } else {
        expiresCell.textContent = '—';
      }
      row.appendChild(expiresCell);

      // Channel cell
      const channelCell = document.createElement('td');
      channelCell.className = 'channel-cell';
      channelCell.textContent = formatChannel(offer.channel);
      row.appendChild(channelCell);

      // Last scanned cell
      const scannedCell = document.createElement('td');
      scannedCell.className = 'scanned-cell';
      const scannedDate = safeParseDate(offer.last_scanned_at);
      scannedCell.textContent = scannedDate ? formatDate(scannedDate) : '—';
      row.appendChild(scannedCell);

      offersTableBody.appendChild(row);
    });

    if (offersContainer) offersContainer.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';
  }

  /**
   * Format issuer name for display
   * @param {string} issuer - Issuer value
   * @returns {string}
   */
  function formatIssuerName(issuer) {
    if (issuer === 'chase') return 'Chase';
    if (issuer === 'amex') return 'Amex';
    return issuer.charAt(0).toUpperCase() + issuer.slice(1);
  }

  /**
   * Format channel display name
   * @param {string} channel - Channel value
   * @returns {string}
   */
  function formatChannel(channel) {
    if (channel === 'in_store') return 'In-Store';
    if (channel === 'online') return 'Online';
    return 'Unknown';
  }

  /**
   * Format date for display
   * @param {Date} date - Date object
   * @returns {string}
   */
  function formatDate(date) {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return '—';
    }
    
    try {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return '—';
    }
  }

  /**
   * Format date as short format (Jan 15)
   * @param {Date} date - Date to format
   * @returns {string}
   */
  function formatShortDate(date) {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return '—';
    }
    
    try {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return '—';
    }
  }

  /**
   * Show loading state
   */
  function showLoading() {
    if (loadingState) loadingState.style.display = 'flex';
    if (emptyState) emptyState.style.display = 'none';
    if (offersContainer) offersContainer.style.display = 'none';
    if (partialDataWarning) partialDataWarning.style.display = 'none';
  }

  /**
   * Show empty state
   */
  function showEmptyState() {
    if (loadingState) loadingState.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
    if (offersContainer) offersContainer.style.display = 'none';
    if (partialDataWarning) partialDataWarning.style.display = 'none';
  }

  /**
   * Show offers table
   */
  function showOffers() {
    if (loadingState) loadingState.style.display = 'none';
    if (emptyState) emptyState.style.display = 'none';
    if (offersContainer) offersContainer.style.display = 'block';
  }

  /**
   * Handle table header click for sorting
   * @param {Event} event - Click event
   */
  function handleHeaderClick(event) {
    const header = event.target.closest('.sortable');
    if (!header) return;

    const field = header.dataset.sort;
    if (!field) return;

    // Toggle sort direction if same field
    if (sortField === field) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortField = field;
      // Default direction based on field type
      sortDirection = (field === 'offer_value' || field === 'last_scanned_at' || field === 'signup_score') 
        ? 'desc' : 'asc';
    }

    // Update sort select if present
    if (sortBy) {
      sortBy.value = sortField === 'last_scanned_at' ? 'last_scanned_at' : 
                     sortField === 'offer_value' ? 'value-desc' : sortField;
    }

    // Update sort indicators
    document.querySelectorAll('.sort-indicator').forEach(indicator => {
      indicator.textContent = '';
    });
    const indicator = header.querySelector('.sort-indicator');
    if (indicator) {
      indicator.textContent = sortDirection === 'asc' ? ' ↑' : ' ↓';
    }

    applyFiltersAndSort();
  }

  /**
   * Show debug modal with storage information
   */
  async function showDebugModal() {
    const modal = document.getElementById('debugModal');
    const summary = document.getElementById('debugSummary');
    const sampleData = document.getElementById('debugSampleData');
    const cohorts = document.getElementById('debugCohorts');
    
    if (!modal) return;
    
    modal.style.display = 'flex';
    
    try {
      const result = await new Promise((resolve) => {
        chrome.storage.local.get(null, (items) => {
          resolve(items);
        });
      });
      
      // Summary
      const cohortKeys = result.dealCohorts ? Object.keys(result.dealCohorts) : [];
      const totalInCohorts = cohortKeys.reduce((sum, key) => {
        return sum + (Array.isArray(result.dealCohorts[key]) ? result.dealCohorts[key].length : 0);
      }, 0);
      
      summary.textContent = JSON.stringify({
        hasDealCohorts: !!result.dealCohorts,
        cohortCount: cohortKeys.length,
        totalOffersInCohorts: totalInCohorts,
        hasAllDeals: !!result.allDeals,
        allDealsCount: Array.isArray(result.allDeals) ? result.allDeals.length : 0,
        currentCohort: result.currentCohort || 'none',
        storageKeys: Object.keys(result)
      }, null, 2);
      
      // Sample data - get first 3 offers
      let sampleOffers = [];
      if (result.dealCohorts) {
        for (const key of cohortKeys) {
          if (Array.isArray(result.dealCohorts[key])) {
            sampleOffers.push(...result.dealCohorts[key].slice(0, 3 - sampleOffers.length));
            if (sampleOffers.length >= 3) break;
          }
        }
      } else if (Array.isArray(result.allDeals)) {
        sampleOffers = result.allDeals.slice(0, 3);
      }
      
      sampleData.textContent = sampleOffers.length > 0 
        ? JSON.stringify(sampleOffers, null, 2)
        : 'No offers found in storage';
      
      // Cohorts breakdown
      if (cohortKeys.length > 0) {
        const cohortInfo = {};
        cohortKeys.forEach(key => {
          cohortInfo[key] = Array.isArray(result.dealCohorts[key]) 
            ? result.dealCohorts[key].length + ' offers'
            : 'invalid';
        });
        cohorts.textContent = JSON.stringify(cohortInfo, null, 2);
      } else {
        cohorts.textContent = 'No cohorts found';
      }
      
    } catch (error) {
      summary.textContent = 'Error loading storage: ' + error.message;
      sampleData.textContent = '';
      cohorts.textContent = '';
    }
  }

  /**
   * Clear all storage data
   */
  async function clearAllStorage() {
    if (!confirm('Are you sure you want to clear all DealStackr data? This cannot be undone.')) {
      return;
    }
    
    try {
      await chrome.storage.local.clear();
      console.log('[Dealstackr Dashboard] Storage cleared');
      alert('All data has been cleared. Reload the page to see changes.');
      window.location.reload();
    } catch (error) {
      console.error('[Dealstackr Dashboard] Error clearing storage:', error);
      alert('Error clearing storage: ' + error.message);
    }
  }

  /**
   * Initialize debug functionality
   */
  function initDebug() {
    const debugBtnEmpty = document.getElementById('debugStorageBtn');
    const debugBtnSummary = document.getElementById('debugBtn');
    const modal = document.getElementById('debugModal');
    const closeBtn = document.getElementById('closeDebugModal');
    const refreshBtn = document.getElementById('refreshDebugBtn');
    const clearBtn = document.getElementById('clearStorageBtn');
    
    // Debug button in empty state
    if (debugBtnEmpty) {
      debugBtnEmpty.addEventListener('click', showDebugModal);
    }
    
    // Debug button in summary bar
    if (debugBtnSummary) {
      debugBtnSummary.addEventListener('click', showDebugModal);
    }
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (modal) modal.style.display = 'none';
      });
    }
    
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.style.display = 'none';
        }
      });
    }
    
    if (refreshBtn) {
      refreshBtn.addEventListener('click', showDebugModal);
    }
    
    if (clearBtn) {
      clearBtn.addEventListener('click', clearAllStorage);
    }
  }

  /**
   * Initialize dashboard
   */
  function init() {
    console.log('[Dealstackr Dashboard] Initializing...');
    
    try {
      // Event listeners for filters
      if (issuerFilter) {
        issuerFilter.addEventListener('change', applyFiltersAndSort);
      }
      if (cardFilter) {
        cardFilter.addEventListener('change', applyFiltersAndSort);
      }
      if (channelFilter) {
        channelFilter.addEventListener('change', applyFiltersAndSort);
      }
      if (signupFilter) {
        signupFilter.addEventListener('change', applyFiltersAndSort);
      }
      
      // Event listener for sort dropdown
      if (sortBy) {
        sortBy.addEventListener('change', (e) => {
          const value = e.target.value;
          if (value === 'deal_score') {
            sortField = 'deal_score';
            sortDirection = 'desc'; // Best deals first
          } else if (value === 'value-desc') {
            sortField = 'offer_value';
            sortDirection = 'desc';
          } else if (value === 'last_scanned_at') {
            sortField = 'last_scanned_at';
            sortDirection = 'desc';
          } else {
            sortField = value;
            sortDirection = 'asc';
          }
          applyFiltersAndSort();
        });
      }
      
      // Score info icon - shows explanation tooltip
      const scoreInfoIcon = document.getElementById('scoreInfoIcon');
      if (scoreInfoIcon) {
        scoreInfoIcon.addEventListener('click', () => {
          const explanation = typeof getScoreExplanation === 'function' 
            ? getScoreExplanation() 
            : 'DealStackr Score prioritizes real cash back, then percentage savings, with light adjustment for required spend.';
          alert('📊 How DealStackr Score Works\n\n' + explanation);
        });
        scoreInfoIcon.style.cursor = 'pointer';
      }
      
      // Inject score badge styles if offerScoring.js is loaded
      if (typeof getScoreBadgeStyles === 'function') {
        const styleEl = document.createElement('style');
        styleEl.textContent = getScoreBadgeStyles();
        document.head.appendChild(styleEl);
      }

      // Table header click handlers for sorting
      document.querySelectorAll('.sortable').forEach(header => {
        header.addEventListener('click', handleHeaderClick);
        header.style.cursor = 'pointer';
      });

      // Listen for storage changes (real-time updates)
      if (chrome?.storage?.onChanged) {
        chrome.storage.onChanged.addListener((changes, areaName) => {
          if (areaName === 'local') {
            if (changes.dealCohorts || changes.allDeals) {
              console.log('[Dealstackr Dashboard] Storage changed, reloading offers...');
              loadOffers();
            }
            if (changes.signupDetectionResults) {
              console.log('[Dealstackr Dashboard] Signup detections changed, reloading...');
              loadSignupDetections().then(() => renderOffers(filteredOffers));
            }
          }
        });
      }
      
      // Initialize debug functionality
      initDebug();

      // Load signup detections first, then offers
      loadSignupDetections().then(() => {
        loadOffers();
      });
      
      console.log('[Dealstackr Dashboard] Initialization complete');
    } catch (error) {
      console.error('[Dealstackr Dashboard] Initialization error:', error);
      console.error('[Dealstackr Dashboard] Error stack:', error.stack);
      showEmptyState();
    }
  }

  // Initialize sync button separately to ensure it always works
  function initSyncButton() {
    const syncWebBtn = document.getElementById('syncWebBtn');
    const syncStatus = document.getElementById('syncStatus');
    
    console.log('[DealStackr] initSyncButton called');
    console.log('[DealStackr] Sync button element:', syncWebBtn);
    
    if (!syncWebBtn) {
      console.error('[DealStackr] Sync button NOT found!');
      return;
    }
    
    if (syncWebBtn.dataset.initialized) {
      console.log('[DealStackr] Sync button already initialized');
      return;
    }
    
    syncWebBtn.dataset.initialized = 'true';
    console.log('[DealStackr] Attaching sync button click handler');
    
    syncWebBtn.addEventListener('click', async function(e) {
      e.preventDefault();
      console.log('[DealStackr] Sync button clicked!');
      console.log('[DealStackr] Current allOffers:', allOffers.length);
      
      this.disabled = true;
      this.classList.add('syncing');
      this.textContent = '🔄 Syncing...';
      
      if (syncStatus) {
        syncStatus.textContent = '';
        syncStatus.className = 'sync-status';
      }
      
      try {
        // Prepare offers for sync
        const offersToSync = allOffers.map(offer => ({
          id: offer.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          merchant: offer.merchant,
          offer_value: offer.offer_value,
          issuer: offer.issuer,
          card_name: offer.card_name,
          channel: offer.channel,
          expires_at: offer.expires_at,
          scanned_at: offer.last_scanned_at || offer.scanned_at || new Date().toISOString(),
          stackable: offer.stackable || false,
          crowdsourced: offer.crowdsourced || null
        }));
        
        console.log('[DealStackr] Syncing', offersToSync.length, 'offers...');
        
        if (offersToSync.length === 0) {
          throw new Error('No offers to sync');
        }
        
        const response = await fetch('http://localhost:3000/api/offers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ offers: offersToSync })
        });
        
        console.log('[DealStackr] Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('[DealStackr] Response:', result);
        
        if (result.success) {
          // Also sync crowdsourced data
          let crowdsourcedCount = 0;
          try {
            if (chrome?.storage?.local) {
              const crowdsourcedResult = await new Promise(resolve => {
                chrome.storage.local.get(['crowdsourcedDeals'], items => {
                  resolve(items);
                });
              });
              
              if (crowdsourcedResult.crowdsourcedDeals && Object.keys(crowdsourcedResult.crowdsourcedDeals).length > 0) {
                const crowdsourcedResponse = await fetch('http://localhost:3000/api/crowdsourced', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ crowdsourcedDeals: crowdsourcedResult.crowdsourcedDeals })
                });
                
                if (crowdsourcedResponse.ok) {
                  const crowdsourcedData = await crowdsourcedResponse.json();
                  crowdsourcedCount = crowdsourcedData.totalDomains || 0;
                  console.log('[DealStackr] Crowdsourced data synced:', crowdsourcedCount, 'domains');
                }
              }
            }
          } catch (csError) {
            console.warn('[DealStackr] Failed to sync crowdsourced data:', csError);
          }
          
          if (syncStatus) {
            const statusText = crowdsourcedCount > 0 
              ? `✓ ${result.count} offers + ${crowdsourcedCount} user reports synced`
              : `✓ ${result.count} offers synced`;
            syncStatus.textContent = statusText;
            syncStatus.className = 'sync-status success';
          }
          alert(`Successfully synced ${result.count} offers${crowdsourcedCount > 0 ? ` and ${crowdsourcedCount} user reports` : ''} to the website!`);
        } else {
          throw new Error(result.message || 'Sync failed');
        }
      } catch (error) {
        console.error('[DealStackr] Sync error:', error);
        if (syncStatus) {
          syncStatus.textContent = `✗ ${error.message || 'Failed'}`;
          syncStatus.className = 'sync-status error';
        }
        alert('Sync failed: ' + (error.message || 'Unknown error'));
      } finally {
        this.disabled = false;
        this.classList.remove('syncing');
        this.textContent = '🌐 Sync to Website';
        
        setTimeout(() => {
          if (syncStatus) {
            syncStatus.textContent = '';
            syncStatus.className = 'sync-status';
          }
        }, 5000);
      }
    });
    
    console.log('[DealStackr] Sync button initialized successfully');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      init();
      initSyncButton();
    });
  } else {
    init();
    initSyncButton();
  }

})();
