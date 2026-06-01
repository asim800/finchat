# Monte Carlo Simulation API Plan

## Overview

Expose the `run_mc.py` Monte Carlo simulation functionality as a REST API via FastAPI.

**Phase 1 (Current):** Backend API only in `port/src/api/` - implement and test
**Phase 2 (Later):** Frontend integration with Next.js

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/mc/simulate` | POST | Run single MC simulation |
| `/api/mc/sweep` | POST | Run single-parameter sweep |
| `/api/mc/grid-sweep` | POST | Run 2D grid sweep |
| `/api/mc/config/schema` | GET | Get configuration JSON schema |
| `/api/mc/config/sweep-params` | GET | Get sweepable parameters list |
| `/api/mc/config/validate` | POST | Validate config before running |
| `/api/mc/jobs/{job_id}` | GET | Get async job status/results |
| `/api/mc/jobs/{job_id}/cancel` | POST | Cancel running job |
| `/health` | GET | Health check |

---

## Backend Implementation (FastAPI)

### New Files to Create

```
src/api/
├── __init__.py
├── main.py                    # FastAPI app with MC endpoints
├── schemas/
│   ├── __init__.py
│   ├── config.py              # MCConfigRequest, validation schemas
│   ├── responses.py           # Response schemas (FanChartData, etc.)
│   └── jobs.py                # JobStatus schema
├── services/
│   ├── __init__.py
│   ├── simulation.py          # Wrapper around run_mc.py functions
│   ├── sweep.py               # Parameter sweep service
│   └── jobs.py                # Async job management
└── utils/
    ├── __init__.py
    └── recharts_formatter.py  # Transform numpy arrays → Recharts format
```

### Key Pydantic Schemas

**Request Schema (`schemas/config.py`):**
```python
class TickerWeight(BaseModel):
    symbol: str
    weight: float  # 0-1

class MCConfigRequest(BaseModel):
    # Required
    initial_portfolio_value: float
    retirement_date: str  # YYYY-MM-DD
    simulation_horizon_years: int
    tickers: List[TickerWeight]

    # Optional with defaults
    start_date: str = "2005-01-01"
    end_date: str = "2025-01-01"
    num_simulations: int = 1000
    simulation_frequency: str = "weekly"
    sampling_method: str = "both"  # parametric, bootstrap, both
    seed: int = 42

    # Accumulation
    contribution_amount: float = 0
    contribution_frequency: str = "biweekly"
    employer_match_rate: float = 0

    # Decumulation
    withdrawal_strategy: str = "constant_inflation_adjusted"
    annual_withdrawal_amount: float = 40000
    inflation_rate: float = 0.03

    # Async mode
    async_mode: bool = False
```

**Response Schema (`schemas/responses.py`):**
```python
class TimeSeriesPoint(BaseModel):
    """Single point for Recharts LineChart/AreaChart"""
    period: int
    date: str
    p5: float
    p25: float
    p50: float
    p75: float
    p95: float

class FanChartData(BaseModel):
    """Fan chart data for one phase + sampling method"""
    data: List[TimeSeriesPoint]
    phase: str  # accumulation, decumulation
    sampling_method: str  # parametric, bootstrap

class MCSimulationResponse(BaseModel):
    success: bool
    metadata: SimulationMetadata

    # Recharts-ready data
    accumulation: Dict[str, FanChartData]  # {parametric: ..., bootstrap: ...}
    decumulation: Dict[str, FanChartData]

    # Summary stats
    success_rates: Dict[str, float]
    percentiles_at_retirement: Dict[str, Dict[str, float]]
    percentiles_at_horizon: Dict[str, Dict[str, float]]

    # Async job info
    job_id: Optional[str] = None
    status: str = "completed"
```

---

## Frontend Implementation (Next.js) - Phase 2

### New Files to Create

```
frontend/src/lib/
├── mc-client.ts               # MC API client (like fastapi-client.ts)
└── mc-types.ts                # TypeScript interfaces

frontend/src/components/mc/
├── MCSimulationForm.tsx       # Config form with validation
├── MCFanChart.tsx             # Recharts AreaChart wrapper
├── MCSuccessGauge.tsx         # Success rate display
├── MCSweepChart.tsx           # Parameter sweep visualization
├── MCHeatmap.tsx              # Grid sweep heatmap
└── MCResultsPanel.tsx         # Combined results display
```

### TypeScript Interfaces (`mc-types.ts`)

```typescript
export interface TickerWeight {
  symbol: string;
  weight: number;
}

export interface MCConfigRequest {
  initial_portfolio_value: number;
  retirement_date: string;
  simulation_horizon_years: number;
  tickers: TickerWeight[];
  // ... other fields
}

export interface TimeSeriesPoint {
  period: number;
  date: string;
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
}

export interface MCSimulationResponse {
  success: boolean;
  metadata: SimulationMetadata;
  accumulation: Record<string, { data: TimeSeriesPoint[] }>;
  decumulation: Record<string, { data: TimeSeriesPoint[] }>;
  success_rates: Record<string, number>;
  job_id?: string;
  status: string;
}
```

### API Client (`mc-client.ts`)

```typescript
class MCClient {
  private baseUrl = process.env.NEXT_PUBLIC_MC_SERVICE_URL || 'http://localhost:8001';

  async runSimulation(config: MCConfigRequest): Promise<MCSimulationResponse>;
  async runSweep(request: ParameterSweepRequest): Promise<ParameterSweepResponse>;
  async runGridSweep(request: GridSweepRequest): Promise<GridSweepResponse>;
  async getJobStatus(jobId: string): Promise<JobStatus>;
  async getSweepParams(): Promise<SweepParamInfo[]>;
  async validateConfig(config: MCConfigRequest): Promise<ValidationResult>;

  // Poll helper
  async pollJobUntilComplete(jobId: string, onProgress?: Function): Promise<JobStatus>;
}

export const mcClient = new MCClient();
```

---

## Data Flow

```
Frontend Form → MCConfigRequest → FastAPI /api/mc/simulate
                                        ↓
                              Convert to SystemConfig
                                        ↓
                              run_mc_simulation()
                                        ↓
                              numpy arrays (num_sims × periods)
                                        ↓
                              recharts_formatter.py
                                        ↓
                              MCSimulationResponse (JSON)
                                        ↓
Frontend ← Recharts AreaChart ← TimeSeriesPoint[]
```

---

## Implementation Steps

### Phase 1: Backend Core (FastAPI) - CURRENT FOCUS

1. **Create `src/api/` package structure**
2. **Implement Pydantic schemas** in `schemas/`
3. **Create simulation service** wrapping `run_mc.py` functions
4. **Implement Recharts formatter** to transform numpy → JSON
5. **Create FastAPI endpoints** for `/api/mc/simulate`
6. **Add config validation endpoint**
7. **Implement parameter sweep service**
8. **Add sweep endpoints** (`/sweep`, `/grid-sweep`)
9. **Add async job management** for long-running sweeps
10. **Add job status/cancel endpoints**
11. **Test all endpoints via Swagger UI**

### Phase 2: Frontend (Later)

12. **Create TypeScript interfaces** (`mc-types.ts`)
13. **Implement API client** (`mc-client.ts`)
14. **Add to unified-analysis-service** integration
15. **Create MCSimulationForm** with validation
16. **Create MCFanChart** (Recharts AreaChart)
17. **Create sweep/grid visualizations**
18. **Create MCResultsPanel** combining all
19. **Add error handling and loading states**

---

## Critical Files to Modify/Create

### Backend (Python) - in `port/src/api/`
| File | Action |
|------|--------|
| `src/api/__init__.py` | Create - Package init |
| `src/api/main.py` | Create - FastAPI app with CORS |
| `src/api/schemas/__init__.py` | Create - Schemas package |
| `src/api/schemas/config.py` | Create - Request schemas |
| `src/api/schemas/responses.py` | Create - Response schemas |
| `src/api/schemas/jobs.py` | Create - Async job schemas |
| `src/api/services/__init__.py` | Create - Services package |
| `src/api/services/simulation.py` | Create - MC service wrapper |
| `src/api/services/sweep.py` | Create - Sweep service |
| `src/api/services/jobs.py` | Create - Job management |
| `src/api/utils/__init__.py` | Create - Utils package |
| `src/api/utils/recharts_formatter.py` | Create - Data transformer |
| `pyproject.toml` | Modify - Add fastapi, uvicorn deps |

### Frontend (TypeScript) - Phase 2
| File | Purpose |
|------|---------|
| `mc-types.ts` | TypeScript interfaces for all API types |
| `mc-client.ts` | API client class with all methods |

---

## Recharts Data Format Example

The API returns data directly consumable by Recharts:

```json
{
  "accumulation": {
    "parametric": {
      "data": [
        {"period": 0, "date": "2025-10-01", "p5": 1000000, "p25": 1000000, "p50": 1000000, "p75": 1000000, "p95": 1000000},
        {"period": 52, "date": "2026-10-01", "p5": 980000, "p25": 1050000, "p50": 1120000, "p75": 1200000, "p95": 1350000}
      ]
    }
  }
}
```

Frontend usage:
```tsx
<AreaChart data={response.accumulation.parametric.data}>
  <Area dataKey="p95" fill="#e3f2fd" />
  <Area dataKey="p75" fill="#90caf9" />
  <Area dataKey="p50" fill="#42a5f5" stroke="#1976d2" />
  <Area dataKey="p25" fill="#90caf9" />
  <Area dataKey="p5" fill="#e3f2fd" />
</AreaChart>
```

---

## Async Job Handling

For long-running simulations (>1000 sims, sweeps):

1. Client sends `async_mode: true`
2. Server returns immediately with `job_id`
3. Client polls `/api/mc/jobs/{job_id}` for progress
4. When `status: "completed"`, result contains full response

```typescript
// Frontend usage
const { job_id } = await mcClient.runSimulation({ ...config, async_mode: true });
const result = await mcClient.pollJobUntilComplete(job_id, (progress) => {
  setProgress(progress * 100);
});
```

---

## Notes

- Keep existing `run_mc.py` CLI intact - API wraps the same functions
- Use Redis for job storage in production (in-memory dict for dev)
- CORS configured for Next.js frontend origin
- All matplotlib visualization logic stays in `run_mc.py` for CLI use
- API returns raw data; frontend renders with Recharts

---

## Run the API

```bash
cd /home/saahmed1/coding/python/fin/port
uv run uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8001
```

API docs at: http://localhost:8001/docs

---

## Testing the Backend

After implementing, test via:

1. **Swagger UI**: http://localhost:8001/docs
2. **curl examples**:
```bash
# Health check
curl http://localhost:8001/health

# Get sweep params
curl http://localhost:8001/api/mc/config/sweep-params

# Run simulation
curl -X POST http://localhost:8001/api/mc/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "initial_portfolio_value": 1000000,
    "retirement_date": "2034-01-01",
    "simulation_horizon_years": 20,
    "tickers": [
      {"symbol": "SPY", "weight": 0.6},
      {"symbol": "AGG", "weight": 0.4}
    ],
    "num_simulations": 100
  }'
```
