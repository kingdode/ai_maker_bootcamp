/**
 * Merchant URL Mappings for DealStackr Website
 * 
 * Comprehensive list of merchants with their official website URLs.
 * Used to make merchant names clickable in the offers grid.
 */

export const MERCHANT_URLS: Record<string, string | null> = {
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
  "dick's sporting goods": 'https://www.dickssportinggoods.com/',
  'dicks sporting goods': 'https://www.dickssportinggoods.com/',
  "dick's": 'https://www.dickssportinggoods.com/',
  'academy sports': 'https://www.academy.com/',
  'cotopaxi': 'https://www.cotopaxi.com/',
  'southern tide': 'https://www.southerntide.com/',
  'nobull': 'https://www.nobullproject.com/',
  
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
  'fragrancenet': 'https://www.fragrancenet.com/',
  'fragrancenet.com': 'https://www.fragrancenet.com/',
  'farmgirl flowers': 'https://farmgirlflowers.com/',
  
  // Big Box & General Retail
  'target': 'https://www.target.com/',
  'walmart': 'https://www.walmart.com/',
  'amazon': 'https://www.amazon.com/',
  'costco': 'https://www.costco.com/',
  "sam's club": 'https://www.samsclub.com/',
  'sams club': 'https://www.samsclub.com/',
  "bj's": 'https://www.bjs.com/',
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
  'sony electronics': 'https://www.sony.com/',
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
  'bedbathandbeyond': 'https://www.bedbathandbeyond.com/',
  'bedbathandbeyond.com': 'https://www.bedbathandbeyond.com/',
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
  'briggs-riley': 'https://www.briggs-riley.com/',
  'briggs-riley.com': 'https://www.briggs-riley.com/',
  
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
  'tocaya': 'https://www.tocaya.com/',
  'tocaya modern mexican': 'https://www.tocaya.com/',
  
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
  "morton's": 'https://www.mortons.com/',
  
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
  'eyebuydirect': 'https://www.eyebuydirect.com/',
  'eyebuydirect.com': 'https://www.eyebuydirect.com/',
  'pureformulas': 'https://www.pureformulas.com/',
  'prenuvo': 'https://www.prenuvo.com/',
  'ag1': 'https://drinkag1.com/',
  
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
  'viator': 'https://www.viator.com/',
  
  // Rideshare & Transportation
  'uber': 'https://www.uber.com/',
  'lyft': 'https://www.lyft.com/',
  
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
  "carter's": 'https://www.carters.com/',
  'carters': 'https://www.carters.com/',
  'oshkosh': 'https://www.carters.com/oshkosh',
  "the children's place": 'https://www.childrensplace.com/',
  "children's place": 'https://www.childrensplace.com/',
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
  'total wireless': 'https://www.totalwireless.com/',
  
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
  
  // Business Services
  'indeed': 'https://www.indeed.com/',
  'indeed.com': 'https://www.indeed.com/',
  'constant contact': 'https://www.constantcontact.com/',
  'trust & will': 'https://trustandwill.com/',
  'trust and will': 'https://trustandwill.com/',
  'ancestry': 'https://www.ancestry.com/',
  'ancestry - family history': 'https://www.ancestry.com/',
  
  // Additional common merchants
  'avocado': 'https://www.avocadogreenmattress.com/',
  'avocado green mattress': 'https://www.avocadogreenmattress.com/',
  'mackage': 'https://www.mackage.com/',
  'lufthansa': 'https://www.lufthansa.com/',
  'avis car rental': 'https://www.avis.com/',
  'dollar car rental': 'https://www.dollar.com/',
  'thrifty': 'https://www.thrifty.com/',
  'sixt': 'https://www.sixt.com/',
  'equinox+': 'https://www.equinoxplus.com/',
  'barry\'s': 'https://www.barrys.com/',
  'barrys': 'https://www.barrys.com/',
  'soulcycle': 'https://www.soul-cycle.com/',
  'rumble': 'https://www.rumble-boxing.com/',
  'fabletics': 'https://www.fabletics.com/',
  'vuori': 'https://www.vuoriclothing.com/',
  'allbirds': 'https://www.allbirds.com/',
  'bombas': 'https://bombas.com/',
  'grove collaborative': 'https://www.grove.co/',
  'grove': 'https://www.grove.co/',
  'public goods': 'https://www.publicgoods.com/',
  'thrive market': 'https://thrivemarket.com/',
  'butcher box': 'https://www.butcherbox.com/',
  'butcherbox': 'https://www.butcherbox.com/',
  'omaha steaks': 'https://www.omahasteaks.com/',
  'wine access': 'https://www.wineaccess.com/',
  'naked wines': 'https://www.nakedwines.com/',
  'vivino': 'https://www.vivino.com/',
  'shutterfly': 'https://www.shutterfly.com/',
  'snapfish': 'https://www.snapfish.com/',
  'mixbook': 'https://www.mixbook.com/',
  'framebridge': 'https://www.framebridge.com/',
  'artifact uprising': 'https://www.artifactuprising.com/',
  'minted': 'https://www.minted.com/',
  'paper source': 'https://www.papersource.com/',
  'papyrus': 'https://www.papyrusonline.com/',
  'rover': 'https://www.rover.com/',
  'wag': 'https://wagwalking.com/',
  'embark': 'https://embarkvet.com/',
  'wisdom panel': 'https://www.wisdompanel.com/',
  'barkbox': 'https://www.barkbox.com/',
  'bark box': 'https://www.barkbox.com/',
  'ollie': 'https://www.myollie.com/',
  'nom nom': 'https://www.nomnomnow.com/',
  'the farmer\'s dog': 'https://www.thefarmersdog.com/',
  'farmers dog': 'https://www.thefarmersdog.com/',
  'ring': 'https://ring.com/',
  'simplisafe': 'https://simplisafe.com/',
  'adt': 'https://www.adt.com/',
  'vivint': 'https://www.vivint.com/',
  'nest': 'https://store.google.com/category/connected_home',
  'ecobee': 'https://www.ecobee.com/',
  'august': 'https://august.com/',
  'wyze': 'https://www.wyze.com/',
  'eufy': 'https://www.eufylife.com/',
  'arlo': 'https://www.arlo.com/',
  'blink': 'https://blinkforhome.com/',
  'roomba': 'https://www.irobot.com/',
  'irobot': 'https://www.irobot.com/',
  'dyson': 'https://www.dyson.com/',
  'shark': 'https://www.sharkclean.com/',
  'bissell': 'https://www.bissell.com/',
  'hoover': 'https://hoover.com/',
  'ninja': 'https://www.ninjakitchen.com/',
  'instant pot': 'https://instantbrands.com/',
  'cuisinart': 'https://www.cuisinart.com/',
  'kitchenaid': 'https://www.kitchenaid.com/',
  'breville': 'https://www.breville.com/',
  'keurig': 'https://www.keurig.com/',
  'nespresso': 'https://www.nespresso.com/',
  'stagg': 'https://fellowproducts.com/',
  'fellow': 'https://fellowproducts.com/',
  'blue bottle': 'https://bluebottlecoffee.com/',
  'counter culture': 'https://counterculturecoffee.com/',
  'trade coffee': 'https://www.drinktrade.com/',
  'atlas coffee': 'https://atlascoffeeclub.com/',
  'panera+': 'https://www.panerabread.com/',
  'tonal': 'https://www.tonal.com/',
  'mirror': 'https://www.mirror.co/',
  'tempo': 'https://tempo.fit/',
  'hydrow': 'https://hydrow.com/',
  'nordictrack': 'https://www.nordictrack.com/',
  'bowflex': 'https://www.bowflex.com/',
  'therabody': 'https://www.therabody.com/',
  'theragun': 'https://www.therabody.com/',
  'hyperice': 'https://hyperice.com/',
  'oura': 'https://ouraring.com/',
  'oura ring': 'https://ouraring.com/',
  'eight sleep': 'https://www.eightsleep.com/',
  'calm': 'https://www.calm.com/',
  'headspace': 'https://www.headspace.com/',
  'noom': 'https://www.noom.com/',
  'weight watchers': 'https://www.weightwatchers.com/',
  'ww': 'https://www.weightwatchers.com/',
  'nutrisystem': 'https://www.nutrisystem.com/',
  'hims': 'https://www.forhims.com/',
  'hers': 'https://www.forhers.com/',
  'ro': 'https://ro.co/',
  'keeps': 'https://www.keeps.com/',
  'curology': 'https://curology.com/',
  'nurx': 'https://www.nurx.com/',
  'lemonaid': 'https://www.lemonaidhealth.com/',
  'sesame': 'https://sesamecare.com/',
  'zocdoc': 'https://www.zocdoc.com/',
  'one medical': 'https://www.onemedical.com/',
  'carbon health': 'https://carbonhealth.com/',
  'forward': 'https://goforward.com/',
  'parsley health': 'https://www.parsleyhealth.com/',
  
  // Publications & Media
  'the economist': 'https://www.economist.com/',
  'economist': 'https://www.economist.com/',
  'new york times': 'https://www.nytimes.com/',
  'nytimes': 'https://www.nytimes.com/',
  'washington post': 'https://www.washingtonpost.com/',
  'wall street journal': 'https://www.wsj.com/',
  'wsj': 'https://www.wsj.com/',
  'bloomberg': 'https://www.bloomberg.com/',
  'the atlantic': 'https://www.theatlantic.com/',
  'wired': 'https://www.wired.com/',
  'vanity fair': 'https://www.vanityfair.com/',
  'vogue': 'https://www.vogue.com/',
  'gq': 'https://www.gq.com/',
  'conde nast': 'https://www.condenast.com/',
  
  // Alcohol-free & Specialty
  'the zero proof': 'https://www.thezeroproof.com/',
  'zero proof': 'https://www.thezeroproof.com/',
  'athletic brewing': 'https://athleticbrewing.com/',
  'ritual zero proof': 'https://www.ritualzeroproof.com/',
  'seedlip': 'https://www.seedlipdrinks.com/',
  
  // More specific merchants
  'caraway': 'https://www.carawayhome.com/',
  'great jones': 'https://www.greatjonesgoods.com/',
  'our place': 'https://fromourplace.com/',
  'material': 'https://materialkitchen.com/',
  'hedley & bennett': 'https://www.hedleyandbennett.com/',
  'food52': 'https://food52.com/',
  'misen': 'https://misen.com/',
  'made in': 'https://madeincookware.com/',
  'hex clad': 'https://hexclad.com/',
  'hexclad': 'https://hexclad.com/',
  
  // Additional Merchants from Amex/Chase Offers
  '1800flowers.com': 'https://www.1800flowers.com/',
  'aarp': 'https://www.aarp.org/',
  'aldo': 'https://www.aldoshoes.com/',
  'armra': 'https://tryarmra.com/',
  'air india': 'https://www.airindia.com/',
  'airalo': 'https://www.airalo.com/',
  'alamo': 'https://www.alamo.com/',
  'american home shield': 'https://www.ahs.com/',
  'ariat': 'https://www.ariat.com/',
  'at home': 'https://www.athome.com/',
  'b-21': 'https://www.b-21.com/',
  'baskin robbins': 'https://www.baskinrobbins.com/',
  'bloomsybox': 'https://bloomsybox.com/',
  'the bouqs co.': 'https://bouqs.com/',
  'chevron': 'https://www.chevron.com/',
  'cle de peau': 'https://www.cledepeaubeaute.com/',
  'clé de peau beauté': 'https://www.cledepeaubeaute.com/',
  'contactsdirect': 'https://www.contactsdirect.com/',
  'cookunity': 'https://www.cookunity.com/',
  'cozy earth': 'https://cozyearth.com/',
  'elizabeth arden': 'https://www.elizabetharden.com/',
  'event tickets center': 'https://www.eventticketscenter.com/',
  'fanduel': 'https://www.fanduel.com/',
  'fanatics': 'https://www.fanatics.com/',
  'forme': 'https://formewear.com/',
  'fragrance.com': 'https://www.fragrance.com/',
  'gametime': 'https://gametime.co/',
  'gardyn': 'https://www.mygardyn.com/',
  'glassesusa': 'https://www.glassesusa.com/',
  'grown brilliance': 'https://grownbrilliance.com/',
  'grüns': 'https://getgruns.com/',
  'harper wilde': 'https://harperwilde.com/',
  'hatch': 'https://www.hatch.co/',
  'hatch sleep': 'https://www.hatch.co/',
  'h&r block': 'https://www.hrblock.com/',
  'hyatt vacation club': 'https://www.hyattvacationclub.com/',
  'jamba juice': 'https://www.jamba.com/',
  'johnson fitness': 'https://www.johnsonfitness.com/',
  'kicks crew': 'https://www.kickscrew.com/',
  'kipling': 'https://www.kipling-usa.com/',
  'kohler': 'https://www.kohler.com/',
  'lake pajamas': 'https://lakepajamas.com/',
  'labcorp': 'https://www.labcorp.com/',
  'lancôme': 'https://www.lancome-usa.com/',
  "lands' end": 'https://www.landsend.com/',
  'lensdirect': 'https://www.lensdirect.com/',
  "levi's": 'https://www.levi.com/',
  'liquid i.v.': 'https://www.liquid-iv.com/',
  'lume deodorant': 'https://lumedeodorant.com/',
  'maui jim': 'https://www.mauijim.com/',
  'meta store': 'https://store.meta.com/',
  'misfits market': 'https://www.misfitsmarket.com/',
  'mizzen+main': 'https://www.mizzenandmain.com/',
  'nba store': 'https://store.nba.com/',
  'nhl shop': 'https://shop.nhl.com/',
  'nuts.com': 'https://nuts.com/',
  'oxo': 'https://www.oxo.com/',
  'ode à la rose': 'https://www.odealarose.com/',
  'once upon a farm': 'https://www.onceuponafarmorganics.com/',
  'onnit': 'https://www.onnit.com/',
  'peak design': 'https://www.peakdesign.com/',
  "peet's": 'https://www.peets.com/',
  'pimsleur': 'https://www.pimsleur.com/',
  'popstroke': 'https://popstroke.com/',
  'prettylitter': 'https://www.prettylitter.com/',
  'pureology': 'https://www.pureology.com/',
  'qdoba': 'https://www.qdoba.com/',
  'quicken': 'https://www.quicken.com/',
  'redken': 'https://www.redken.com/',
  'ruggable': 'https://ruggable.com/',
  'rugs.com': 'https://www.rugs.com/',
  'shiseido': 'https://www.shiseido.com/',
  'simplehuman': 'https://www.simplehuman.com/',
  'skinceuticals': 'https://www.skinceuticals.com/',
  'sling tv': 'https://www.sling.com/',
  'smashburger': 'https://smashburger.com/',
  'solgaard': 'https://solgaard.co/',
  'straight talk': 'https://www.straighttalk.com/',
  'taxact': 'https://www.taxact.com/',
  'tecovas': 'https://www.tecovas.com/',
  'tender greens': 'https://www.tendergreens.com/',
  'the art of shaving': 'https://www.theartofshaving.com/',
  'the container store': 'https://www.containerstore.com/',
  'the motley fool': 'https://www.fool.com/',
  'the vitamin shoppe': 'https://www.vitaminshoppe.com/',
  'theory': 'https://www.theory.com/',
  'thuma': 'https://www.thuma.co/',
  'ticketsmarter': 'https://www.ticketsmarter.com/',
  'tommy john': 'https://tommyjohn.com/',
  'tracfone': 'https://www.tracfone.com/',
  'true religion': 'https://www.truereligion.com/',
  'turo': 'https://turo.com/',
  'vistaprint': 'https://www.vistaprint.com/',
  'wsj wine': 'https://www.wsjwine.com/',
  'whisker': 'https://www.litter-robot.com/',
  'litter-robot': 'https://www.litter-robot.com/',
  'wild alaskan company': 'https://wildalaskancompany.com/',
  'wilson': 'https://www.wilson.com/',
  'wine insiders': 'https://www.wineinsiders.com/',
  'youtube tv': 'https://tv.youtube.com/',
  'bonobos': 'https://bonobos.com/',
  'discovery+': 'https://www.discoveryplus.com/',
  'fubotv': 'https://www.fubo.tv/',
  'iherb': 'https://www.iherb.com/',
  'intimissimi': 'https://www.intimissimi.com/',
  'kiwico': 'https://www.kiwico.com/',
  'kuhl': 'https://www.kuhl.com/',
  "l'agence": 'https://www.lagence.com/',
  'nars': 'https://www.narscosmetics.com/',
  'olaplex': 'https://www.olaplex.com/',
  'pura': 'https://www.pura.com/',
  'tnuck': 'https://www.tnuck.com/',
  'faherty': 'https://fahertybrand.com/',
  'consumer reports': 'https://www.consumerreports.org/',
};

// Exclusion rules to prevent false positive matches
const EXCLUSION_RULES = [
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
  { pattern: /avocado green/i, exclude: ['green'] },
  { pattern: /at&t|att /i, exclude: ['at'] },
  { pattern: /mac cosmetics/i, exclude: ['mac'] },
  { pattern: /eight sleep/i, exclude: ['eight'] },
  { pattern: /one medical/i, exclude: ['one'] },
  { pattern: /blue apron|blue bottle|blue nile/i, exclude: ['blue'] },
  { pattern: /carbon health/i, exclude: ['carbon'] },
  { pattern: /forward health/i, exclude: ['forward'] },
];

/**
 * Get merchant URL from merchant name
 * Uses fuzzy matching with exclusion rules to find the best match
 * 
 * @param merchantName - The merchant name to look up
 * @returns URL string or null if no match found
 */
export function getMerchantUrl(merchantName: string): string | null {
  if (!merchantName) return null;
  
  // Normalize: lowercase, trim, collapse whitespace
  const normalized = merchantName.toLowerCase().trim().replace(/\s+/g, ' ');
  
  // Get list of excluded keys for this merchant
  const excludedKeys = new Set<string>();
  for (const rule of EXCLUSION_RULES) {
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
    normalized.replace(/ - .*$/, '').trim(), // Remove everything after " - " (common for subtitles)
  ];
  
  for (const variant of cleanedVariants) {
    if (variant && variant in MERCHANT_URLS) {
      return MERCHANT_URLS[variant];
    }
  }
  
  // 3. Word-boundary aware partial matching (prefer exact word matches)
  const normalizedWords = normalized.split(/\s+/);
  let bestMatch: string | null = null;
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
  return null;
}
