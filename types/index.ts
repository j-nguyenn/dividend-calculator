export interface PortfolioItem {
  id: string;
  ticker: string;
  amount: number;
  start_date: string;
}

export interface Dividend {
  payment_date: string;
  ticker: string;
  currency: string;
  dividend: number;
}

export interface DividendResponse {
  ticker: string;
  currency: string;
  dividends: Dividend[];
}

export interface CalculatedDividend extends Dividend {
  shares: number;
  pricePerShare: number;
  total: number;
}
