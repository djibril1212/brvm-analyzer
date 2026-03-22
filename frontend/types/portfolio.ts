export type BrokerAccount = "SGI_TOGO" | "SA2IF" | "AUTRE";

export interface Position {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  avgBuyPrice: number;
  buyDate: string; // ISO date YYYY-MM-DD
  account: BrokerAccount;
  notes?: string;
}

export interface Portfolio {
  positions: Position[];
  updatedAt: string; // ISO datetime
}

export interface PositionWithMarket extends Position {
  currentPrice: number | null;
  unrealizedPnl: number | null;
  unrealizedPnlPct: number | null;
  currentValue: number | null;
  costBasis: number;
}

export interface PortfolioSummary {
  totalCost: number;
  totalValue: number;
  totalPnl: number;
  totalPnlPct: number;
  positions: PositionWithMarket[];
}

/** Standard BRVM broker CSV columns (flexible mapping) */
export interface CsvColumnMap {
  symbol: string;
  quantity: string;
  price: string;
  date: string;
  name?: string;
}
