export interface CountryCurrency {
  countryName: string;
  flag: string;
  currencyCode: string;
  currencySymbol: string;
}

export const currencies: CountryCurrency[] = [
  { countryName: 'India', flag: '🇮🇳', currencyCode: 'INR', currencySymbol: '₹' },
  { countryName: 'United States', flag: '🇺🇸', currencyCode: 'USD', currencySymbol: '$' },
  { countryName: 'United Kingdom', flag: '🇬🇧', currencyCode: 'GBP', currencySymbol: '£' },
  { countryName: 'Germany', flag: '🇩🇪', currencyCode: 'EUR', currencySymbol: '€' },
  { countryName: 'France', flag: '🇫🇷', currencyCode: 'EUR', currencySymbol: '€' },
  { countryName: 'Italy', flag: '🇮🇹', currencyCode: 'EUR', currencySymbol: '€' },
  { countryName: 'Spain', flag: '🇪🇸', currencyCode: 'EUR', currencySymbol: '€' },
  { countryName: 'Japan', flag: '🇯🇵', currencyCode: 'JPY', currencySymbol: '¥' },
  { countryName: 'Canada', flag: '🇨🇦', currencyCode: 'CAD', currencySymbol: '$' },
  { countryName: 'Australia', flag: '🇦🇺', currencyCode: 'AUD', currencySymbol: '$' },
  { countryName: 'United Arab Emirates', flag: '🇦🇪', currencyCode: 'AED', currencySymbol: 'د.إ' },
  { countryName: 'Saudi Arabia', flag: '🇸🇦', currencyCode: 'SAR', currencySymbol: 'ر.س' },
  { countryName: 'Singapore', flag: '🇸🇬', currencyCode: 'SGD', currencySymbol: '$' },
  { countryName: 'Brazil', flag: '🇧🇷', currencyCode: 'BRL', currencySymbol: 'R$' },
  { countryName: 'South Africa', flag: '🇿🇦', currencyCode: 'ZAR', currencySymbol: 'R' },
  { countryName: 'China', flag: '🇨🇳', currencyCode: 'CNY', currencySymbol: '¥' },
  { countryName: 'South Korea', flag: '🇰🇷', currencyCode: 'KRW', currencySymbol: '₩' },
  { countryName: 'Mexico', flag: '🇲🇽', currencyCode: 'MXN', currencySymbol: '$' },
  { countryName: 'Russia', flag: '🇷🇺', currencyCode: 'RUB', currencySymbol: '₽' },
  { countryName: 'Switzerland', flag: '🇨🇭', currencyCode: 'CHF', currencySymbol: 'CHF' },
  { countryName: 'Turkey', flag: '🇹🇷', currencyCode: 'TRY', currencySymbol: '₺' },
  { countryName: 'Sweden', flag: '🇸🇪', currencyCode: 'SEK', currencySymbol: 'kr' },
  { countryName: 'Norway', flag: '🇳🇴', currencyCode: 'NOK', currencySymbol: 'kr' },
  { countryName: 'New Zealand', flag: '🇳🇿', currencyCode: 'NZD', currencySymbol: '$' },
  { countryName: 'Indonesia', flag: '🇮🇩', currencyCode: 'IDR', currencySymbol: 'Rp' },
  { countryName: 'Hong Kong', flag: '🇭🇰', currencyCode: 'HKD', currencySymbol: '$' },
  { countryName: 'Malaysia', flag: '🇲🇾', currencyCode: 'MYR', currencySymbol: 'RM' },
  { countryName: 'Thailand', flag: '🇹🇭', currencyCode: 'THB', currencySymbol: '฿' },
];
