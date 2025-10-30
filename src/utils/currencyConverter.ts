import exchangeRates from '../data/exchange_rates.json';

/**
 * Convert foreign currency to USD using historical exchange rates
 */
export function convertToUSD(
  amount: number,
  currency: string,
  year: string
): number | null {
  const yearRates = exchangeRates.rates[year as keyof typeof exchangeRates.rates];

  if (!yearRates) {
    console.warn(`No exchange rates available for year ${year}`);
    return null;
  }

  // USD to USD is 1:1
  if (currency === 'USD') {
    return amount;
  }

  const rate = yearRates[currency as keyof typeof yearRates];

  if (!rate) {
    console.warn(`No exchange rate available for ${currency} in ${year}`);
    return null;
  }

  // Foreign currency to USD: divide by rate
  // Example: CHF 180M with rate 0.94 → 180 / 0.94 = 191.5M USD
  return amount / rate;
}

/**
 * Extract currency amounts from text
 * Supports formats like: $180M, CHF 180M, €50M, £30M, ¥1000M, etc.
 */
export function extractCurrencyAmounts(text: string): Array<{
  amount: number;
  currency: string;
  original: string;
}> {
  const amounts: Array<{ amount: number; currency: string; original: string }> = [];

  // Pattern: Currency symbol/code + amount + optional M/B suffix
  const patterns = [
    // $180M, $180 million, $180 billion
    /\$\s*(\d+(?:\.\d+)?)\s*(M|million|B|billion)?/gi,
    // CHF 180M, EUR 50M, etc.
    /([A-Z]{3})\s+(\d+(?:\.\d+)?)\s*(M|million|B|billion)?/gi,
    // €50M, £30M, ¥1000M
    /(€|£|¥)\s*(\d+(?:\.\d+)?)\s*(M|million|B|billion)?/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const original = match[0];
      let currency = 'USD';
      let amountStr: string;
      let suffix: string | undefined;

      if (pattern.source.startsWith('\\$')) {
        // Dollar pattern: $180M
        amountStr = match[1];
        suffix = match[2];
      } else if (pattern.source.startsWith('\\(')) {
        // Symbol pattern: €50M, £30M, ¥1000M
        const symbolToCurrency: Record<string, string> = {
          '€': 'EUR',
          '£': 'GBP',
          '¥': 'JPY',
        };
        currency = symbolToCurrency[match[1]] || 'USD';
        amountStr = match[2];
        suffix = match[3];
      } else {
        // Currency code pattern: CHF 180M
        currency = match[1];
        amountStr = match[2];
        suffix = match[3];
      }

      let amount = parseFloat(amountStr);

      // Apply multiplier
      if (suffix) {
        const lowerSuffix = suffix.toLowerCase();
        if (lowerSuffix === 'm' || lowerSuffix === 'million') {
          amount *= 1_000_000;
        } else if (lowerSuffix === 'b' || lowerSuffix === 'billion') {
          amount *= 1_000_000_000;
        }
      }

      amounts.push({ amount, currency, original });
    }
  }

  return amounts;
}

/**
 * Format currency amount with appropriate suffix
 */
export function formatCurrency(amount: number, currency: string): string {
  const absAmount = Math.abs(amount);

  let formatted: string;
  if (absAmount >= 1_000_000_000) {
    formatted = `${(amount / 1_000_000_000).toFixed(2)}B`;
  } else if (absAmount >= 1_000_000) {
    formatted = `${(amount / 1_000_000).toFixed(2)}M`;
  } else if (absAmount >= 1_000) {
    formatted = `${(amount / 1_000).toFixed(2)}K`;
  } else {
    formatted = amount.toFixed(2);
  }

  return `${currency} ${formatted}`;
}

/**
 * Convert and format currency with USD equivalent
 */
export function formatWithUSDEquivalent(
  amount: number,
  currency: string,
  year: string
): string {
  const formatted = formatCurrency(amount, currency);

  if (currency === 'USD') {
    return formatted;
  }

  const usdAmount = convertToUSD(amount, currency, year);

  if (usdAmount === null) {
    return `${formatted} (USD rate unavailable)`;
  }

  return `${formatted} (~${formatCurrency(usdAmount, 'USD')})`;
}

/**
 * Highlight financial amounts in evidence text
 */
export function highlightFinancialAmounts(
  text: string,
  year: string,
  showUSD: boolean = false
): string {
  const amounts = extractCurrencyAmounts(text);

  let highlighted = text;

  // Replace each amount with a highlighted version (in reverse order to preserve indices)
  for (let i = amounts.length - 1; i >= 0; i--) {
    const { amount, currency, original } = amounts[i];

    const formatted = showUSD
      ? formatWithUSDEquivalent(amount, currency, year)
      : formatCurrency(amount, currency);

    // Wrap in a span with highlight class
    const replacement = `<span class="financial-amount" title="${original}">${formatted}</span>`;

    const index = highlighted.lastIndexOf(original);
    if (index !== -1) {
      highlighted =
        highlighted.substring(0, index) +
        replacement +
        highlighted.substring(index + original.length);
    }
  }

  return highlighted;
}
