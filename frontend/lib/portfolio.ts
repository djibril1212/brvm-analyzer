import type { Portfolio, Position, PositionWithMarket, PortfolioSummary } from "@/types/portfolio";

const STORAGE_KEY = "brvm_portfolio_v1";

// ── Persistence ──────────────────────────────────────────────────────────────

export function loadPortfolio(): Portfolio {
  if (typeof window === "undefined") return { positions: [], updatedAt: new Date().toISOString() };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { positions: [], updatedAt: new Date().toISOString() };
    return JSON.parse(raw) as Portfolio;
  } catch {
    return { positions: [], updatedAt: new Date().toISOString() };
  }
}

export function savePortfolio(portfolio: Portfolio): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...portfolio, updatedAt: new Date().toISOString() }));
}

export function addPosition(position: Omit<Position, "id">): Portfolio {
  const p = loadPortfolio();
  const newPos: Position = { ...position, id: crypto.randomUUID() };
  const updated = { ...p, positions: [...p.positions, newPos] };
  savePortfolio(updated);
  return updated;
}

export function removePosition(id: string): Portfolio {
  const p = loadPortfolio();
  const updated = { ...p, positions: p.positions.filter((pos) => pos.id !== id) };
  savePortfolio(updated);
  return updated;
}

export function updatePosition(id: string, patch: Partial<Omit<Position, "id">>): Portfolio {
  const p = loadPortfolio();
  const updated = {
    ...p,
    positions: p.positions.map((pos) => (pos.id === id ? { ...pos, ...patch } : pos)),
  };
  savePortfolio(updated);
  return updated;
}

// ── P&L calculation ───────────────────────────────────────────────────────────

export function enrichPositions(
  positions: Position[],
  priceMap: Map<string, number>
): PositionWithMarket[] {
  return positions.map((pos) => {
    const currentPrice = priceMap.get(pos.symbol) ?? null;
    const costBasis = pos.quantity * pos.avgBuyPrice;
    const currentValue = currentPrice !== null ? currentPrice * pos.quantity : null;
    const unrealizedPnl = currentValue !== null ? currentValue - costBasis : null;
    const unrealizedPnlPct =
      unrealizedPnl !== null && costBasis > 0 ? (unrealizedPnl / costBasis) * 100 : null;
    return { ...pos, currentPrice, costBasis, currentValue, unrealizedPnl, unrealizedPnlPct };
  });
}

export function computeSummary(enriched: PositionWithMarket[]): PortfolioSummary {
  const totalCost = enriched.reduce((s, p) => s + p.costBasis, 0);
  const totalValue = enriched.reduce((s, p) => s + (p.currentValue ?? p.costBasis), 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  return { totalCost, totalValue, totalPnl, totalPnlPct, positions: enriched };
}

// ── CSV import ────────────────────────────────────────────────────────────────

export interface ParsedCsvRow {
  symbol: string;
  quantity: number;
  price: number;
  date: string;
  name: string;
}

/**
 * Auto-detect columns from CSV header for known broker formats.
 * SGI TOGO / SA2IF use French headers from BRVM settlement notices.
 */
export function detectColumns(headers: string[]): Record<string, string> {
  const lower = headers.map((h) => h.toLowerCase().trim());
  const find = (...candidates: string[]) =>
    headers[lower.findIndex((h) => candidates.some((c) => h.includes(c)))] ?? "";

  return {
    symbol: find("valeur", "titre", "symbole", "symbol", "isin", "code"),
    quantity: find("quantité", "quantite", "qté", "nombre", "qty", "quantity"),
    price: find("prix", "cours", "price", "pru", "unitaire"),
    date: find("date", "opération", "operation"),
    name: find("libellé", "libelle", "société", "societe", "nom", "name"),
  };
}

export function parseCsvRows(
  csvText: string,
  colMap: Record<string, string>
): ParsedCsvRow[] {
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  // Detect delimiter
  const delimiters = [";", ",", "\t", "|"];
  const header = lines[0];
  const delimiter = delimiters.find((d) => header.split(d).length > 2) ?? ";";

  const headers = header.split(delimiter).map((h) => h.replace(/^"|"$/g, "").trim());
  const colIdx = (name: string) => headers.findIndex((h) => h === colMap[name]);

  const si = colIdx("symbol");
  const qi = colIdx("quantity");
  const pi = colIdx("price");
  const di = colIdx("date");
  const ni = colIdx("name");

  const results: ParsedCsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(delimiter).map((c) => c.replace(/^"|"$/g, "").trim());
    const rawSymbol = si >= 0 ? cells[si] : "";
    const rawQty = qi >= 0 ? cells[qi] : "";
    const rawPrice = pi >= 0 ? cells[pi] : "";
    const rawDate = di >= 0 ? cells[di] : "";
    const rawName = ni >= 0 ? cells[ni] : "";

    const symbol = rawSymbol.toUpperCase().replace(/\s+/g, "");
    const quantity = parseFloat(rawQty.replace(/\s/g, "").replace(",", "."));
    const price = parseFloat(rawPrice.replace(/\s/g, "").replace(",", "."));

    if (!symbol || isNaN(quantity) || isNaN(price) || quantity <= 0 || price <= 0) continue;

    // Normalize date to YYYY-MM-DD
    let date = rawDate;
    const dmyMatch = rawDate.match(/^(\d{2})[/\-.](\d{2})[/\-.](\d{4})$/);
    if (dmyMatch) date = `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;

    results.push({ symbol, quantity, price, date: date || new Date().toISOString().slice(0, 10), name: rawName });
  }

  return results;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function formatXOF(n: number): string {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " XOF";
}
