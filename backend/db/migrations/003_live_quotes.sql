-- Table des cours en temps réel (scrape toutes les 5min pendant la séance)
-- Upsert sur ticker → une seule ligne par action, mise à jour à chaque scrape

CREATE TABLE IF NOT EXISTS live_quotes (
    ticker          TEXT PRIMARY KEY,
    last_price      NUMERIC,
    variation_pct   NUMERIC,
    open_price      NUMERIC,
    prev_close      NUMERIC,
    high            NUMERIC,
    low             NUMERIC,
    bid             NUMERIC,
    ask             NUMERIC,
    volume          NUMERIC,
    status          TEXT,
    scraped_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Lecture publique (anon key)
ALTER TABLE live_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "live_quotes_public_read"
    ON live_quotes FOR SELECT
    USING (true);
