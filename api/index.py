from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime, timezone
import math
import os

try:
    from .market_data_service import (
        MarketDataError,
        bigquery_market_status,
        load_bigquery_asset_history,
        load_bigquery_asset_profile,
        load_bigquery_market_diagnostics,
        load_portfolio_return_input,
        search_bigquery_assets,
    )
    from .portfolio_engine import (
        PortfolioEngineError,
        analyze_portfolio_returns,
        optimize_portfolio_weights,
    )
    from .research_task_service import (
        load_latest_research_task_records,
        load_research_task_sync_audit,
        research_task_warehouse_status,
        sync_research_task_records,
    )
    from .trading_ticket_service import (
        load_latest_trade_ticket_records,
        sync_trade_ticket_records,
    )
    from .execution_route_service import (
        load_latest_execution_route_records,
        sync_execution_route_records,
    )
except ImportError:
    from market_data_service import (
        MarketDataError,
        bigquery_market_status,
        load_bigquery_asset_history,
        load_bigquery_asset_profile,
        load_bigquery_market_diagnostics,
        load_portfolio_return_input,
        search_bigquery_assets,
    )
    from portfolio_engine import (
        PortfolioEngineError,
        analyze_portfolio_returns,
        optimize_portfolio_weights,
    )
    from research_task_service import (
        load_latest_research_task_records,
        load_research_task_sync_audit,
        research_task_warehouse_status,
        sync_research_task_records,
    )
    from trading_ticket_service import (
        load_latest_trade_ticket_records,
        sync_trade_ticket_records,
    )
    from execution_route_service import (
        load_latest_execution_route_records,
        sync_execution_route_records,
    )

app = FastAPI(title="高資產傳承與所得稅擇優核算大腦", version="4.0_Ultimate")

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        "https://wealth-dashboard-web.vercel.app,http://localhost:3000",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "wealth-dashboard-api"}

@app.get("/api/v1/market/sources")
async def market_sources():
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sources": [
            {
                "id": "bigquery-fund-database",
                "name": "基金與 ETF 歷史價格庫",
                "provider": "Google BigQuery",
                "category": "資料倉儲",
                "status": "needs_secret",
                "currentStorage": "fund-war-room.fund_database.daily_prices",
                "integrationPath": "Server-side API reads BigQuery using Vercel environment credentials",
                "nextAction": "Move GCP service account JSON into environment variables before enabling reads",
            },
            {
                "id": "moneydj-nav",
                "name": "MoneyDJ 基金淨值抓取",
                "provider": "MoneyDJ",
                "category": "基金淨值",
                "status": "batch_only",
                "currentStorage": "Local SQLite / BigQuery ingestion scripts",
                "integrationPath": "Scheduled batch job writes normalized NAV data into the warehouse",
                "nextAction": "Extract crawler logic into a job module and add retry/rate-limit controls",
            },
            {
                "id": "cnyes-nav",
                "name": "鉅亨基金底層資料解析",
                "provider": "Cnyes",
                "category": "基金淨值",
                "status": "batch_only",
                "currentStorage": "Local SQLite ingestion script",
                "integrationPath": "Fallback NAV collector for funds not covered by MoneyDJ",
                "nextAction": "Normalize output schema to match daily_prices before production scheduling",
            },
            {
                "id": "yahoo-market-price",
                "name": "台股與美股 ETF 報價補值",
                "provider": "Yahoo Finance",
                "category": "股票 / ETF",
                "status": "batch_only",
                "currentStorage": "BigQuery daily_prices backfill script",
                "integrationPath": "Daily batch fills price gaps and upserts into the warehouse",
                "nextAction": "Move ticker config into versioned metadata and add job observability",
            },
            {
                "id": "fred-fx",
                "name": "FRED 匯率資料",
                "provider": "Federal Reserve Economic Data",
                "category": "總經 / 匯率",
                "status": "needs_secret",
                "currentStorage": "Local Excel export / BigQuery daily_fx upload",
                "integrationPath": "Server-side job fetches FRED series and stores normalized FX rows",
                "nextAction": "Move the FRED key into Vercel environment variables and rotate any key previously stored in code",
            },
            {
                "id": "dividend-radar",
                "name": "配息基準日雷達",
                "provider": "MoneyDJ",
                "category": "配息資料",
                "status": "batch_only",
                "currentStorage": "BigQuery dividend field updater",
                "integrationPath": "Dividend job updates existing daily price rows after NAV ingestion",
                "nextAction": "Convert raw SQL string assembly into parameterized or table-driven update logic",
            },
        ],
        "securityNotes": [
            "Do not commit gcp_key.json, service-account files, .env files, or downloaded spreadsheets.",
            "Move external API keys to Vercel environment variables before enabling serverless jobs.",
            "Keep crawlers as scheduled ingestion jobs; serve the website from normalized warehouse tables.",
            "Rotate any API key that has ever been hard-coded in a local script before production use.",
        ],
    }

@app.get("/api/v1/platform/data-products")
async def platform_data_products():
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "status": "catalog_ready",
        "dataProducts": [
            {
                "id": "market-data-warehouse",
                "name": "市場資料倉儲",
                "owner": "Data Engineering",
                "consumer": "Research Desk / Advisory Team",
                "input": "daily_prices, daily_fx, fund metadata",
                "output": "asset search, history, profile, diagnostics",
                "sla": "daily refresh with schema checks",
                "version": "v1",
                "api": [
                    "/api/v1/market/bigquery/status",
                    "/api/v1/market/bigquery/diagnostics",
                    "/api/v1/market/bigquery/assets",
                ],
            },
            {
                "id": "portfolio-analytics",
                "name": "投組分析引擎",
                "owner": "Investment Research",
                "consumer": "Investment Committee / Advisor",
                "input": "weights, symbols, benchmark, currency policy",
                "output": "risk metrics, allocation weights, efficient frontier",
                "sla": "request-time computation after data readiness checks",
                "version": "v1",
                "api": [
                    "/api/v1/portfolio/analyze-bigquery",
                    "/api/v1/portfolio/optimize-bigquery",
                ],
            },
            {
                "id": "research-task-warehouse",
                "name": "研究任務倉儲",
                "owner": "Research Operations",
                "consumer": "Research Desk / Platform Audit",
                "input": "workspace task state, lifecycle status, manual overrides",
                "output": "latest task state, sync audit batches",
                "sla": "manual sync must be queryable by workspace",
                "version": "v1",
                "api": [
                    "/api/v1/research/tasks/bigquery/status",
                    "/api/v1/research/tasks/bigquery/latest",
                    "/api/v1/research/tasks/bigquery/audit",
                    "/api/v1/research/tasks/bigquery/sync",
                ],
            },
            {
                "id": "trade-execution-warehouse",
                "name": "交易執行倉儲",
                "owner": "Execution Operations",
                "consumer": "Trading Desk / Platform Audit",
                "input": "trade tickets, approval gates, simulated route status",
                "output": "latest trade tickets, execution routes, route audit trail",
                "sla": "manual sync must be queryable by workspace, portfolio, and batch",
                "version": "v1",
                "api": [
                    "/api/v1/trading/tickets",
                    "/api/v1/trading/routes",
                ],
            },
        ],
    }

# --- 法規常數 ---
TAX_EXEMPT_VAL = 1333.0
SPOUSE_DED = 553.0
PARENT_DED = 138.0
KID_DED = 56.0
KID_YEAR_ADD = 56.0
ESTATE_DISABLED_DED = 693.0
FUNERAL_FEE = 138.0
HOUSEHOLD_LIMIT = 100.0
TOOL_LIMIT = 56.0
AMT_INS_EXEMPT = 3740.0

LIQUIDATION_ORDER = ["現金", "保單", "基金", "債券", "股票", "其他", "不動產"]

class TimelineSchema(BaseModel):
    current_age: int
    life_expectancy: int
    retire_age: int
    salary_growth: float
    inflation_rate: float
    replacement_rate: float
    roi_after_retire: float

class AssetSchema(BaseModel):
    id: str
    name: str
    type: str
    value: float
    rate: float
    monthly_add: float
    add_years: int
    tax_type: str

class InsuranceSchema(BaseModel):
    id: str
    name: str
    type: str
    app: str
    ins: str
    ben: List[str]
    custom_ben: Optional[str] = ""
    ben_allocation: str
    premium: float
    years: int
    cv: float
    irr: float
    db: float
    survival: float
    survival_age: int

class MortgageSchema(BaseModel):
    id: str
    name: str
    start: int
    total_price: float
    loan_amount: float
    years: int
    grace: int
    rate: float
    method: str
    replace_rent: bool
    claim_tax: bool

class DebtSchema(BaseModel):
    id: str
    name: str
    start: int
    loan_amount: float
    years: int
    rate: float
    monthly_pay: float

class ExtraIncomeSchema(BaseModel):
    id: str
    name: str
    type: str
    monthly_amt: float

class EventSchema(BaseModel):
    id: str
    label: str
    age: int
    amount: float
    target: str
    duration: int
    new_asset: Optional[Dict] = None 

class KidSchema(BaseModel):
    id: str
    age: int
    dep_age: int
    life: int
    disabled: bool
    ltc: bool

class SiblingSchema(BaseModel):
    id: str
    age: int
    life: int
    claim_tax: bool
    tax_inc: float
    dependent: bool
    disabled: bool
    ltc: bool

class FamilySchema(BaseModel):
    has_spouse: bool
    sp_age: int
    sp_life: int
    sp_wealth: float
    sp_add: float
    sp_rate: float
    sp_salary: float
    sp_other_inc: float
    sp_disabled: bool
    sp_ltc: bool

    has_father: bool
    fa_age: int
    fa_life: int
    fa_claim_tax: bool
    fa_tax_inc: float
    fa_disabled: bool
    fa_ltc: bool

    has_mother: bool
    mo_age: int
    mo_life: int
    mo_claim_tax: bool
    mo_tax_inc: float
    mo_disabled: bool
    mo_ltc: bool

    has_grand: bool
    gp_count: int
    gp_age: int
    gp_life: int
    gp_claim_tax: bool
    gp_tax_inc: float
    gp_dependent: bool
    gp_disabled_count: int
    gp_ltc_count: int

    kids: List[KidSchema]
    siblings: List[SiblingSchema]
    daily_tool_val: float
    job_tool_val: float

class PensionSchema(BaseModel):
    annuity_start_age: int
    annuity_m_amt_wan: float
    lump_sum_wan: float
    lump_sum_age: int
    acct_bal_wan: float
    acct_add_wan: float
    acct_roi: float
    vol_deduct_wan: float

class SimulationPayload(BaseModel):
    timeline: TimelineSchema
    assets: List[AssetSchema]
    insurances: List[InsuranceSchema]
    mortgages: List[MortgageSchema]
    debts: List[DebtSchema]
    extra_incomes: List[ExtraIncomeSchema]
    events: List[EventSchema]
    family: FamilySchema
    pension: PensionSchema
    tax_params: Dict[str, float]
    main_salary: float
    base_m_exp: float
    m_rent: float
    m_insurance: float

class PortfolioAnalyzePayload(BaseModel):
    weights_by_symbol: Dict[str, float]
    returns_by_symbol: Dict[str, List[Optional[float]]]
    benchmark_returns: Optional[List[Optional[float]]] = None
    dates: Optional[List[str]] = None
    mode: str = "overlap"
    confidence_level: float = 0.95
    risk_free_rate: float = 0.02

class PortfolioOptimizePayload(BaseModel):
    returns_by_symbol: Dict[str, List[Optional[float]]]
    symbols: Optional[List[str]] = None
    benchmark_returns: Optional[List[Optional[float]]] = None
    dates: Optional[List[str]] = None
    mode: str = "overlap"
    optimization_mode: str = "max_sharpe"
    target_volatility: Optional[float] = None
    confidence_level: float = 0.95
    risk_free_rate: float = 0.02
    sample_count: int = 5000
    random_seed: int = 7

class PortfolioAnalyzeBigQueryPayload(BaseModel):
    weights_by_symbol: Dict[str, float]
    benchmark_symbol: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    price_basis: str = "adjusted"
    pricing_currency: str = "original"
    currency_by_symbol: Optional[Dict[str, str]] = None
    mode: str = "overlap"
    confidence_level: float = 0.95
    risk_free_rate: float = 0.02

class PortfolioOptimizeBigQueryPayload(BaseModel):
    symbols: List[str]
    benchmark_symbol: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    price_basis: str = "adjusted"
    pricing_currency: str = "original"
    currency_by_symbol: Optional[Dict[str, str]] = None
    mode: str = "overlap"
    optimization_mode: str = "max_sharpe"
    target_volatility: Optional[float] = None
    confidence_level: float = 0.95
    risk_free_rate: float = 0.02
    sample_count: int = 5000
    random_seed: int = 7

class ResearchTaskSyncRecordPayload(BaseModel):
    workspace_id: Optional[str] = None
    actor_id: Optional[str] = None
    task_id: str
    idempotency_key: Optional[str] = None
    generated_at: str
    updated_at: str
    lane: str
    title: Optional[str] = None
    status: str
    priority: str
    owner: Optional[str] = None
    symbol: Optional[str] = None
    source: Optional[str] = None
    evidence: Optional[str] = None
    next_action: Optional[str] = None
    manual_note: Optional[str] = None
    is_manual_override: bool = False
    lifecycle_gate_status: str
    lifecycle_decision: Optional[str] = None
    active_stage: Optional[str] = None
    blocker_count: int = 0
    ready_count: int = 0

class ResearchTaskSyncPayload(BaseModel):
    workspace_id: Optional[str] = None
    actor_id: Optional[str] = None
    generated_at: Optional[str] = None
    records: List[ResearchTaskSyncRecordPayload]
    lifecycle: Optional[Dict] = None

class TradeTicketSyncRecordPayload(BaseModel):
    workspace_id: Optional[str] = None
    actor_id: Optional[str] = None
    ticket_id: str
    idempotency_key: Optional[str] = None
    generated_at: str
    updated_at: str
    portfolio_id: Optional[str] = None
    batch_id: Optional[str] = None
    symbol: str
    direction: str
    status: str = "draft"
    ticket_amount: float = 0
    cash_impact: float = 0
    current_amount: float = 0
    current_weight: float = 0
    target_amount: float = 0
    target_weight: float = 0
    trade_amount: float = 0
    trade_weight: float = 0
    score: Optional[float] = None
    signal: Optional[str] = None
    note: Optional[str] = None
    ticket_note: Optional[str] = None
    minimum_trade_amount: float = 0

class TradeTicketSyncPayload(BaseModel):
    workspace_id: Optional[str] = None
    actor_id: Optional[str] = None
    portfolio_id: Optional[str] = None
    batch_id: Optional[str] = None
    generated_at: Optional[str] = None
    records: List[TradeTicketSyncRecordPayload]

class ExecutionRouteSyncRecordPayload(BaseModel):
    workspace_id: Optional[str] = None
    actor_id: Optional[str] = None
    route_id: str
    ticket_id: Optional[str] = None
    idempotency_key: Optional[str] = None
    generated_at: str
    updated_at: str
    portfolio_id: Optional[str] = None
    batch_id: Optional[str] = None
    batch_number: int = 0
    sequence_in_batch: int = 0
    route_sequence: int = 0
    symbol: str
    direction: str
    venue: str
    route_state: str
    route_status: str
    route_notional: float = 0
    ticket_amount: float = 0
    cash_impact: float = 0
    batch_gross_amount: float = 0
    batch_cash_impact: float = 0
    estimated_slippage_bps: float = 0
    estimated_commission_bps: float = 0
    estimated_route_cost: float = 0
    approval_decision: str = "watch"
    route_note: Optional[str] = None

class ExecutionRouteSyncPayload(BaseModel):
    workspace_id: Optional[str] = None
    actor_id: Optional[str] = None
    portfolio_id: Optional[str] = None
    batch_id: Optional[str] = None
    generated_at: Optional[str] = None
    records: List[ExecutionRouteSyncRecordPayload]

def calc_tw_tax(net_inc: float) -> float:
    if net_inc <= 56: return net_inc * 0.05
    elif net_inc <= 126: return net_inc * 0.12 - 3.92
    elif net_inc <= 252: return net_inc * 0.20 - 14.0
    elif net_inc <= 498: return net_inc * 0.30 - 39.2
    else: return net_inc * 0.40 - 89.0

@app.get("/api/v1/market/bigquery/status")
async def market_bigquery_status():
    try:
        return {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            **bigquery_market_status(),
        }
    except MarketDataError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc))

@app.get("/api/v1/market/bigquery/diagnostics")
async def market_bigquery_diagnostics():
    try:
        return {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            **load_bigquery_market_diagnostics(),
        }
    except MarketDataError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc))

@app.get("/api/v1/research/tasks/bigquery/status")
async def research_tasks_bigquery_status():
    try:
        return {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            **research_task_warehouse_status(),
        }
    except MarketDataError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc))

@app.get("/api/v1/research/tasks/bigquery/latest")
async def latest_research_tasks_from_bigquery(limit: int = 50, workspace_id: Optional[str] = None):
    try:
        return {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            **load_latest_research_task_records(limit=limit, workspace_id=workspace_id),
        }
    except MarketDataError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc))

@app.get("/api/v1/research/tasks/bigquery/audit")
async def research_task_sync_audit(limit: int = 12, workspace_id: Optional[str] = None):
    try:
        return {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            **load_research_task_sync_audit(limit=limit, workspace_id=workspace_id),
        }
    except MarketDataError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc))

@app.post("/api/v1/research/tasks/bigquery/sync")
async def sync_research_tasks_to_bigquery(payload: ResearchTaskSyncPayload):
    try:
        records = []
        for record in payload.records:
            item = record.model_dump()
            item["workspace_id"] = item.get("workspace_id") or payload.workspace_id
            item["actor_id"] = item.get("actor_id") or payload.actor_id
            records.append(item)
        return {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            **sync_research_task_records(records),
        }
    except MarketDataError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc))

@app.get("/api/v1/trading/tickets")
async def trading_tickets(
    workspace_id: Optional[str] = None,
    portfolio_id: Optional[str] = None,
    batch_id: Optional[str] = None,
    limit: int = 100,
):
    try:
        return {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            **load_latest_trade_ticket_records(
                limit=limit,
                workspace_id=workspace_id,
                portfolio_id=portfolio_id,
                batch_id=batch_id,
            ),
        }
    except MarketDataError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc))

@app.post("/api/v1/trading/tickets")
async def sync_trading_tickets(payload: TradeTicketSyncPayload):
    try:
        records = []
        for record in payload.records:
            item = record.model_dump()
            item["workspace_id"] = item.get("workspace_id") or payload.workspace_id
            item["actor_id"] = item.get("actor_id") or payload.actor_id
            item["portfolio_id"] = item.get("portfolio_id") or payload.portfolio_id
            item["batch_id"] = item.get("batch_id") or payload.batch_id
            records.append(item)
        return {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            **sync_trade_ticket_records(records),
        }
    except MarketDataError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc))

@app.get("/api/v1/trading/routes")
async def trading_execution_routes(
    workspace_id: Optional[str] = None,
    portfolio_id: Optional[str] = None,
    batch_id: Optional[str] = None,
    limit: int = 100,
):
    try:
        return {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            **load_latest_execution_route_records(
                limit=limit,
                workspace_id=workspace_id,
                portfolio_id=portfolio_id,
                batch_id=batch_id,
            ),
        }
    except MarketDataError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc))

@app.post("/api/v1/trading/routes")
async def sync_trading_execution_routes(payload: ExecutionRouteSyncPayload):
    try:
        records = []
        for record in payload.records:
            item = record.model_dump()
            item["workspace_id"] = item.get("workspace_id") or payload.workspace_id
            item["actor_id"] = item.get("actor_id") or payload.actor_id
            item["portfolio_id"] = item.get("portfolio_id") or payload.portfolio_id
            item["batch_id"] = item.get("batch_id") or payload.batch_id
            records.append(item)
        return {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            **sync_execution_route_records(records),
        }
    except MarketDataError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc))

@app.get("/api/v1/market/bigquery/assets")
async def market_bigquery_assets(q: Optional[str] = None, limit: int = 20):
    try:
        return {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            **search_bigquery_assets(query=q, limit=limit),
        }
    except MarketDataError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc))

@app.get("/api/v1/market/bigquery/assets/{symbol}")
async def market_bigquery_asset_profile(symbol: str, price_basis: str = "adjusted", recent_limit: int = 30):
    try:
        return {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            **load_bigquery_asset_profile(
                symbol=symbol,
                price_basis=price_basis,
                recent_limit=recent_limit,
            ),
        }
    except MarketDataError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc))

@app.get("/api/v1/market/bigquery/assets/{symbol}/history")
async def market_bigquery_asset_history(
    symbol: str,
    price_basis: str = "adjusted",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 365,
):
    try:
        return {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            **load_bigquery_asset_history(
                symbol=symbol,
                price_basis=price_basis,
                start_date=start_date,
                end_date=end_date,
                limit=limit,
            ),
        }
    except MarketDataError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc))

@app.post("/api/v1/portfolio/analyze")
async def analyze_portfolio(payload: PortfolioAnalyzePayload):
    try:
        result = analyze_portfolio_returns(
            weights_by_symbol=payload.weights_by_symbol,
            returns_by_symbol=payload.returns_by_symbol,
            benchmark_returns=payload.benchmark_returns,
            dates=payload.dates,
            mode=payload.mode,
            confidence_level=payload.confidence_level,
            risk_free_rate=payload.risk_free_rate,
        )
        return {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            **result,
        }
    except PortfolioEngineError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Portfolio analysis failed: {str(exc)}")

@app.post("/api/v1/portfolio/analyze-bigquery")
async def analyze_portfolio_from_bigquery(payload: PortfolioAnalyzeBigQueryPayload):
    try:
        market_input = load_portfolio_return_input(
            symbols=payload.weights_by_symbol.keys(),
            benchmark_symbol=payload.benchmark_symbol,
            start_date=payload.start_date,
            end_date=payload.end_date,
            price_basis=payload.price_basis,
            pricing_currency=payload.pricing_currency,
            currency_by_symbol=payload.currency_by_symbol,
        )
        result = analyze_portfolio_returns(
            weights_by_symbol=payload.weights_by_symbol,
            returns_by_symbol=market_input["returns_by_symbol"],
            benchmark_returns=market_input["benchmark_returns"],
            dates=market_input["dates"],
            mode=payload.mode,
            confidence_level=payload.confidence_level,
            risk_free_rate=payload.risk_free_rate,
        )
        return {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "marketData": market_input["metadata"],
            **result,
        }
    except MarketDataError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc))
    except PortfolioEngineError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"BigQuery portfolio analysis failed: {str(exc)}")

@app.post("/api/v1/portfolio/optimize")
async def optimize_portfolio(payload: PortfolioOptimizePayload):
    try:
        result = optimize_portfolio_weights(
            returns_by_symbol=payload.returns_by_symbol,
            symbols=payload.symbols,
            benchmark_returns=payload.benchmark_returns,
            dates=payload.dates,
            mode=payload.mode,
            optimization_mode=payload.optimization_mode,
            target_volatility=payload.target_volatility,
            confidence_level=payload.confidence_level,
            risk_free_rate=payload.risk_free_rate,
            sample_count=payload.sample_count,
            random_seed=payload.random_seed,
        )
        return {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            **result,
        }
    except PortfolioEngineError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Portfolio optimization failed: {str(exc)}")

@app.post("/api/v1/portfolio/optimize-bigquery")
async def optimize_portfolio_from_bigquery(payload: PortfolioOptimizeBigQueryPayload):
    try:
        market_input = load_portfolio_return_input(
            symbols=payload.symbols,
            benchmark_symbol=payload.benchmark_symbol,
            start_date=payload.start_date,
            end_date=payload.end_date,
            price_basis=payload.price_basis,
            pricing_currency=payload.pricing_currency,
            currency_by_symbol=payload.currency_by_symbol,
        )
        result = optimize_portfolio_weights(
            returns_by_symbol=market_input["returns_by_symbol"],
            symbols=payload.symbols,
            benchmark_returns=market_input["benchmark_returns"],
            dates=market_input["dates"],
            mode=payload.mode,
            optimization_mode=payload.optimization_mode,
            target_volatility=payload.target_volatility,
            confidence_level=payload.confidence_level,
            risk_free_rate=payload.risk_free_rate,
            sample_count=payload.sample_count,
            random_seed=payload.random_seed,
        )
        return {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "marketData": market_input["metadata"],
            **result,
        }
    except MarketDataError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc))
    except PortfolioEngineError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"BigQuery portfolio optimization failed: {str(exc)}")

@app.post("/api/v1/wealth/simulate")
async def simulate_wealth_trajectory(payload: SimulationPayload):
    try:
        t = payload.timeline
        f = payload.family
        tp = payload.tax_params
        p_info = payload.pension
        
        trajectory = []
        cur_bal = {a.name: a.value * 10000 for a in payload.assets}
        sub_to_cat = {a.name: a.type for a in payload.assets}
        rate_dict = {a.name: a.rate for a in payload.assets}
        
        if "預設現金" not in cur_bal:
            cur_bal["預設現金"] = 0.0
            sub_to_cat["預設現金"] = "現金"
            rate_dict["預設現金"] = 0.01

        cur_bal["退休金專戶"] = p_info.acct_bal_wan * 10000
        sub_to_cat["退休金專戶"] = "其他"
        rate_dict["退休金專戶"] = p_info.acct_roi / 100

        for h in payload.mortgages:
            if h.start < t.current_age:
                prop_name = f"房產_{h.name}"
                cur_bal[prop_name] = (h.total_price * 10000)
                sub_to_cat[prop_name] = "不動產"
                rate_dict[prop_name] = 0.0

        sim_ins = [ins.model_copy() for ins in payload.insurances]
        first_year_loan_pay_calc = 0.0
        accumulated_deficit = 0.0

        for age in range(t.current_age, t.life_expectancy + 1):
            yrs = age - t.current_age
            row_data = {"年紀": age}
            cur_house = 0.0; cur_debt = 0.0; item_mortgage_interest = 0.0
            current_mortgage_principal = 0.0; current_debt_principal = 0.0
            
            for h in payload.mortgages:
                if h.start <= age < h.start + h.years:
                    p_yrs = age - h.start
                    loan_yuan = h.loan_amount * 10000
                    m_rate = (h.rate / 100) / 12
                    g_yrs = h.grace; a_yrs = h.years - g_yrs
                    
                    current_rem_loan = 0.0
                    if p_yrs < g_yrs:
                        year_interest = loan_yuan * (h.rate / 100)
                        cur_house += year_interest
                        current_rem_loan = loan_yuan
                        if age == t.current_age: first_year_loan_pay_calc += year_interest
                        if h.claim_tax: item_mortgage_interest += year_interest / 10000
                    else:
                        amort_p_yrs = p_yrs - g_yrs
                        if h.method == "本金平均":
                            p_ann = loan_yuan / a_yrs if a_yrs > 0 else 0
                            current_rem_loan = max(0.0, loan_yuan - (p_ann * amort_p_yrs))
                            year_interest = max(0.0, current_rem_loan * (h.rate / 100))
                            cur_house += (p_ann + year_interest)
                            if age == t.current_age: first_year_loan_pay_calc += (p_ann + year_interest)
                            if h.claim_tax: item_mortgage_interest += year_interest / 10000
                        else:
                            months_total = a_yrs * 12; months_passed = amort_p_yrs * 12
                            pmt = (loan_yuan * m_rate * (1+m_rate)**months_total) / ((1+m_rate)**months_total - 1) if m_rate > 0 else loan_yuan / months_total
                            cur_house += pmt * 12
                            if age == t.current_age: first_year_loan_pay_calc += pmt * 12
                            if months_total > months_passed:
                                current_rem_loan = loan_yuan * (((1+m_rate)**months_total - (1+m_rate)**months_passed) / ((1+m_rate)**months_total - 1)) if m_rate > 0 else loan_yuan - (pmt * months_passed)
                                year_interest = current_rem_loan * (h.rate / 100)
                                if h.claim_tax: item_mortgage_interest += year_interest / 10000
                    
                    row_data[f"房貸_{h.name}"] = current_rem_loan / 10000
                    current_mortgage_principal += current_rem_loan
                else:
                    row_data[f"房貸_{h.name}"] = 0.0

            for d in payload.debts:
                if d.start <= age < d.start + d.years:
                    cur_debt += d.monthly_pay * 12
                    if age == t.current_age: first_year_loan_pay_calc += d.monthly_pay * 12
                    loan_amt_d = d.loan_amount * 10000
                    m_rate_d = (d.rate / 100) / 12
                    months_d = d.years * 12; months_passed = (age - d.start) * 12
                    current_rem_debt = 0.0
                    if months_d > months_passed:
                        if m_rate_d > 0: current_rem_debt = loan_amt_d * (((1+m_rate_d)**months_d - (1+m_rate_d)**months_passed) / ((1+m_rate_d)**months_d - 1))
                        else: current_rem_debt = loan_amt_d - ((loan_amt_d/months_d) * months_passed)
                    current_debt_principal += max(0.0, current_rem_debt)
                    row_data[f"信貸_{d.name}"] = max(0.0, current_rem_debt) / 10000
                else:
                    row_data[f"信貸_{d.name}"] = 0.0

            cur_extra_inc_gross = 0.0; cur_extra_inc_net_taxable = 0.0; total_9b_annual = 0.0
            for inc in payload.extra_incomes:
                annual_gross = inc.monthly_amt * 12
                cur_extra_inc_gross += annual_gross
                if "9B" in inc.type: total_9b_annual += annual_gross
                elif "9A" in inc.type: cur_extra_inc_net_taxable += annual_gross * 0.7
                elif "租賃" in inc.type: cur_extra_inc_net_taxable += annual_gross * 0.57
                else: cur_extra_inc_net_taxable += annual_gross
            if total_9b_annual > 180000: cur_extra_inc_net_taxable += (total_9b_annual - 180000)

            ins_premium_total = 0.0; ins_survival_total = 0.0; total_cv_wan = 0.0
            trigger_amt_base = 0.0; estate_cv_addition_wan = 0.0; insurance_payouts = {}

            for p in sim_ins:
                p_prem_yuan = p.premium * 10000
                p_surv_yuan = p.survival * 10000
                if age < (t.current_age + p.years):
                    ins_premium_total += p_prem_yuan
                    p.cv = (p.cv + p.premium) * (1 + p.irr)
                else: p.cv = p.cv * (1 + p.irr)
                
                p.db = max(p.db, p.cv)
                total_cv_wan += p.cv

                if age >= p.survival_age and p.survival > 0:
                    ins_survival_total += p_surv_yuan

                if p.app == '本人' and p.ins == '本人':
                    actual_bens = [p.custom_ben if b == "其他(自行輸入)" else b for b in p.ben]
                    is_same_person = (len(actual_bens) == 1 and actual_bens[0] == '本人')
                    if p.type in ["人壽保險", "年金保險"] and not is_same_person:
                        trigger_amt_base += max(0.0, p.db - AMT_INS_EXEMPT)
                    
                    if len(actual_bens) > 0:
                        if p.ben_allocation == "均分比例":
                            split_amt = (p.db * 10000) / len(actual_bens)
                            for b in actual_bens: insurance_payouts[b] = insurance_payouts.get(b, 0.0) + split_amt
                        else: insurance_payouts[actual_bens[0]] = insurance_payouts.get(actual_bens[0], 0.0) + (p.db * 10000)
                elif p.app == '本人':
                    estate_cv_addition_wan += p.cv

            temp_salary = 0.0; temp_pension = 0.0; temp_extra_inc = cur_extra_inc_gross
            temp_living_exp = 0.0; temp_pension_vol = 0.0; rent_saved = 0.0
            
            if age < t.retire_age:
                temp_salary = (payload.main_salary * 12 * ((1 + t.salary_growth)**yrs))
                if age >= p_info.annuity_start_age:
                    temp_pension = (p_info.annuity_m_amt_wan * 10000 * 12) * ((1 + t.inflation_rate)**(age - p_info.annuity_start_age))
                cur_inc = temp_salary + temp_extra_inc + temp_pension + ins_survival_total
                
                temp_living_exp = (payload.base_m_exp * 12) * ((1 + t.inflation_rate)**yrs)
                if payload.m_rent > 0 and any(h.replace_rent and age >= h.start for h in payload.mortgages):
                    rent_saved = (payload.m_rent * 12) * ((1 + t.inflation_rate)**yrs)
                
                temp_pension_vol = (p_info.vol_deduct_wan * 10000 * 12) * ((1 + t.salary_growth)**yrs)
                cur_invest = sum(a.monthly_add * 10000 * 12 for a in payload.assets if yrs < a.add_years)
                
                base_inflow = cur_inc - temp_living_exp + rent_saved
                current_year_net_inflow = base_inflow - cur_house - cur_debt - cur_invest - temp_pension_vol - ins_premium_total
                display_living_exp = temp_living_exp - rent_saved
            else:
                if age >= p_info.annuity_start_age:
                    temp_pension = (p_info.annuity_m_amt_wan * 10000 * 12) * ((1 + t.inflation_rate)**(age - p_info.annuity_start_age))
                cur_inc = temp_extra_inc + temp_pension + ins_survival_total
                
                required_annual_retire = ((payload.main_salary * 12) * ((1 + t.salary_growth) ** (t.retire_age - t.current_age))) * t.replacement_rate
                temp_living_exp = required_annual_retire * ((1 + t.inflation_rate)**(age - t.retire_age))
                display_living_exp = temp_living_exp
                current_year_net_inflow = cur_inc - temp_living_exp - cur_house - cur_debt - ins_premium_total

            if age == p_info.lump_sum_age and p_info.lump_sum_wan > 0:
                cur_bal["退休金專戶"] += (p_info.lump_sum_wan * 10000)

            for ev in payload.events:
                if ev.age <= age < ev.age + ev.duration:
                    amt = ev.amount
                    target = ev.target
                    if target == '預設現金流': current_year_net_inflow += amt
                    elif target == '➕ 建立全新資產' and amt > 0 and ev.new_asset:
                        nm = ev.new_asset["name"]
                        if nm not in cur_bal:
                            cur_bal[nm] = 0.0; sub_to_cat[nm] = ev.new_asset["type"]; rate_dict[nm] = ev.new_asset["rate"]
                        cur_bal[nm] += amt
                    elif target in cur_bal:
                        if amt > 0: cur_bal[target] += amt
                        else:
                            needed = abs(amt); avail = cur_bal[target]
                            if avail >= needed: cur_bal[target] -= needed
                            else: cur_bal[target] = 0.0; current_year_net_inflow -= (needed - avail)

            # --- 所得稅計算 ---
            is_spouse_alive = f.has_spouse and (f.sp_age + yrs < f.sp_life)
            tax_people = 1
            total_exemption = tp["exemption"] * 1.5 if age >= 70 else tp["exemption"]
            inc_tax_disabled_count = 0; ltc_count = 0; preschool_ded = 0.0; dependent_income_wan = 0.0; first_kid_done = False

            if is_spouse_alive:
                tax_people += 1
                total_exemption += tp["exemption"] * 1.5 if (f.sp_age + yrs) >= 70 else tp["exemption"]
                if f.sp_disabled: inc_tax_disabled_count += 1
                if f.sp_ltc: ltc_count += 1

            for k in f.kids:
                k_age_now = k.age + yrs
                if k_age_now <= k.dep_age and k_age_now < k.life:
                    tax_people += 1
                    total_exemption += tp["exemption"]
                    if k_age_now <= 6: 
                        preschool_ded += tp["preschool_1st"] if not first_kid_done else tp["preschool_2nd"]; first_kid_done = True
                    if k.disabled: inc_tax_disabled_count += 1
                    if k.ltc: ltc_count += 1

            if f.has_father and (f.fa_age + yrs < f.fa_life) and f.fa_claim_tax:
                tax_people += 1
                total_exemption += tp["exemption"] * 1.5 if (f.fa_age + yrs) >= 70 else tp["exemption"]
                dependent_income_wan += f.fa_tax_inc
                if f.fa_disabled: inc_tax_disabled_count += 1
                if f.fa_ltc: ltc_count += 1

            if f.has_mother and (f.mo_age + yrs < f.mo_life) and f.mo_claim_tax:
                tax_people += 1
                total_exemption += tp["exemption"] * 1.5 if (f.mo_age + yrs) >= 70 else tp["exemption"]
                dependent_income_wan += f.mo_tax_inc
                if f.mo_disabled: inc_tax_disabled_count += 1
                if f.mo_ltc: ltc_count += 1

            if f.has_grand and (f.gp_age + yrs < f.gp_life) and f.gp_claim_tax:
                tax_people += f.gp_count
                total_exemption += (tp["exemption"] * 1.5) * f.gp_count
                dependent_income_wan += f.gp_tax_inc
                inc_tax_disabled_count += f.gp_disabled_count
                ltc_count += f.gp_ltc_count

            for s in f.siblings:
                if s.age + yrs < s.life and s.claim_tax:
                    tax_people += 1
                    total_exemption += tp["exemption"]
                    dependent_income_wan += s.tax_inc
                    if s.disabled: inc_tax_disabled_count += 1
                    if s.ltc: ltc_count += 1

            user_salary_wan = (payload.main_salary * 12 * ((1 + t.salary_growth)**yrs)) / 10000 if age < t.retire_age else 0.0
            sp_salary_wan = (f.sp_salary * ((1 + t.salary_growth)**yrs)) if is_spouse_alive and age < t.retire_age else 0.0
            biz_other_wan = cur_extra_inc_net_taxable / 10000
            
            if age >= t.retire_age and age >= p_info.annuity_start_age:
                pension_inc_wan = (p_info.annuity_m_amt_wan * 12) * ((1 + t.inflation_rate)**(age - p_info.annuity_start_age))
                biz_other_wan += max(0.0, pension_inc_wan - tp["retire_exempt"])

            sp_other_wan = f.sp_other_inc * ((1 + t.inflation_rate)**yrs) if is_spouse_alive else 0.0
            dependent_income_wan = dependent_income_wan * ((1 + t.inflation_rate)**yrs)

            interest_inc = 0.0; dividend_inc = 0.0; overseas_inc = 0.0; amt_ins_inc = 0.0
            for nm, val in cur_bal.items():
                if val <= 0: continue
                a_yield = (val / 10000) * rate_dict.get(nm, 0.0)
                t_type = "資本利得/不計稅"
                for a in payload.assets:
                    if a.name == nm: t_type = a.tax_type; break
                if "利息" in t_type: interest_inc += a_yield
                elif "股利" in t_type: dividend_inc += a_yield
                elif "海外" in t_type: overseas_inc += a_yield
                elif "保單" in t_type: amt_ins_inc += a_yield

            savings_deduction = min(interest_inc, tp["savings_limit"])
            taxable_interest = interest_inc - savings_deduction

            std_deduction = tp["std_deduction"] * (2 if is_spouse_alive else 1)
            item_ins = min((payload.m_insurance * 12) / 10000, tp["ins_limit"] * tax_people)
            item_rent = min((payload.m_rent * 12) / 10000, tp["rent_limit"]) if payload.m_rent > 0 and rent_saved == 0 else 0
            item_mortgage_final = min(max(0.0, item_mortgage_interest - savings_deduction), tp["mortgage_limit"])
            item_housing = max(item_rent, item_mortgage_final)
            
            total_itemized = item_ins + item_housing + tp["manual_itemized"]
            final_deduction = max(std_deduction, total_itemized)
            chosen_ded_type = "列舉" if total_itemized > std_deduction else "標準"

            total_special_ded = savings_deduction + (inc_tax_disabled_count * tp["inc_disabled_ded"]) + (ltc_count * tp["ltc_deduction"]) + preschool_ded
            basic_living_diff = max(0.0, (tax_people * tp["basic_living"]) - (total_exemption + final_deduction + total_special_ded))

            user_sal_ded = min(user_salary_wan, tp["salary_deduction"])
            sp_sal_ded = min(sp_salary_wan, tp["salary_deduction"]) if is_spouse_alive else 0.0
            total_other_inc_ex_div = biz_other_wan + sp_other_wan + dependent_income_wan + taxable_interest

            def calc_tax_scenarios(add_dividend):
                current_other_inc = total_other_inc_ex_div + (dividend_inc if add_dividend else 0)
                net_joint = max(0.0, user_salary_wan + sp_salary_wan + current_other_inc - total_exemption - final_deduction - total_special_ded - basic_living_diff - user_sal_ded - sp_sal_ded)
                tax_joint = calc_tw_tax(net_joint)

                if is_spouse_alive:
                    net_user_sal_sep = max(0.0, user_salary_wan - tp["exemption"] - user_sal_ded)
                    tax_user_sal_sep = calc_tw_tax(net_user_sal_sep)
                    rest_net_B = max(0.0, sp_salary_wan + current_other_inc - (total_exemption - tp["exemption"]) - final_deduction - total_special_ded - basic_living_diff - sp_sal_ded)
                    tax_B_total = tax_user_sal_sep + calc_tw_tax(rest_net_B)

                    net_sp_sal_sep = max(0.0, sp_salary_wan - tp["exemption"] - sp_sal_ded)
                    tax_sp_sal_sep = calc_tw_tax(net_sp_sal_sep)
                    rest_net_C = max(0.0, user_salary_wan + current_other_inc - (total_exemption - tp["exemption"]) - final_deduction - total_special_ded - basic_living_diff - user_sal_ded)
                    tax_C_total = tax_sp_sal_sep + calc_tw_tax(rest_net_C)
                    return min(tax_joint, tax_B_total, tax_C_total), net_joint
                return tax_joint, net_joint

            best_tax_with_div, joint_net_inc = calc_tax_scenarios(add_dividend=True)
            tax_scenario_1 = max(0.0, best_tax_with_div - min(dividend_inc * 0.085, 8.0))
            best_tax_no_div, _ = calc_tax_scenarios(add_dividend=False)
            tax_scenario_2 = best_tax_no_div + (dividend_inc * 0.28)
            
            general_tax = min(tax_scenario_1, tax_scenario_2)
            chosen_div_type = "合併計稅 (8.5%抵減)" if tax_scenario_1 <= tax_scenario_2 else "分開計稅 (28%)"

            amt_overseas = overseas_inc if overseas_inc >= 100.0 else 0
            basic_income = joint_net_inc + amt_overseas + amt_ins_inc
            amt_tax = max(0.0, basic_income - tp["amt_threshold"]) * 0.2
            
            final_income_tax_wan = max(general_tax, amt_tax)
            current_year_net_inflow -= (final_income_tax_wan * 10000)

            # 結算與資產滾存
            if age < t.retire_age:
                for a in payload.assets:
                    if a.monthly_add > 0 and yrs < a.add_years:
                        cur_bal[a.name] += a.monthly_add * 10000 * 12
                cur_bal["退休金專戶"] += (p_info.acct_add_wan * 10000 * 12) * ((1 + t.salary_growth)**yrs)
            
            for h in payload.mortgages:
                if age == h.start:
                    prop_name = f"房產_{h.name}"
                    cur_bal[prop_name] = (h.total_price * 10000)
                    sub_to_cat[prop_name] = "不動產"
                    rate_dict[prop_name] = 0.0
                    down_payment = (h.total_price - h.loan_amount) * 10000
                    current_year_net_inflow -= down_payment

            if current_year_net_inflow > 0 and accumulated_deficit > 0:
                payoff = min(current_year_net_inflow, accumulated_deficit)
                accumulated_deficit -= payoff
                current_year_net_inflow -= payoff

            if current_year_net_inflow > 0:
                cash_accs = [k for k, v in sub_to_cat.items() if v == "現金"]
                if cash_accs: cur_bal[cash_accs[0]] += current_year_net_inflow
                else: cur_bal["預設現金"] += current_year_net_inflow
            elif current_year_net_inflow < 0:
                deficit = abs(current_year_net_inflow)
                for cat in LIQUIDATION_ORDER:
                    if deficit <= 0: break
                    avail_subs = [k for k, v in sub_to_cat.items() if v == cat and cur_bal.get(k, 0) > 0]
                    for sub in avail_subs:
                        if deficit <= 0: break
                        take = min(cur_bal[sub], deficit)
                        cur_bal[sub] -= take
                        deficit -= take
                if deficit > 0: accumulated_deficit += deficit

            # 🔥 完美對齊：補回所有分類與獨立資產的數值
            row_data["累積財務缺口"] = accumulated_deficit / 10000

            cat_totals = {c: 0.0 for c in ["現金", "保單", "基金", "債券", "股票", "其他", "不動產"]}
            total_a = 0.0
            for nm, val in cur_bal.items():
                val *= (1 + rate_dict.get(nm, 0.0))
                cur_bal[nm] = val
                cat = sub_to_cat.get(nm, "其他")
                if cat in cat_totals: cat_totals[cat] += val
                row_data[nm] = val
                total_a += val
                
            for c, v in cat_totals.items():
                row_data[c] = v
                
            total_a_wan = (total_a / 10000) + total_cv_wan
            row_data["總資產"] = total_a_wan
            
            total_liab_wan = (current_mortgage_principal + current_debt_principal + accumulated_deficit) / 10000
            row_data["總負債"] = total_liab_wan
            row_data["淨資產"] = total_a_wan - total_liab_wan

            total_a_wan_estate = total_a_wan + estate_cv_addition_wan

            ded_details = {"免稅額": TAX_EXEMPT_VAL, "喪葬費": FUNERAL_FEE}
            ded_total = TAX_EXEMPT_VAL + FUNERAL_FEE
            alive_dict = {"配偶": [], "子女": [], "父母": [], "兄弟姊妹": [], "祖父母": []}

            if is_spouse_alive:
                alive_dict["配偶"].append({"name": "配偶"})
                ded_total += SPOUSE_DED; ded_details["配偶扣除額"] = SPOUSE_DED
                if f.sp_disabled: ded_total += ESTATE_DISABLED_DED; ded_details["身障特別扣除額"] = ded_details.get("身障特別扣除額", 0) + ESTATE_DISABLED_DED

            if f.has_father and (f.fa_age + yrs < f.fa_life):
                alive_dict["父母"].append({"name": "父親"})
                ded_total += PARENT_DED; ded_details["父母扣除額"] = ded_details.get("父母扣除額", 0) + PARENT_DED
                if f.fa_disabled: ded_total += ESTATE_DISABLED_DED; ded_details["身障特別扣除額"] = ded_details.get("身障特別扣除額", 0) + ESTATE_DISABLED_DED

            if f.has_mother and (f.mo_age + yrs < f.mo_life):
                alive_dict["父母"].append({"name": "母親"})
                ded_total += PARENT_DED; ded_details["父母扣除額"] = ded_details.get("父母扣除額", 0) + PARENT_DED
                if f.mo_disabled: ded_total += ESTATE_DISABLED_DED; ded_details["身障特別扣除額"] = ded_details.get("身障特別扣除額", 0) + ESTATE_DISABLED_DED

            if f.has_grand and (f.gp_age + yrs < f.gp_life):
                for g_idx in range(int(f.gp_count)): alive_dict["祖父母"].append({"name": f"祖父母 {g_idx+1}"})
                if f.gp_dependent:
                    amt = f.gp_count * KID_DED
                    ded_total += amt; ded_details["受扶養祖父母扣除"] = amt
                if f.gp_disabled_count > 0:
                    amt = f.gp_disabled_count * ESTATE_DISABLED_DED
                    ded_total += amt; ded_details["身障特別扣除額"] = ded_details.get("身障特別扣除額", 0) + amt

            for k_idx, k in enumerate(f.kids):
                sim_k_age = k.age + yrs
                if sim_k_age < k.life:
                    alive_dict["子女"].append({"name": k.id})
                    amt = KID_DED + max(0.0, (18 - sim_k_age) * KID_YEAR_ADD)
                    ded_total += amt; ded_details["子女扣除額"] = ded_details.get("子女扣除額", 0) + amt
                    if k.disabled: ded_total += ESTATE_DISABLED_DED; ded_details["身障特別扣除額"] = ded_details.get("身障特別扣除額", 0) + ESTATE_DISABLED_DED

            for s_idx, s in enumerate(f.siblings):
                sim_s_age = s.age + yrs
                if sim_s_age < s.life:
                    alive_dict["兄弟姊妹"].append({"name": s.id})
                    if s.dependent:
                        amt = KID_DED + max(0.0, (18 - sim_s_age) * KID_YEAR_ADD)
                        ded_total += amt; ded_details["受扶養兄弟姊妹扣除"] = ded_details.get("受扶養兄弟姊妹扣除", 0) + amt
                    if s.disabled: ded_total += ESTATE_DISABLED_DED; ded_details["身障特別扣除額"] = ded_details.get("身障特別扣除額", 0) + ESTATE_DISABLED_DED

            sp_claim_wan = 0.0
            if is_spouse_alive:
                r = f.sp_rate / 100
                w1 = f.sp_wealth * ((1+r)**yrs)
                w2 = f.sp_add * (((1+r)**yrs - 1) / r) if r > 0 else f.sp_add * yrs
                sp_w_sim = w1 + w2
                base_claim_wan = max(0.0, total_a_wan_estate - total_liab_wan - min(f.daily_tool_val, HOUSEHOLD_LIMIT) - min(f.job_tool_val, TOOL_LIMIT))
                if base_claim_wan > sp_w_sim: sp_claim_wan = (base_claim_wan - sp_w_sim) / 2

            taxable_net_wan = max(0.0, total_a_wan_estate - total_liab_wan - min(f.daily_tool_val, HOUSEHOLD_LIMIT) - min(f.job_tool_val, TOOL_LIMIT) - sp_claim_wan - ded_total)
            if taxable_net_wan <= 5621: tax_wan = taxable_net_wan * 0.1
            elif taxable_net_wan <= 11242: tax_wan = 562.1 + (taxable_net_wan - 5621) * 0.15
            else: tax_wan = 562.1 + 843.15 + (taxable_net_wan - 11242) * 0.2

            legal_inherit_base = max(0.0, total_a_wan_estate - total_liab_wan - sp_claim_wan)

            # 🔥 完美對齊：字典的 Key 名稱與運算邏輯徹底還原 Streamlit 版本
            row_data.update({
                "收_主業薪資": temp_salary,
                "收_其他所得": temp_extra_inc,
                "收_年金收入": temp_pension,
                "收_保險還本": ins_survival_total, 
                "支_生活開銷": display_living_exp,
                "支_保險費": ins_premium_total,    
                "支_房貸繳款": cur_house,
                "支_信貸繳款": cur_debt,
                "支_自提勞退": temp_pension_vol,
                "支_所得稅金": final_income_tax_wan * 10000,
                
                "保單總價值": total_cv_wan, 
                "保單理賠分配": insurance_payouts, 
                "身故觸發受益人AMT_預估": trigger_amt_base, 
                
                "預估遺產稅": tax_wan, 
                "差額分配請求權": sp_claim_wan, 
                "扣除額總計": ded_total,
                "民法繼承基數": legal_inherit_base, 
                "可分配餘額": total_a_wan_estate - total_liab_wan - tax_wan - sp_claim_wan, 
                "扣除額明細": ded_details, 
                "存活字典": alive_dict,
                "稅_應納稅金": final_income_tax_wan, 
                "稅_申報人數": tax_people, 
                "稅_基本差額": basic_living_diff,
                "稅_免稅額": total_exemption, 
                "稅_扣除額": final_deduction, 
                "扣除額類型": chosen_ded_type,
                "股利計稅": chosen_div_type, 
                "觸發AMT": "是" if amt_tax > general_tax else "否",
                "稅_綜合所得總額": user_salary_wan + sp_salary_wan + total_other_inc_ex_div + dividend_inc,
                "稅_特扣總計": total_special_ded + user_sal_ded + sp_sal_ded,
                "稅_綜合所得淨額": joint_net_inc, 
                "稅_一般應納稅額": general_tax,
                "稅_AMT基本所得額": basic_income, 
                "稅_AMT稅額": amt_tax,

                "第一年預估房貸支出": first_year_loan_pay_calc,
                "第一年預估稅金": final_income_tax_wan * 10000
            })
            trajectory.append(row_data)

        return {
            "trajectory": trajectory,
            "first_year_loan_pay": first_year_loan_pay_calc,
            "first_year_tax": trajectory[0]["第一年預估稅金"] if trajectory else 0.0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"核心引擎精算異常: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
