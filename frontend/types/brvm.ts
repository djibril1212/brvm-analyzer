// Types partagés BRVM — synchronisés avec les modèles Python du backend

export interface IndexData {
  name?: string;
  value: number;
  variation_pct: number;
}

export interface StockQuote {
  session_date: string;
  symbol: string;
  name: string;
  previous_close: number;
  close: number;
  variation_pct: number;
  volume: number;
  value_traded: number;
  per: number | null;
  net_yield: number | null;
  last_dividend: number | null;
}

export interface SectorIndex {
  session_date: string;
  name: string;
  value: number;
  variation_pct: number;
}

export interface MarketSession {
  session_date: string;
  composite: IndexData;
  brvm30: IndexData;
  prestige: IndexData;
  advancing: number;
  declining: number;
  unchanged: number;
  market_cap: number;
  announcements?: string | null;
  stocks: StockQuote[];
  sectors: SectorIndex[];
}

export interface AnalysisTopPick {
  symbole: string;
  nom: string;
  variation_pct: number;
  volume: number;
  score_opportunite?: number;
  profil_investisseur?: "rendement" | "croissance" | "valeur" | "spéculatif";
  arguments: string[];
  note_de_prudence: string;
}

export interface AnalysisJson {
  date: string;
  market_sentiment: string;
  resume_executif: string;
  analyse_indices: {
    composite: string;
    brvm30: string;
    contexte_regional?: string;
  };
  top_secteurs: Array<{
    nom: string;
    variation_pct: number;
    commentaire: string;
  }>;
  top_picks: AnalysisTopPick[];
  opportunites_detaillees?: Array<{
    symbole: string;
    score: number;
    signal: string;
  }>;
  valeurs_en_surveillance: Array<{ symbole: string; raison: string }>;
  valeurs_a_eviter?: Array<{ symbole: string; raison: string }>;
  /** Peut être une string (ancien schema) ou un objet (nouveau schema) */
  perspectives:
    | string
    | {
        scenario_bull?: string;
        scenario_bear?: string;
        catalyseurs_a_suivre?: string[];
      };
  disclaimer: string;
}

export interface DailyAnalysis {
  session_date: string;
  market_sentiment: "haussier" | "baissier" | "neutre" | "mitigé";
  resume_executif: string;
  // L'API retourne analysis_json comme string JSON — parsé côté client
  analysis_json: AnalysisJson | string;
  generated_at: string;
}
