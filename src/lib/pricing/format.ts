export interface PriceParts {
  /** The whole formatted price, e.g. "$1,299" or "1.299 €". */
  text: string;
  /** Currency symbol or code, e.g. "$", "€", "Rp". */
  symbol: string;
  /** Everything but the symbol, e.g. "1,299". */
  digits: string;
  /** False when the locale puts the symbol after the number. */
  symbolFirst: boolean;
  /** Fraction digits used. */
  decimals: number;
}

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(currency: string, locale: string, decimals: number) {
  const key = `${locale}|${currency}|${decimals}`;
  let found = formatters.get(key);
  if (!found) {
    found = new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    formatters.set(key, found);
  }
  return found;
}

/**
 * Formats a price in major units and splits it into its symbol and digits, so the symbol can be
 * styled on its own. Whole amounts drop their decimals ("$199", not "$199.00"). The locale is
 * fixed by the caller, never read from the browser, so server and client output match.
 */
export function formatPrice(amount: number, currency = "USD", locale = "en-US"): PriceParts {
  const decimals = Number.isInteger(amount) ? 0 : 2;
  const parts = formatter(currency, locale, decimals).formatToParts(amount);
  const symbolIndex = parts.findIndex((part) => part.type === "currency");
  const numberIndex = parts.findIndex((part) => part.type === "integer");
  const symbol = symbolIndex === -1 ? "" : parts[symbolIndex].value;
  const digits = parts
    .filter((part) => part.type !== "currency" && part.type !== "literal")
    .map((part) => part.value)
    .join("");
  return {
    text: parts.map((part) => part.value).join(""),
    symbol,
    digits,
    symbolFirst: symbolIndex === -1 || symbolIndex < numberIndex,
    decimals,
  };
}
