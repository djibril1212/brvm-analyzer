-- Migration 001 : Schéma initial BRVM Daily Analyzer
-- À exécuter dans Supabase SQL Editor

-- ============================================================
-- TABLE : market_sessions
-- Une ligne par séance de bourse
-- ============================================================
CREATE TABLE IF NOT EXISTS market_sessions (
    session_date        DATE PRIMARY KEY,
    composite_value     NUMERIC(12, 2) NOT NULL,
    composite_variation NUMERIC(6, 2)  NOT NULL,
    brvm30_value        NUMERIC(12, 2) NOT NULL,
    brvm30_variation    NUMERIC(6, 2)  NOT NULL,
    prestige_value      NUMERIC(12, 2),
    prestige_variation  NUMERIC(6, 2),
    advancing           SMALLINT NOT NULL DEFAULT 0,
    declining           SMALLINT NOT NULL DEFAULT 0,
    unchanged           SMALLINT NOT NULL DEFAULT 0,
    market_cap          NUMERIC(20, 0) NOT NULL DEFAULT 0,
    announcements       TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE : stock_quotes
-- Cours journaliers de chaque action
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_quotes (
    id              BIGSERIAL PRIMARY KEY,
    session_date    DATE NOT NULL REFERENCES market_sessions(session_date) ON DELETE CASCADE,
    symbol          VARCHAR(10) NOT NULL,
    name            VARCHAR(100),
    previous_close  NUMERIC(12, 2),
    close           NUMERIC(12, 2) NOT NULL,
    variation_pct   NUMERIC(6, 2)  NOT NULL DEFAULT 0,
    volume          INTEGER NOT NULL DEFAULT 0,
    value_traded    NUMERIC(18, 0) NOT NULL DEFAULT 0,
    per             NUMERIC(8, 2),
    net_yield       NUMERIC(6, 2),
    last_dividend   NUMERIC(10, 2),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(session_date, symbol)
);

-- ============================================================
-- TABLE : sector_indices
-- Indices sectoriels journaliers
-- ============================================================
CREATE TABLE IF NOT EXISTS sector_indices (
    id              BIGSERIAL PRIMARY KEY,
    session_date    DATE NOT NULL REFERENCES market_sessions(session_date) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    value           NUMERIC(12, 2) NOT NULL,
    variation_pct   NUMERIC(6, 2)  NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(session_date, name)
);

-- ============================================================
-- TABLE : daily_analyses
-- Analyses IA générées par Claude
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_analyses (
    session_date        DATE PRIMARY KEY REFERENCES market_sessions(session_date) ON DELETE CASCADE,
    market_sentiment    VARCHAR(20),
    resume_executif     TEXT,
    analysis_json       JSONB NOT NULL,
    model_used          VARCHAR(50) DEFAULT 'claude-sonnet-4-20250514',
    generated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEX pour les requêtes fréquentes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_stock_quotes_symbol ON stock_quotes(symbol);
CREATE INDEX IF NOT EXISTS idx_stock_quotes_date   ON stock_quotes(session_date DESC);
CREATE INDEX IF NOT EXISTS idx_sector_indices_date ON sector_indices(session_date DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_date       ON daily_analyses(session_date DESC);

-- ============================================================
-- TRIGGERS : updated_at automatique
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_market_sessions_updated_at
    BEFORE UPDATE ON market_sessions
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE OR REPLACE TRIGGER update_daily_analyses_updated_at
    BEFORE UPDATE ON daily_analyses
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================
-- RLS (Row Level Security)
-- Lecture publique via anon key, écriture via service_role uniquement
-- ============================================================
ALTER TABLE market_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_quotes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sector_indices    ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_analyses    ENABLE ROW LEVEL SECURITY;

-- Politique lecture publique (anon key)
CREATE POLICY "Lecture publique market_sessions"
    ON market_sessions FOR SELECT USING (true);

CREATE POLICY "Lecture publique stock_quotes"
    ON stock_quotes FOR SELECT USING (true);

CREATE POLICY "Lecture publique sector_indices"
    ON sector_indices FOR SELECT USING (true);

CREATE POLICY "Lecture publique daily_analyses"
    ON daily_analyses FOR SELECT USING (true);

-- Écriture réservée au service_role (le backend pipeline)
-- Le service_role bypasse automatiquement RLS dans Supabase — pas de politique INSERT nécessaire.
-- Note : avec le client service_role, RLS est bypassé par défaut.
