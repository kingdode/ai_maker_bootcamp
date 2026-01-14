/**
 * Content Script for DealStackr
 * 
 * This script runs on Chase and Amex pages to extract visible offers.
 * It listens for messages from the popup and returns parsed offer data with card type detection.
 * 
 * IMPORTANT: Only extracts visible content - no hidden elements, no clicks required.
 */

(function() {
  'use strict';

  /**
   * Determines the issuer based on the current page URL
   * @returns {string|null} "chase", "amex", or null
   */
  function getIssuer() {
    const hostname = window.location.hostname.toLowerCase();
    if (hostname.includes('chase.com')) {
      return 'chase';
    } else if (hostname.includes('americanexpress.com')) {
      return 'amex';
    }
    return null;
  }

  /**
   * Detects the specific card type from page content and URL
   * @returns {string} Card type identifier
   */
  function detectCardType() {
    const issuer = getIssuer();
    const url = window.location.href.toLowerCase();
    const path = window.location.pathname.toLowerCase();
    const pageText = document.body.textContent.toLowerCase();
    
    if (issuer === 'chase') {
      // Check URL patterns
      if (url.includes('sapphire') || url.includes('reserve')) {
        return 'Chase Sapphire Reserve';
      }
      if (url.includes('sapphire') || url.includes('preferred')) {
        return 'Chase Sapphire Preferred';
      }
      if (url.includes('marriott') || url.includes('bonvoy')) {
        return 'Marriott Bonvoy Chase';
      }
      if (url.includes('freedom')) {
        return 'Chase Freedom';
      }
      if (url.includes('unlimited')) {
        return 'Chase Freedom Unlimited';
      }
      if (url.includes('ink')) {
        return 'Chase Ink Business';
      }
      
      // Check page content
      if (pageText.includes('sapphire reserve')) {
        return 'Chase Sapphire Reserve';
      }
      if (pageText.includes('sapphire preferred')) {
        return 'Chase Sapphire Preferred';
      }
      if (pageText.includes('marriott') || pageText.includes('bonvoy')) {
        return 'Marriott Bonvoy Chase';
      }
      if (pageText.includes('freedom unlimited')) {
        return 'Chase Freedom Unlimited';
      }
      if (pageText.includes('freedom')) {
        return 'Chase Freedom';
      }
      if (pageText.includes('ink business')) {
        return 'Chase Ink Business';
      }
      
      return 'Chase';
    } else if (issuer === 'amex') {
      // Check URL patterns
      if (url.includes('platinum')) {
        return 'Amex Platinum';
      }
      if (url.includes('gold')) {
        return 'Amex Gold';
      }
      if (url.includes('blue')) {
        return 'Amex Blue';
      }
      if (url.includes('delta')) {
        return 'Amex Delta';
      }
      if (url.includes('hilton')) {
        return 'Amex Hilton';
      }
      if (url.includes('marriott') || url.includes('bonvoy')) {
        return 'Amex Marriott Bonvoy';
      }
      
      // Check page content
      if (pageText.includes('platinum card')) {
        return 'Amex Platinum';
      }
      if (pageText.includes('gold card')) {
        return 'Amex Gold';
      }
      if (pageText.includes('blue cash')) {
        return 'Amex Blue Cash';
      }
      if (pageText.includes('delta')) {
        return 'Amex Delta';
      }
      if (pageText.includes('hilton')) {
        return 'Amex Hilton';
      }
      if (pageText.includes('marriott') || pageText.includes('bonvoy')) {
        return 'Amex Marriott Bonvoy';
      }
      
      return 'Amex';
    }
    
    return 'Unknown';
  }

  /**
   * Normalizes whitespace in text content
   * @param {string} text - Raw text content
   * @returns {string} Normalized text
   */
  function normalizeText(text) {
    if (!text) return '';
    return text.replace(/\s+/g, ' ').trim();
  }

  /**
   * Determines offer type from offer value string
   * @param {string} value - Offer value (e.g., "10%", "$20 back")
   * @returns {"percent" | "flat"}
   */
  function determineOfferType(value) {
    if (!value) return 'flat';
    const lower = value.toLowerCase();
    if (lower.includes('%') || lower.includes('percent')) {
      return 'percent';
    }
    return 'flat';
  }

  /**
   * Determines channel from text content
   * @param {string} text - Text to analyze
   * @returns {"online" | "in_store" | "unknown"}
   */
  function determineChannel(text) {
    if (!text) return 'unknown';
    const lower = text.toLowerCase();
    if (lower.includes('online') || lower.includes('website') || lower.includes('web')) {
      return 'online';
    }
    if (lower.includes('store') || lower.includes('in-store') || lower.includes('in store')) {
      return 'in_store';
    }
    return 'unknown';
  }

  /**
   * Extracts offers from Chase pages
   * Uses multiple selector strategies to find offer cards
   * @param {string} cardType - Detected card type
   * @returns {Array<Object>} Array of offer objects
   */
  function extractChaseOffers(cardType = 'Chase') {
    console.log('[DealStackr] Starting Chase extraction, cardType:', cardType);
    const offers = [];
    const sourceUrl = window.location.href;

    // Strategy 1: Look for common Chase offer card patterns
    // These selectors may need maintenance if Chase updates their HTML structure
    const offerSelectors = [
      '[data-testid*="offer"]',
      '[class*="offer-card"]',
      '[class*="OfferCard"]',
      '[class*="offer"]',
      '[class*="Offer"]',
      'article[class*="offer"]',
      'div[class*="offer"]',
      '[role="article"]',
      '[class*="deal"]',
      '[class*="Deal"]',
      '[class*="merchant"]',
      '[class*="Merchant"]'
    ];

    // Collect from ALL selectors, don't break early - we want all offers
    let offerElements = [];
    const seenElements = new Set();
    
    for (const selector of offerSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        // Only add if visible and not already seen
        if (el.offsetHeight > 0 && el.offsetWidth > 0 && !seenElements.has(el)) {
          offerElements.push(el);
          seenElements.add(el);
        }
      }
    }

    // Strategy 2: Look for any element containing percentage and merchant-like text
    // Always run this to find all offer cards, not just when Strategy 1 finds nothing
    const allCards = document.querySelectorAll('[class*="card"], [class*="Card"], [class*="tile"], [class*="Tile"], [class*="item"], [class*="Item"], article, [role="article"], div[class]');
    const cardOffers = Array.from(allCards).filter(el => {
      if (el.offsetHeight === 0 || el.offsetWidth === 0) return false;
      if (seenElements.has(el)) return false; // Skip if already found
      const text = el.textContent || '';
      // More lenient matching - look for any offer-like patterns
      const hasPercentage = /\d+%/.test(text);
      const hasCashBack = text.toLowerCase().includes('cash back') || 
                         text.toLowerCase().includes('% back') ||
                         text.toLowerCase().includes('back');
      const hasSpendEarn = /spend\s+\$/.test(text.toLowerCase()) || 
                          /earn\s+\$/.test(text.toLowerCase());
      // Must have at least one of these patterns and reasonable text length
      return (hasPercentage || hasCashBack || hasSpendEarn) && text.length > 10;
    });
    
    // Add new cards found
    for (const el of cardOffers) {
      offerElements.push(el);
      seenElements.add(el);
    }

    // Strategy 3: Even more aggressive - find any visible container with percentage
    // Look for additional elements that might have been missed
    const allDivs = document.querySelectorAll('div[class], article, section');
    const additionalElements = Array.from(allDivs).filter(el => {
      if (el.offsetHeight < 30 || el.offsetWidth < 50) return false; // More lenient size requirement
      if (seenElements.has(el)) return false; // Skip if already found
      const text = el.textContent || '';
      // More lenient patterns
      const hasPercentage = /\d+%\s*(cash\s+)?back/i.test(text) || /\d+%/.test(text);
      const hasSpendEarn = /spend\s+\$/.test(text.toLowerCase()) || /earn\s+\$/.test(text.toLowerCase());
      const hasMerchantName = text.length > 10 && text.length < 1000; // More lenient size
      return (hasPercentage || hasSpendEarn) && hasMerchantName;
    });
    
    // Add additional elements found
    for (const el of additionalElements) {
      offerElements.push(el);
      seenElements.add(el);
    }

    console.log('[DealStackr] Found', offerElements.length, 'Chase offer elements to process');

    for (const element of offerElements) {
      try {
        // Skip if element is not visible
        if (element.offsetHeight === 0 || element.offsetWidth === 0) {
          continue;
        }

        const text = normalizeText(element.textContent || '');
        
        // Try to extract merchant name
      // Common patterns: merchant name is usually prominent text
      let merchantName = '';
      
      // Common UI text to exclude (tags, badges, buttons, action words)
      const excludedTexts = [
        // UI elements and badges
        'exclusive', 'added', 'expiring', 'expires', 'new', 'limited',
        'click', 'activate', 'add', 'view', 'details', 'more',
        'cash back', '% back', 'points', 'rewards', 'offer', 'offers',
        'online', 'in-store', 'in store', 'store', 'website',
        'terms', 'conditions', 'apply', 'save', 'deal', 'deals',
        'left', 'days', 'day', 'expires', 'expiring',
        // Action words commonly mistaken for merchant names
        'earn', 'spend', 'get', 'back', 'off', 'up to',
        'all offers', 'my offers', 'your offers', 'available offers',
        'recommended', 'featured', 'popular', 'trending', 'top',
        'see all', 'show all', 'view all', 'browse', 'filter',
        'sort', 'sort by', 'category', 'categories',
        // Common page headers
        'card offers', 'credit card offers', 'chase offers', 'amex offers',
        'shop with offers', 'shop offers', 'merchant offers',
        'added to card', 'remove from card', 'add to card',
        'statement credit', 'bonus', 'welcome',
        // Navigation text
        'next', 'previous', 'page', 'loading', 'load more',
        'sign in', 'sign out', 'log in', 'log out', 'account',
        // Common prefixes/suffixes
        'or more', 'minimum', 'maximum', 'up to', 'starting at'
      ];
      
      // Exact phrases that should never be merchant names
      const exactExcludedPhrases = [
        'earn', 'spend', 'get', 'back', 'all offers', 'my offers',
        'your offers', 'offers for you', 'more offers', 'new offers',
        'online only', 'in-store only', 'limited time', 'expires soon',
        'expiring soon', 'expiring', 'expires', 'ending soon',
        'add offer', 'added', 'remove', 'see details', 'view details',
        'terms apply', 'learn more', 'find out more', 'shop now',
        'activate now', 'use by', 'valid through', 'valid until',
        'keep the shopping going', 'shop iconic', 'available on',
        'sapphire reserve offers', 'sapphire preferred offers', 'freedom offers',
        'platinum offers', 'gold offers', 'blue cash offers'
      ];
      
      // Patterns that indicate this is NOT a merchant name
      const isNotMerchantName = (text) => {
        if (!text || text.length < 2) return true;
        const lower = text.toLowerCase().trim();
        
        // Exact match for excluded phrases
        if (exactExcludedPhrases.includes(lower)) return true;
        
        // Starts with "expiring" or "expires"
        if (/^expir(ing|es?)/i.test(lower)) return true;
        
        // Contains "offers" at the end (e.g., "Sapphire Reserve offers")
        if (/\s+offers?$/i.test(lower)) return true;
        
        // Marketing phrases
        if (/^(keep|shop|browse|discover|explore)\s+(the|your|our|iconic)/i.test(lower)) return true;
        
        // Card names being captured as merchants
        if (/^(sapphire|freedom|platinum|gold|blue\s*cash|everyday|hilton|marriott|delta)\s+(reserve|preferred|flex|unlimited|plus)?(\s+\(|$)/i.test(lower)) return true;
        
        // Dollar amounts (e.g., "$167.93")
        if (/^\$[\d,]+(\.\d+)?$/.test(text.trim())) return true;
        
        // Time remaining (e.g., "24d left", "25 days left")
        if (/\d+\s*(d|days?|day)\s*(left|remaining)?/i.test(text)) return true;
        
        // Button/action text patterns
        if (/^(add|view|click|activate|apply|save|more|details|earn|spend|get|see|show|browse|filter|sort|remove)/i.test(lower)) return true;
        
        // Patterns starting with common action words
        if (/^(all|my|your|available|recommended|featured|popular)\s+(offers?|deals?)/i.test(lower)) return true;
        
        // Offer-related phrases
        if (/^(card|credit|chase|amex)\s+(offers?)/i.test(lower)) return true;
        
        // Exact match for single-word excluded terms
        if (excludedTexts.some(excluded => lower === excluded)) return true;
        
        // Text that is entirely composed of excluded words
        const words = lower.split(/\s+/);
        if (words.every(word => excludedTexts.includes(word) || word.length < 2)) return true;
        
        // Single word that matches excluded list
        if (words.length === 1 && excludedTexts.includes(words[0])) return true;
        
        // Percentage only (e.g., "15%")
        if (/^\d+%$/.test(text.trim())) return true;
        
        // Just numbers
        if (/^\d+$/.test(text.trim())) return true;
        
        // Contains offer value patterns
        if (/\d+%\s*(cash\s+)?back/i.test(text)) return true;
        if (/\$\d+(\s+back)?/i.test(text)) return true;
        
        // Starts with dollar amount or percentage
        if (/^\$\d+/.test(text.trim())) return true;
        if (/^\d+%/.test(text.trim())) return true;
        
        // Common offer description patterns
        if (/^(spend|earn|get)\s+\$/i.test(lower)) return true;
        if (/\bor\s+more\b/i.test(lower)) return true;
        
        return false;
      };
      
      const isExcludedText = isNotMerchantName;
      
      // Priority-based merchant name extraction
      // Strategy 1: Look for structured elements (headings, titles) - highest priority
      const prioritySelectors = [
        'h1', 'h2', 'h3', 'h4', 'h5',
        '[class*="merchant"]',
        '[class*="Merchant"]',
        '[class*="name"]',
        '[class*="Name"]',
        '[class*="title"]',
        '[class*="Title"]',
        '[class*="brand"]',
        '[class*="Brand"]',
        '[class*="vendor"]',
        '[class*="Vendor"]'
      ];

      for (const selector of prioritySelectors) {
        const merchantEls = element.querySelectorAll(selector);
        for (const merchantEl of merchantEls) {
          // Skip if element is a button, badge, or tag
          const tagName = merchantEl.tagName.toLowerCase();
          const className = (merchantEl.className || '').toLowerCase();
          const id = (merchantEl.id || '').toLowerCase();
          
          // More aggressive filtering of UI elements
          if (tagName === 'button' || 
              className.includes('badge') || 
              className.includes('tag') ||
              className.includes('label') ||
              className.includes('button') ||
              className.includes('exclusive') ||
              className.includes('new') ||
              className.includes('limited') ||
              className.includes('expir') ||
              className.includes('time') ||
              className.includes('remaining') ||
              id.includes('badge') ||
              id.includes('tag')) {
            continue;
          }
          
          const candidate = normalizeText(merchantEl.textContent);
          
          // Skip if it's not a valid merchant name
          if (isNotMerchantName(candidate)) {
            continue;
          }
          
          // Valid merchant name - must be reasonable length and not contain offer patterns
          if (candidate && 
              candidate.length >= 2 && 
              candidate.length <= 60 &&
              !candidate.toLowerCase().includes('cash back') &&
              !candidate.toLowerCase().includes('% back') &&
              !candidate.toLowerCase().match(/^\d+%\s*cash\s*back$/i) &&
              !/\$\d+/.test(candidate) && // No dollar amounts
              !/\d+\s*(d|days?)\s*left/i.test(candidate)) { // No time remaining
            merchantName = candidate;
            break;
          }
        }
        if (merchantName) break;
      }
      
      // Strategy 2: Look for links (often contain merchant names)
      if (!merchantName) {
        const links = element.querySelectorAll('a[href]');
        for (const link of links) {
          const linkClass = (link.className || '').toLowerCase();
          const linkId = (link.id || '').toLowerCase();
          
          // Skip if it's a button or action link
          if (linkClass.includes('button') || linkClass.includes('add') || 
              linkClass.includes('view') || linkId.includes('button')) {
            continue;
          }
          
          const candidate = normalizeText(link.textContent);
          if (!isNotMerchantName(candidate) && candidate.length >= 2 && candidate.length <= 60) {
            merchantName = candidate;
            break;
          }
        }
      }

      // Strategy 3: Extract from child elements (but skip badges/tags)
      if (!merchantName) {
        const children = Array.from(element.children);
        for (const child of children) {
          // Skip badge/tag/button elements
          const childTag = child.tagName.toLowerCase();
          const childClass = (child.className || '').toLowerCase();
          const childId = (child.id || '').toLowerCase();
          
          if (childTag === 'button' ||
              childClass.includes('badge') || childClass.includes('tag') ||
              childClass.includes('exclusive') || childClass.includes('new') ||
              childClass.includes('expir') || childClass.includes('time') ||
              childId.includes('badge') || childId.includes('tag')) {
            continue;
          }
          
          const childText = normalizeText(child.textContent);
          if (childText && childText.length > 2 && childText.length < 200) {
            // Split into lines and find the best candidate
            const lines = childText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            for (const line of lines) {
              // Skip lines that are clearly not merchant names
              if (isNotMerchantName(line)) continue;
              
              // Clean the line
              let cleaned = line.replace(/\s*\d+%.*$/i, '').replace(/\s*(cash\s+)?back.*$/i, '').trim();
              cleaned = cleaned.replace(/\s*(exclusive|added|expiring|click|activate|new|limited|terms|apply).*$/i, '').trim();
              
              // Remove trailing excluded words
              const words = cleaned.split(/\s+/);
              while (words.length > 0 && isNotMerchantName(words[words.length - 1])) {
                words.pop();
              }
              cleaned = words.join(' ').trim();
              
              if (!isNotMerchantName(cleaned) && cleaned.length >= 2 && cleaned.length <= 60) {
                merchantName = cleaned;
                break;
              }
            }
            if (merchantName) break;
          }
        }
      }

      // Strategy 4: Extract from full text lines with scoring (most aggressive)
      if (!merchantName) {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        // Score each line to find the best merchant name candidate
        const scoredCandidates = [];
        
        for (const line of lines) {
          // Skip lines that are clearly not merchant names
          if (isNotMerchantName(line) || line.length > 80) {
            continue;
          }
          
          // Score the line based on how likely it is to be a merchant name
          let score = 0;
          
          // Higher score for lines with brand-like characteristics
          if (/^[A-Z]/.test(line)) score += 5; // Starts with capital letter
          if (/^[A-Z][a-z]+/.test(line)) score += 3; // Proper case
          if (line.length >= 3 && line.length <= 40) score += 5; // Reasonable length
          if (!/\d/.test(line)) score += 2; // No numbers (good for brand names)
          if (!/[%$]/.test(line)) score += 3; // No percentages or dollar signs
          if (!/\s(left|remaining|expir|days?|d)\s/i.test(line)) score += 5; // No time references
          
          // Penalize lines with offer patterns
          if (/\d+%\s*(cash\s+)?back/i.test(line)) score -= 10;
          if (/\$\d+/.test(line)) score -= 10;
          if (/spend\s+\$|earn\s+\$/i.test(line)) score -= 5;
          
          // Penalize UI text
          if (/^(add|view|click|activate|apply|save|more|details|terms)/i.test(line)) score -= 10;
          
          if (score > 0) {
            // Clean the line
            let cleaned = line.replace(/\s*\d+%.*$/i, '').replace(/\s*(cash\s+)?back.*$/i, '').trim();
            cleaned = cleaned.replace(/\s*(click|activate|add|expiring|added|exclusive|new|limited|terms|apply|left|remaining).*$/i, '').trim();
            
            // Remove trailing excluded words
            const words = cleaned.split(/\s+/);
            while (words.length > 0 && isNotMerchantName(words[words.length - 1])) {
              words.pop();
            }
            cleaned = words.join(' ').trim();
            
            if (!isNotMerchantName(cleaned) && cleaned.length >= 2 && cleaned.length <= 60) {
              scoredCandidates.push({ text: cleaned, score: score });
            }
          }
        }
        
        // Sort by score (highest first) and take the best candidate
        if (scoredCandidates.length > 0) {
          scoredCandidates.sort((a, b) => b.score - a.score);
          merchantName = scoredCandidates[0].text;
        }
      }

      // Final fallback: extract from first visible text node
      if (!merchantName) {
        const walker = document.createTreeWalker(
          element,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );
        let node;
        while (node = walker.nextNode()) {
          // Skip if parent is a badge/tag element
          let parent = node.parentElement;
          let skipNode = false;
          for (let i = 0; i < 3 && parent; i++) {
            const parentClass = (parent.className || '').toLowerCase();
            const parentId = (parent.id || '').toLowerCase();
            if (parentClass.includes('badge') || parentClass.includes('tag') || 
                parentClass.includes('exclusive') || parentId.includes('badge') || 
                parentId.includes('tag')) {
              skipNode = true;
              break;
            }
            parent = parent.parentElement;
          }
          if (skipNode) continue;
          
          const candidate = normalizeText(node.textContent);
          if (candidate && 
              candidate.length >= 2 && 
              candidate.length <= 60 &&
              !candidate.match(/^\d+%?$/) &&
              !isExcludedText(candidate) &&
              !candidate.toLowerCase().includes('cash back') &&
              !candidate.toLowerCase().includes('% back')) {
            // Extract full name, not just first word
            let cleaned = candidate.replace(/\s*\d+%.*$/i, '').replace(/\s*(cash\s+)?back.*$/i, '').trim();
            // Remove excluded text from the end
            cleaned = cleaned.replace(/\s*(exclusive|added|expiring|click|activate|new|limited).*$/i, '').trim();
            if (!isExcludedText(cleaned) && cleaned.length >= 2) {
              merchantName = cleaned;
              break;
            }
          }
        }
      }

      // Extract offer value
      // Look for patterns like "10%", "$20 back", "5% cash back", or "Spend $X, earn $Y back"
      let offerValue = '';
      let minSpend = null;
      let cashbackAmount = null;
      
      // First, try to match "Spend $X or more, earn $Y back" pattern (common in both Chase and Amex)
      const spendEarnPattern = /spend\s+\$([\d,]+)\s+or\s+more[,\s]*earn\s+\$([\d,]+)\s+back/i;
      const spendEarnMatch = text.match(spendEarnPattern);
      
      if (spendEarnMatch && spendEarnMatch[1] && spendEarnMatch[2]) {
        minSpend = parseInt(spendEarnMatch[1].replace(/,/g, ''), 10);
        cashbackAmount = parseInt(spendEarnMatch[2].replace(/,/g, ''), 10);
        
        // Calculate percentage
        if (minSpend > 0 && cashbackAmount > 0) {
          const percentage = Math.round((cashbackAmount / minSpend) * 100);
          offerValue = `$${cashbackAmount} back (${percentage}%) on $${minSpend}+ spend`;
        } else {
          offerValue = `$${cashbackAmount} back on $${minSpend}+ spend`;
        }
      } else {
        // Try to find the most specific pattern: "X% cash back" or "X% back"
        const cashBackPatterns = [
          /(\d{1,3})%\s+cash\s+back/i,  // "25% cash back" - limit to 1-3 digits
          /(\d{1,3})%\s+back/i,         // "25% back"
          /(\d{1,3})%\s*cash\s*back/i,  // "25%cash back" (no space)
        ];
        
        for (const pattern of cashBackPatterns) {
          const match = text.match(pattern);
          if (match && match[1]) {
            const percent = parseInt(match[1], 10);
            // Reasonable percentage range (1-100%)
            if (percent >= 1 && percent <= 100) {
              offerValue = match[1] + '% cash back';
              break;
            }
          }
        }
        
        // If not found, try other patterns
        if (!offerValue) {
          const valuePatterns = [
            /\b(\d{1,2})%\s*(cash\s+)?back\b/i,  // Word boundary to avoid matching "125%"
            /\$(\d+)(\s+back)?/i,
            /\b(\d+)\s*(points|pts)\b/i,
            /up\s+to\s+(\d{1,3})%/i,
            /up\s+to\s+\$(\d+)/i
          ];

          for (const pattern of valuePatterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
              const num = parseInt(match[1], 10);
              // For percentages, validate range
              if (pattern.source.includes('%')) {
                if (num >= 1 && num <= 100) {
                  offerValue = match[0].trim();
                  break;
                }
              } else if (pattern.source.includes('\\$')) {
                // Extract dollar amount as cashback
                cashbackAmount = num;
                offerValue = match[0].trim();
                break;
              } else {
                offerValue = match[0].trim();
                break;
              }
            }
          }
        }
        
        // Try to find minimum spend separately for context
        if (!minSpend) {
          const minSpendPatterns = [
            /spend\s+\$([\d,]+)\s+or\s+more/i,
            /spend\s+\$([\d,]+)/i,
            /minimum\s+spend\s+of\s+\$([\d,]+)/i
          ];
          for (const pattern of minSpendPatterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
              minSpend = parseInt(match[1].replace(/,/g, ''), 10);
              break;
            }
          }
        }
        
        // If we found cashback amount and min spend separately, calculate percentage
        if (!offerValue.includes('%') && minSpend && cashbackAmount && minSpend > 0 && cashbackAmount > 0) {
          const percentage = Math.round((cashbackAmount / minSpend) * 100);
          offerValue = `$${cashbackAmount} back (${percentage}%) on $${minSpend}+ spend`;
        }
      }

      // Fallback: look for standalone percentages (but be careful)
      if (!offerValue) {
        try {
          // Look for percentages that are reasonable (1-100%)
          // Find all percentages and score them by proximity to "cash back"
          const percentRegex = /\b(\d{1,3})%/g;
          const percentMatches = [];
          let match;
          while ((match = percentRegex.exec(text)) !== null) {
            percentMatches.push(match);
          }
          
          const scoredMatches = [];
          
          for (const match of percentMatches) {
            const percent = parseInt(match[1], 10);
            if (percent >= 1 && percent <= 100) {
              const matchIndex = match.index;
              const contextStart = Math.max(0, matchIndex - 30);
              const contextEnd = Math.min(text.length, matchIndex + 30);
              const context = text.substring(contextStart, contextEnd).toLowerCase();
              
              let score = 0;
              // Higher score if near "cash back"
              if (context.includes('cash back')) score += 10;
              if (context.includes('back')) score += 5;
              if (context.includes('cash')) score += 3;
              // Prefer smaller percentages (more common for offers: 1-50%)
              if (percent <= 50) score += 2;
              if (percent <= 25) score += 1;
              
              scoredMatches.push({ match, percent, score });
            }
          }
          
          // Sort by score (highest first) and take the best match
          if (scoredMatches.length > 0) {
            scoredMatches.sort((a, b) => b.score - a.score);
            const bestMatch = scoredMatches[0];
            offerValue = bestMatch.percent + '% cash back';
          }
        } catch (e) {
          // Fallback to simple percentage match if scoring fails
          const simpleMatch = text.match(/\b(\d{1,2})%/);
          if (simpleMatch) {
            const percent = parseInt(simpleMatch[1], 10);
            if (percent >= 1 && percent <= 100) {
              offerValue = percent + '% cash back';
            }
          }
        }
      }
      
      // Final fallback: any reasonable percentage near "back" or "cash"
      if (!offerValue) {
        const dollarMatch = text.match(/\$(\d+)/);
        if (dollarMatch) {
          offerValue = dollarMatch[0] + ' back';
        }
      }

      // If we have offer value but no merchant name, try to extract from text before the offer
      if (offerValue && !merchantName) {
        const offerIndex = text.indexOf(offerValue);
        if (offerIndex > 0) {
          const beforeOffer = text.substring(0, offerIndex).trim();
          // Try to extract full merchant name from text before the offer
          // Look for the last substantial text block before the offer
          const lines = beforeOffer.split('\n').map(l => l.trim()).filter(l => l.length > 0);
          
          // Try last line first (often contains merchant name)
          for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i];
            // Skip lines that are clearly not merchant names
            if (line.match(/^\d+%?$/) ||
                line.toLowerCase().includes('cash back') ||
                line.toLowerCase().includes('% back') ||
                line.toLowerCase().includes('click') ||
                line.toLowerCase().includes('activate') ||
                line.length > 60) {
              continue;
            }
            // Clean the line and use as merchant name
            let cleaned = line.replace(/\s*\d+%.*$/i, '').replace(/\s*(cash\s+)?back.*$/i, '').trim();
            if (cleaned.length >= 2 && cleaned.length <= 50) {
              merchantName = cleaned;
              break;
            }
          }
          
          // Fallback: extract words before offer value
          if (!merchantName) {
            const words = beforeOffer.split(/\s+/).filter(w => 
              w.length > 1 && 
              !w.match(/^\d+%?$/) &&
              !w.toLowerCase().includes('back') &&
              !w.toLowerCase().includes('cash')
            );
            if (words.length > 0) {
              // Take up to 4 words for merchant name
              merchantName = words.slice(-Math.min(4, words.length)).join(' ');
            }
          }
        }
      }

      // Determine channel
      const channel = determineChannel(text);
      
      // Extract expiration date
      let expiresAt = null;
      const expirationPatterns = [
        // "Expires 1/15/26" or "Expires 01/15/2026"
        /expires?\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
        // "Exp 1/15/26"
        /exp\.?\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
        // "Valid through 1/15/26"
        /valid\s+(?:through|thru|until)\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
        // "Ends 1/15/26"
        /ends?\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
        // "Offer ends January 15, 2026"
        /(?:offer\s+)?ends?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i,
        // "Expires January 15"
        /expires?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?/i,
        // "X days left"
        /(\d+)\s*days?\s*(?:left|remaining)/i
      ];
      
      for (const pattern of expirationPatterns) {
        const match = text.match(pattern);
        if (match) {
          try {
            // Handle "X days left" pattern
            if (pattern.toString().includes('days')) {
              const daysLeft = parseInt(match[1], 10);
              if (daysLeft > 0 && daysLeft < 365) {
                const expDate = new Date();
                expDate.setDate(expDate.getDate() + daysLeft);
                expiresAt = expDate.toISOString();
              }
            }
            // Handle month name patterns
            else if (match[1] && isNaN(parseInt(match[1]))) {
              const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
              const monthIndex = monthNames.findIndex(m => match[1].toLowerCase().startsWith(m));
              if (monthIndex >= 0) {
                const day = parseInt(match[2], 10);
                const year = match[3] ? parseInt(match[3], 10) : new Date().getFullYear();
                const expDate = new Date(year, monthIndex, day);
                expiresAt = expDate.toISOString();
              }
            }
            // Handle date patterns like 1/15/26
            else if (match[1]) {
              const dateParts = match[1].split('/');
              if (dateParts.length >= 2) {
                let month = parseInt(dateParts[0], 10) - 1;
                let day = parseInt(dateParts[1], 10);
                let year = dateParts[2] ? parseInt(dateParts[2], 10) : new Date().getFullYear();
                if (year < 100) year += 2000;
                const expDate = new Date(year, month, day);
                expiresAt = expDate.toISOString();
              }
            }
            if (expiresAt) break;
          } catch (e) {
            // Skip invalid date parsing
          }
        }
      }

      // Only add if we have essential data
      if (merchantName && offerValue) {
        offers.push({
          issuer: 'chase',
          card_type: cardType,
          merchant_name: merchantName,
          offer_value: offerValue,
          offer_type: determineOfferType(offerValue),
          channel: channel,
          expires_at: expiresAt,
          source_url: sourceUrl
        });
      }
    } catch (e) {
      // Skip this element if there's an error
      console.warn('[DealStackr] Error extracting offer from element:', e);
      continue;
    }
    }

    console.log('[DealStackr] Chase extraction complete, returning', offers.length, 'offers');
    return offers;
  }

  /**
   * Extracts offers from Amex pages
   * Uses multiple selector strategies to find offer cards
   * @param {string} cardType - Detected card type
   * @returns {Array<Object>} Array of offer objects
   */
  function extractAmexOffers(cardType = 'Amex') {
    const offers = [];
    const sourceUrl = window.location.href;

    // Strategy 1: Look for common Amex offer card patterns
    // Collect from ALL selectors, don't break early
    const offerSelectors = [
      '[data-testid*="offer"]',
      '[class*="offer-card"]',
      '[class*="OfferCard"]',
      '[class*="offer"]',
      '[class*="Offer"]',
      'article[class*="offer"]',
      'div[class*="offer"]',
      '[role="article"]',
      '[class*="deal"]',
      '[class*="Deal"]'
    ];

    let offerElements = [];
    const seenElements = new Set();
    
    for (const selector of offerSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        // Only add if visible and not already seen
        if (el.offsetHeight > 0 && el.offsetWidth > 0 && !seenElements.has(el)) {
          offerElements.push(el);
          seenElements.add(el);
        }
      }
    }

    // Strategy 2: Look for cards with Amex offer patterns
    // Amex offers typically have "Spend $X or more, earn $Y back" pattern
    // Always run this to find all offer cards, not just when Strategy 1 finds nothing
    const allCards = document.querySelectorAll('[class*="card"], [class*="Card"], [class*="tile"], [class*="Tile"], article, [role="article"], div[class]');
    const cardOffers = Array.from(allCards).filter(el => {
      if (el.offsetHeight === 0 || el.offsetWidth === 0) return false;
      if (seenElements.has(el)) return false; // Skip if already found
      
      // Skip "Added to Card" section - look for parent containers with that text
      let parent = el.parentElement;
      let skipElement = false;
      for (let i = 0; i < 5 && parent; i++) {
        const parentText = parent.textContent || '';
        const parentClass = (parent.className || '').toLowerCase();
        // Skip if in "Added to Card" widget or similar sections
        if (parentText.includes('Added to Card') || 
            parentText.includes('Saved from Offers') ||
            parentText.includes('Explore Local Offers') ||
            parentClass.includes('added-to-card') ||
            parentClass.includes('saved-offers')) {
          skipElement = true;
          break;
        }
        parent = parent.parentElement;
      }
      if (skipElement) return false;
      
      const text = el.textContent || '';
      // Look for Amex offer patterns: "Spend $X", "earn $Y back", percentages, etc.
      // But exclude if it's clearly a widget header or navigation
      if (text.length < 20 || text.length > 2000) return false; // Reasonable size
      
      const hasAmexPattern = /spend\s+\$/.test(text.toLowerCase()) || 
                             /earn\s+\$/.test(text.toLowerCase()) ||
                             /\d+%\s*(cash\s+)?back/i.test(text) ||
                             (text.includes('%') && text.includes('back')) ||
                             (text.includes('back') && /\$\d+/.test(text));
      
      // Also check if it looks like an offer card (has merchant name and offer value)
      const hasMerchantName = text.length > 10 && 
                              !text.toLowerCase().includes('recommended offers') &&
                              !text.toLowerCase().includes('filter') &&
                              !text.toLowerCase().includes('sort by');
      
      return hasAmexPattern && hasMerchantName;
    });
    
    // Add new cards found
    for (const el of cardOffers) {
      offerElements.push(el);
      seenElements.add(el);
    }

    // Strategy 3: Even more aggressive - find any container with offer-like content
    // Look for grid items specifically
    const allDivs = document.querySelectorAll('div[class], article, section');
    const additionalElements = Array.from(allDivs).filter(el => {
      if (el.offsetHeight < 150 || el.offsetWidth < 200) return false; // Reasonable size for offer cards
      if (seenElements.has(el)) return false;
      
      // Skip "Added to Card" section
      let parent = el.parentElement;
      let skipElement = false;
      for (let i = 0; i < 5 && parent; i++) {
        const parentText = parent.textContent || '';
        const parentClass = (parent.className || '').toLowerCase();
        if (parentText.includes('Added to Card') || 
            parentText.includes('Saved from Offers') ||
            parentClass.includes('added-to-card')) {
          skipElement = true;
          break;
        }
        parent = parent.parentElement;
      }
      if (skipElement) return false;
      
      const text = el.textContent || '';
      // Look for offer patterns
      const hasOfferPattern = /spend\s+\$/.test(text.toLowerCase()) ||
                             /earn\s+\$/.test(text.toLowerCase()) ||
                             /\d+%\s*(cash\s+)?back/i.test(text);
      const hasMerchantName = text.length > 20 && text.length < 1000 &&
                              !text.toLowerCase().includes('recommended offers') &&
                              !text.toLowerCase().includes('filter') &&
                              !text.toLowerCase().includes('sort');
      return hasOfferPattern && hasMerchantName;
    });
    
    // Add additional elements found
    for (const el of additionalElements) {
      offerElements.push(el);
      seenElements.add(el);
    }

    // Debug logging
    console.log('[DealStackr] Found', offerElements.length, 'Amex offer elements');
    
    // Also log sample text from first few elements for debugging
    if (offerElements.length > 0) {
      console.log('[DealStackr] Sample elements:');
      offerElements.slice(0, 5).forEach((el, idx) => {
        const text = (el.textContent || '').substring(0, 150);
        const rect = el.getBoundingClientRect();
        console.log(`  ${idx + 1}: [Y:${Math.round(rect.top)}] ${text}...`);
      });
    }

    // Sort elements by position - prioritize elements lower on the page (grid items)
    // This helps avoid the "Added to Card" section at the top
    offerElements.sort((a, b) => {
      const rectA = a.getBoundingClientRect();
      const rectB = b.getBoundingClientRect();
      // Sort by vertical position (top to bottom)
      return rectA.top - rectB.top;
    });

    for (const element of offerElements) {
      try {
        // Skip if element is not visible
        if (element.offsetHeight === 0 || element.offsetWidth === 0) {
          continue;
        }

        const text = normalizeText(element.textContent || '');
        
        // Skip if this looks like it's in the "Added to Card" section (top of page)
        const rect = element.getBoundingClientRect();
        if (rect.top < 400 && (text.toLowerCase().includes('hbo') || text.toLowerCase().includes('stream h'))) {
          console.log('[DealStackr] Skipping HBO card in Added to Card section');
          continue;
        }
        
        // Extract merchant name
        let merchantName = '';
        
        // Common UI text to exclude (tags, badges, buttons, action words)
        const excludedTexts = [
          // UI elements and badges
          'exclusive', 'added', 'expiring', 'expires', 'new', 'limited',
          'click', 'activate', 'add', 'view', 'details', 'more',
          'cash back', '% back', 'points', 'rewards', 'offer', 'offers',
          'online', 'in-store', 'in store', 'store', 'website',
          'terms', 'conditions', 'apply', 'save', 'deal', 'deals',
          'left', 'days', 'day', 'expires', 'expiring',
          // Action words commonly mistaken for merchant names
          'earn', 'spend', 'get', 'back', 'off', 'up to',
          'all offers', 'my offers', 'your offers', 'available offers',
          'recommended', 'featured', 'popular', 'trending', 'top',
          'see all', 'show all', 'view all', 'browse', 'filter',
          'sort', 'sort by', 'category', 'categories',
          // Common page headers
          'card offers', 'credit card offers', 'chase offers', 'amex offers',
          'shop with offers', 'shop offers', 'merchant offers',
          'added to card', 'remove from card', 'add to card',
          'statement credit', 'bonus', 'welcome',
          // Amex-specific
          'hbo max', 'stream', 'streaming',
          // Navigation text
          'next', 'previous', 'page', 'loading', 'load more',
          'sign in', 'sign out', 'log in', 'log out', 'account',
          // Common prefixes/suffixes
          'or more', 'minimum', 'maximum', 'up to', 'starting at'
        ];
        
        // Exact phrases that should never be merchant names
        const exactExcludedPhrases = [
          'earn', 'spend', 'get', 'back', 'all offers', 'my offers',
          'your offers', 'offers for you', 'more offers', 'new offers',
          'online only', 'in-store only', 'limited time', 'expires soon',
          'expiring soon', 'expiring', 'expires', 'ending soon',
          'add offer', 'added', 'remove', 'see details', 'view details',
          'terms apply', 'learn more', 'find out more', 'shop now',
          'activate now', 'use by', 'valid through', 'valid until',
          'keep the shopping going', 'shop iconic', 'available on',
          'sapphire reserve offers', 'sapphire preferred offers', 'freedom offers',
          'platinum offers', 'gold offers', 'blue cash offers'
        ];
        
        // Patterns that indicate this is NOT a merchant name
        const isNotMerchantName = (text) => {
          if (!text || text.length < 2) return true;
          const lower = text.toLowerCase().trim();
          
          // Exact match for excluded phrases
          if (exactExcludedPhrases.includes(lower)) return true;
          
          // Starts with "expiring" or "expires"
          if (/^expir(ing|es?)/i.test(lower)) return true;
          
          // Contains "offers" at the end (e.g., "Sapphire Reserve offers")
          if (/\s+offers?$/i.test(lower)) return true;
          
          // Marketing phrases
          if (/^(keep|shop|browse|discover|explore)\s+(the|your|our|iconic)/i.test(lower)) return true;
          
          // Card names being captured as merchants
          if (/^(sapphire|freedom|platinum|gold|blue\s*cash|everyday|hilton|marriott|delta)\s+(reserve|preferred|flex|unlimited|plus)?(\s+\(|$)/i.test(lower)) return true;
          
          // Dollar amounts (e.g., "$167.93")
          if (/^\$[\d,]+(\.\d+)?$/.test(text.trim())) return true;
          
          // Time remaining (e.g., "24d left", "25 days left")
          if (/\d+\s*(d|days?|day)\s*(left|remaining)?/i.test(text)) return true;
          
          // Button/action text patterns
          if (/^(add|view|click|activate|apply|save|more|details|earn|spend|get|see|show|browse|filter|sort|remove)/i.test(lower)) return true;
          
          // Patterns starting with common action words
          if (/^(all|my|your|available|recommended|featured|popular)\s+(offers?|deals?)/i.test(lower)) return true;
          
          // Offer-related phrases
          if (/^(card|credit|chase|amex)\s+(offers?)/i.test(lower)) return true;
          
          // Exact match for single-word excluded terms
          if (excludedTexts.some(excluded => lower === excluded)) return true;
          
          // Text that is entirely composed of excluded words
          const words = lower.split(/\s+/);
          if (words.every(word => excludedTexts.includes(word) || word.length < 2)) return true;
          
          // Single word that matches excluded list
          if (words.length === 1 && excludedTexts.includes(words[0])) return true;
          
          // Percentage only (e.g., "15%")
          if (/^\d+%$/.test(text.trim())) return true;
          
          // Just numbers
          if (/^\d+$/.test(text.trim())) return true;
          
          // Contains offer value patterns
          if (/\d+%\s*(cash\s+)?back/i.test(text)) return true;
          if (/\$\d+(\s+back)?/i.test(text)) return true;
          
          // Starts with dollar amount or percentage
          if (/^\$\d+/.test(text.trim())) return true;
          if (/^\d+%/.test(text.trim())) return true;
          
          // Common offer description patterns
          if (/^(spend|earn|get)\s+\$/i.test(lower)) return true;
          if (/\bor\s+more\b/i.test(lower)) return true;
          
          return false;
        };
        
        const isExcludedText = isNotMerchantName;
        
        // Priority-based merchant name extraction (same as Chase)
        const prioritySelectors = [
          'h1', 'h2', 'h3', 'h4', 'h5',
          '[class*="merchant"]',
          '[class*="Merchant"]',
          '[class*="name"]',
          '[class*="Name"]',
          '[class*="title"]',
          '[class*="Title"]',
          '[class*="brand"]',
          '[class*="Brand"]',
          '[class*="vendor"]',
          '[class*="Vendor"]'
        ];

        for (const selector of prioritySelectors) {
          const merchantEls = element.querySelectorAll(selector);
          for (const merchantEl of merchantEls) {
            // Skip if element is a button, badge, or tag
            const tagName = merchantEl.tagName.toLowerCase();
            const className = (merchantEl.className || '').toLowerCase();
            const id = (merchantEl.id || '').toLowerCase();
            
            // More aggressive filtering of UI elements
            if (tagName === 'button' || 
                className.includes('badge') || 
                className.includes('tag') ||
                className.includes('label') ||
                className.includes('button') ||
                className.includes('exclusive') ||
                className.includes('new') ||
                className.includes('limited') ||
                className.includes('expir') ||
                className.includes('time') ||
                className.includes('remaining') ||
                id.includes('badge') ||
                id.includes('tag')) {
              continue;
            }
            
            const candidate = normalizeText(merchantEl.textContent);
            
            // Skip if it's not a valid merchant name
            if (isNotMerchantName(candidate)) {
              continue;
            }
            
            // Valid merchant name - must be reasonable length and not contain offer patterns
            if (candidate && 
                candidate.length >= 2 && 
                candidate.length <= 60 &&
                !candidate.toLowerCase().includes('cash back') &&
                !candidate.toLowerCase().includes('% back') &&
                !candidate.toLowerCase().match(/^\d+%\s*cash\s*back$/i) &&
                !/\$\d+/.test(candidate) && // No dollar amounts
                !/\d+\s*(d|days?)\s*left/i.test(candidate)) { // No time remaining
              merchantName = candidate;
              break;
            }
          }
          if (merchantName) break;
        }
        
        // Strategy 2: Look for links (often contain merchant names)
        if (!merchantName) {
          const links = element.querySelectorAll('a[href]');
          for (const link of links) {
            const linkClass = (link.className || '').toLowerCase();
            const linkId = (link.id || '').toLowerCase();
            
            // Skip if it's a button or action link
            if (linkClass.includes('button') || linkClass.includes('add') || 
                linkClass.includes('view') || linkId.includes('button')) {
              continue;
            }
            
            const candidate = normalizeText(link.textContent);
            if (!isNotMerchantName(candidate) && candidate.length >= 2 && candidate.length <= 60) {
              merchantName = candidate;
              break;
            }
          }
        }

      // Strategy 3: Extract from child elements (but skip badges/tags)
      if (!merchantName) {
        const children = Array.from(element.children);
        for (const child of children) {
          // Skip badge/tag/button elements
          const childTag = child.tagName.toLowerCase();
          const childClass = (child.className || '').toLowerCase();
          const childId = (child.id || '').toLowerCase();
          
          if (childTag === 'button' ||
              childClass.includes('badge') || childClass.includes('tag') ||
              childClass.includes('exclusive') || childClass.includes('new') ||
              childClass.includes('expir') || childClass.includes('time') ||
              childId.includes('badge') || childId.includes('tag')) {
            continue;
          }
          
          const childText = normalizeText(child.textContent);
          if (childText && childText.length > 2 && childText.length < 200) {
            // Split into lines and find the best candidate
            const lines = childText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            for (const line of lines) {
              // Skip lines that are clearly not merchant names
              if (isNotMerchantName(line)) continue;
              
              // Clean the line
              let cleaned = line.replace(/\s*\d+%.*$/i, '').replace(/\s*(cash\s+)?back.*$/i, '').trim();
              cleaned = cleaned.replace(/\s*(exclusive|added|expiring|click|activate|new|limited|terms|apply).*$/i, '').trim();
              
              // Remove trailing excluded words
              const words = cleaned.split(/\s+/);
              while (words.length > 0 && isNotMerchantName(words[words.length - 1])) {
                words.pop();
              }
              cleaned = words.join(' ').trim();
              
              if (!isNotMerchantName(cleaned) && cleaned.length >= 2 && cleaned.length <= 60) {
                merchantName = cleaned;
                break;
              }
            }
            if (merchantName) break;
          }
        }
      }
      
      // Strategy 4: Extract from full text lines with scoring (most aggressive)
      if (!merchantName) {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        // Score each line to find the best merchant name candidate
        const scoredCandidates = [];
        
        for (const line of lines) {
          // Skip lines that are clearly not merchant names
          if (isNotMerchantName(line) || line.length > 80) {
            continue;
          }
          
          // Score the line based on how likely it is to be a merchant name
          let score = 0;
          
          // Higher score for lines with brand-like characteristics
          if (/^[A-Z]/.test(line)) score += 5; // Starts with capital letter
          if (/^[A-Z][a-z]+/.test(line)) score += 3; // Proper case
          if (line.length >= 3 && line.length <= 40) score += 5; // Reasonable length
          if (!/\d/.test(line)) score += 2; // No numbers (good for brand names)
          if (!/[%$]/.test(line)) score += 3; // No percentages or dollar signs
          if (!/\s(left|remaining|expir|days?|d)\s/i.test(line)) score += 5; // No time references
          
          // Penalize lines with offer patterns
          if (/\d+%\s*(cash\s+)?back/i.test(line)) score -= 10;
          if (/\$\d+/.test(line)) score -= 10;
          if (/spend\s+\$|earn\s+\$/i.test(line)) score -= 5;
          
          // Penalize UI text
          if (/^(add|view|click|activate|apply|save|more|details|terms)/i.test(line)) score -= 10;
          
          if (score > 0) {
            // Clean the line
            let cleaned = line.replace(/\s*\d+%.*$/i, '').replace(/\s*(cash\s+)?back.*$/i, '').trim();
            cleaned = cleaned.replace(/\s*(click|activate|add|expiring|added|exclusive|new|limited|terms|apply|left|remaining).*$/i, '').trim();
            
            // Remove trailing excluded words
            const words = cleaned.split(/\s+/);
            while (words.length > 0 && isNotMerchantName(words[words.length - 1])) {
              words.pop();
            }
            cleaned = words.join(' ').trim();
            
            if (!isNotMerchantName(cleaned) && cleaned.length >= 2 && cleaned.length <= 60) {
              scoredCandidates.push({ text: cleaned, score: score });
            }
          }
        }
        
        // Sort by score (highest first) and take the best candidate
        if (scoredCandidates.length > 0) {
          scoredCandidates.sort((a, b) => b.score - a.score);
          merchantName = scoredCandidates[0].text;
        }
      }

      // Extract offer value
      // Amex offers often use "Spend $X or more, earn $Y back" format
      let offerValue = '';
      let minSpend = null;
      let cashbackAmount = null;
      
      // First, try to match Amex-specific patterns with minimum spend
      // Pattern: "Spend $300 or more, earn $60 back"
      const spendEarnPattern = /spend\s+\$([\d,]+)\s+or\s+more[,\s]*earn\s+\$([\d,]+)\s+back/i;
      const spendEarnMatch = text.match(spendEarnPattern);
      
      if (spendEarnMatch && spendEarnMatch[1] && spendEarnMatch[2]) {
        minSpend = parseInt(spendEarnMatch[1].replace(/,/g, ''), 10);
        cashbackAmount = parseInt(spendEarnMatch[2].replace(/,/g, ''), 10);
        
        // Calculate percentage
        if (minSpend > 0 && cashbackAmount > 0) {
          const percentage = Math.round((cashbackAmount / minSpend) * 100);
          offerValue = `$${cashbackAmount} back (${percentage}%) on $${minSpend}+ spend`;
        } else {
          offerValue = `$${cashbackAmount} back on $${minSpend}+ spend`;
        }
      } else {
        // Try simpler patterns: "earn $X back" or "earn $X"
        const amexPatterns = [
          /earn\s+\$([\d,]+)\s+back/i,  // "earn $20 back"
          /earn\s+\$([\d,]+)/i,          // "earn $20"
        ];
        
        for (const pattern of amexPatterns) {
          const match = text.match(pattern);
          if (match && match[1]) {
            cashbackAmount = parseInt(match[1].replace(/,/g, ''), 10);
            offerValue = '$' + cashbackAmount + ' back';
            break;
          }
        }
        
        // Try to find minimum spend separately
        if (!minSpend) {
          const minSpendPatterns = [
            /spend\s+\$([\d,]+)\s+or\s+more/i,
            /spend\s+\$([\d,]+)/i,
            /minimum\s+spend\s+of\s+\$([\d,]+)/i
          ];
          for (const pattern of minSpendPatterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
              minSpend = parseInt(match[1].replace(/,/g, ''), 10);
              break;
            }
          }
        }
        
        // If we have both min spend and cashback, calculate percentage
        if (minSpend && cashbackAmount && minSpend > 0 && cashbackAmount > 0) {
          const percentage = Math.round((cashbackAmount / minSpend) * 100);
          offerValue = `$${cashbackAmount} back (${percentage}%) on $${minSpend}+ spend`;
        }
        
        // Fallback to standard patterns if nothing found
        if (!offerValue) {
          const valuePatterns = [
            /\d+%(\s+(cash\s+)?back)?/i,
            /\$\d+(\s+back)?/i,
            /\d+\s*(points|pts)/i,
            /\$\d+.*statement\s+credit/i
          ];

          for (const pattern of valuePatterns) {
            const match = text.match(pattern);
            if (match) {
              offerValue = match[0];
              break;
            }
          }
        }
      }

      // If we have offer value but no merchant name, try to extract from text before the offer
      if (offerValue && !merchantName) {
        const offerIndex = text.indexOf(offerValue);
        if (offerIndex > 0) {
          const beforeOffer = text.substring(0, offerIndex).trim();
          // Try to extract full merchant name from text before the offer
          const lines = beforeOffer.split('\n').map(l => l.trim()).filter(l => l.length > 0);
          
          // Common UI text to exclude
          const excludedTexts = [
            'exclusive', 'added', 'expiring', 'expires', 'new', 'limited',
            'click', 'activate', 'add', 'view', 'details', 'more',
            'cash back', '% back', 'points', 'rewards', 'offer'
          ];
          const isExcludedText = (text) => {
            const lower = text.toLowerCase().trim();
            return excludedTexts.some(excluded => lower === excluded || lower.includes(excluded));
          };
          
          // Try last line first (often contains merchant name)
          for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i];
            // Skip lines that are clearly not merchant names
            if (line.match(/^\d+%?$/) ||
                isExcludedText(line) ||
                line.toLowerCase().includes('cash back') ||
                line.toLowerCase().includes('% back') ||
                line.length > 60) {
              continue;
            }
            // Clean the line and use as merchant name
            let cleaned = line.replace(/\s*\d+%.*$/i, '').replace(/\s*(cash\s+)?back.*$/i, '').trim();
            // Remove excluded text
            cleaned = cleaned.replace(/\s*(exclusive|added|expiring|click|activate|new|limited).*$/i, '').trim();
            if (!isExcludedText(cleaned) && cleaned.length >= 2 && cleaned.length <= 50) {
              merchantName = cleaned;
              break;
            }
          }
          
          // Fallback: extract words before offer value
          if (!merchantName) {
            const words = beforeOffer.split(/\s+/).filter(w => 
              w.length > 1 && 
              !w.match(/^\d+%?$/) &&
              !isExcludedText(w) &&
              !w.toLowerCase().includes('back') &&
              !w.toLowerCase().includes('cash')
            );
            if (words.length > 0) {
              // Take up to 4 words for merchant name
              merchantName = words.slice(-Math.min(4, words.length)).join(' ');
            }
          }
        }
      }

      // Amex channel is often not shown, default to unknown
      const channel = determineChannel(text);
      
      // Extract expiration date - Amex always shows expiration dates
      let expiresAt = null;
      
      // First, try to find expiration in dedicated elements within the offer card
      const expirationSelectors = [
        '[class*="expir" i]',
        '[class*="date" i]',
        '[class*="ends" i]',
        '[class*="valid" i]',
        '[data-testid*="expir"]',
        '[data-testid*="date"]'
      ];
      
      let expirationText = '';
      for (const selector of expirationSelectors) {
        try {
          const expEl = element.querySelector(selector);
          if (expEl && expEl.textContent) {
            const txt = expEl.textContent.trim();
            if (txt.length > 0 && txt.length < 100 && /\d/.test(txt)) {
              expirationText = txt;
              console.log('[DealStackr] Found expiration element:', selector, '->', txt);
              break;
            }
          }
        } catch (e) {
          // Selector may not be valid, continue
        }
      }
      
      // Also look for any element containing date-like text
      if (!expirationText) {
        const allSpans = element.querySelectorAll('span, p, div');
        for (const span of allSpans) {
          const spanText = span.textContent?.trim() || '';
          // Look for text that contains a date pattern but is short (likely just the date)
          if (spanText.length < 30 && /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(spanText)) {
            expirationText = spanText;
            console.log('[DealStackr] Found date in element:', spanText);
            break;
          }
        }
      }
      
      // Combine element text with full text for pattern matching
      const textToSearch = expirationText ? expirationText + ' ' + text : text;
      
      const expirationPatterns = [
        // "Expires 1/15/26" or "Expires 01/15/2026"
        /expires?\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
        // "Exp 1/15/26"
        /exp\.?\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
        // Just a date like "1/15/26" or "01/15/2026" (common in Amex)
        /\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/,
        // "Valid through 1/15/26"
        /valid\s+(?:through|thru|until)\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
        // "Ends 1/15/26"
        /ends?\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
        // "Offer ends January 15, 2026"
        /(?:offer\s+)?ends?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i,
        // "Expires January 15"
        /expires?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?/i,
        // Month Day, Year format: "January 15, 2026"
        /(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/i,
        // "X days left"
        /(\d+)\s*days?\s*(?:left|remaining)/i
      ];
      
      for (const pattern of expirationPatterns) {
        const match = textToSearch.match(pattern);
        if (match) {
          try {
            // Handle "X days left" pattern
            if (pattern.toString().includes('days')) {
              const daysLeft = parseInt(match[1], 10);
              if (daysLeft > 0 && daysLeft < 365) {
                const expDate = new Date();
                expDate.setDate(expDate.getDate() + daysLeft);
                expiresAt = expDate.toISOString();
              }
            }
            // Handle month name patterns
            else if (match[1] && isNaN(parseInt(match[1]))) {
              const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
              const monthIndex = monthNames.findIndex(m => match[1].toLowerCase().startsWith(m));
              if (monthIndex >= 0) {
                const day = parseInt(match[2], 10);
                const year = match[3] ? parseInt(match[3], 10) : new Date().getFullYear();
                // If the parsed date is in the past, add a year
                let expDate = new Date(year, monthIndex, day);
                if (expDate < new Date()) {
                  expDate = new Date(year + 1, monthIndex, day);
                }
                expiresAt = expDate.toISOString();
              }
            }
            // Handle date patterns like 1/15/26
            else if (match[1]) {
              const dateParts = match[1].split('/');
              if (dateParts.length >= 2) {
                let month = parseInt(dateParts[0], 10) - 1;
                let day = parseInt(dateParts[1], 10);
                let year = dateParts[2] ? parseInt(dateParts[2], 10) : new Date().getFullYear();
                if (year < 100) year += 2000;
                const expDate = new Date(year, month, day);
                expiresAt = expDate.toISOString();
                console.log('[DealStackr] Parsed Amex expiration:', match[1], '->', expiresAt);
              }
            }
            if (expiresAt) break;
          } catch (e) {
            console.warn('[DealStackr] Error parsing expiration:', e);
          }
        }
      }

      // Only add if we have essential data
      if (merchantName && offerValue) {
        offers.push({
          issuer: 'amex',
          card_type: cardType,
          merchant_name: merchantName,
          offer_value: offerValue,
          offer_type: determineOfferType(offerValue),
          channel: channel,
          expires_at: expiresAt,
          source_url: sourceUrl
        });
      }
      } catch (e) {
        // Skip this element if there's an error
        console.warn('[DealStackr] Error extracting Amex offer from element:', e);
        continue;
      }
    }

    return offers;
  }

  /**
   * Main extraction function - routes to issuer-specific parser
   * @returns {Array<Object>} Array of offer objects
   */
  function extractOffers() {
    const issuer = getIssuer();
    
    if (!issuer) {
      return [];
    }

    // Detect card type once for all offers
    let cardType = 'Unknown';
    try {
      cardType = detectCardType();
    } catch (error) {
      console.warn('[DealStackr] Error detecting card type:', error);
      // Fallback to issuer name
      cardType = issuer === 'chase' ? 'Chase' : 'Amex';
    }

    try {
      console.log('[DealStackr] Extracting offers for issuer:', issuer, 'cardType:', cardType);
      if (issuer === 'chase') {
        const offers = extractChaseOffers(cardType);
        console.log('[DealStackr] Extracted', offers.length, 'Chase offers');
        return offers;
      } else if (issuer === 'amex') {
        const offers = extractAmexOffers(cardType);
        console.log('[DealStackr] Extracted', offers.length, 'Amex offers');
        return offers;
      }
    } catch (error) {
      console.error('[DealStackr] Error extracting offers:', error);
      console.error('[DealStackr] Error stack:', error.stack);
      return [];
    }

    return [];
  }

  /**
   * Check if current page is a supported Offers page
   * @returns {boolean}
   */
  function isSupportedPage() {
    const issuer = getIssuer();
    if (!issuer) return false;
    
    // If we're on chase.com or amex.com, allow scanning
    // The user knows if they're on an offers page
    return true;
  }

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[DealStackr Content Script] Received message:', request.action);
    
    if (request.action === 'scanOffers') {
      try {
        const issuer = getIssuer();
        console.log('[DealStackr Content Script] Issuer detected:', issuer);
        
        if (!issuer) {
          console.warn('[DealStackr Content Script] Not on supported site');
          sendResponse({
            success: false,
            error: 'not_on_supported_site',
            message: 'Please navigate to a Chase or Amex website',
            offers: []
          });
          return true;
        }

        console.log('[DealStackr Content Script] Starting extraction for issuer:', issuer);
        const offers = extractOffers();
        console.log('[DealStackr Content Script] Raw offers extracted:', offers.length);
        
        // Remove duplicates based on merchant_name and offer_value
        const uniqueOffers = [];
        const seen = new Set();
        for (const offer of offers) {
          const key = `${offer.merchant_name}|${offer.offer_value}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueOffers.push(offer);
          }
        }

        // Debug logging
        console.log('[DealStackr Content Script] Unique offers after deduplication:', uniqueOffers.length);
        if (uniqueOffers.length === 0) {
          console.log('[DealStackr Content Script] No offers found. Debug info:');
          console.log('- Issuer:', issuer);
          console.log('- URL:', window.location.href);
          const testElements = document.querySelectorAll('[class*="card"], [class*="Card"], article, [class*="offer"]');
          console.log('- Found card/article/offer elements:', testElements.length);
          if (testElements.length > 0) {
            console.log('- Sample element text:', testElements[0].textContent?.substring(0, 200));
            console.log('- Sample element classes:', testElements[0].className);
          }
        } else {
          console.log('[DealStackr Content Script] Successfully extracted', uniqueOffers.length, 'offers');
          console.log('[DealStackr Content Script] Sample offers:', uniqueOffers.slice(0, 3).map(o => ({
            merchant: o.merchant_name,
            offer: o.offer_value,
            card: o.card_type
          })));
        }

        sendResponse({
          success: true,
          offers: uniqueOffers,
          issuer: issuer,
          totalFound: uniqueOffers.length
        });
        return true;
      } catch (error) {
        console.error('[DealStackr Content Script] Error in scanOffers:', error);
        console.error('[DealStackr Content Script] Error stack:', error.stack);
        sendResponse({
          success: false,
          error: 'extraction_error',
          message: error.message || 'Failed to extract offers',
          offers: []
        });
        return true;
      }
    }

    if (request.action === 'checkPage') {
      try {
        const issuer = getIssuer();
        const supported = isSupportedPage();
        console.log('[DealStackr Content Script] checkPage - issuer:', issuer, 'supported:', supported);
        sendResponse({
          issuer: issuer,
          supported: supported && !!issuer
        });
      } catch (error) {
        console.error('[DealStackr Content Script] Error in checkPage:', error);
        sendResponse({
          issuer: null,
          supported: false
        });
      }
      return true;
    }

    // Return false for unhandled messages
    return false;
  });

})();

