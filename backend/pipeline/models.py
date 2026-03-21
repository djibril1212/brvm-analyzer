"""Modèles de données du pipeline BRVM."""
from dataclasses import dataclass, field
from datetime import date
from typing import Optional


@dataclass
class StockData:
    symbol: str
    name: str
    previous_close: float
    close: float
    variation_pct: float
    volume: int
    value_traded: float
    per: Optional[float]
    net_yield: Optional[float]
    last_dividend: Optional[float]


@dataclass
class IndexData:
    name: str
    value: float
    variation_pct: float


@dataclass
class SectorData:
    name: str
    value: float
    variation_pct: float
    annual_variation_pct: float
    avg_per: Optional[float]
    volume: int
    value_traded: float


@dataclass
class MarketSession:
    session_date: date
    composite: IndexData
    brvm30: IndexData
    prestige: IndexData
    advancing: int
    declining: int
    unchanged: int
    market_cap: float
    stocks: list[StockData] = field(default_factory=list)
    sectors: list[SectorData] = field(default_factory=list)
    announcements: str = ""
