# Arbitrage Engine Integration Notes

## Dependencies
- Python 3.8+
- ccxt (pip install ccxt)
- numpy (pip install numpy)

## Configuration
- Add exchange API keys in your environment or ccxt config
- Update `arbitrage_engine.py` config for exchanges, account balance, and risk parameters

## Usage
- Run `arbitrage_engine.py` as a standalone module or integrate into your main trading loop
- Ensure orchestrator and task queue are initialized before starting arbitrage monitoring

## Safety
- Start with paper trading mode (`paper_trading: True`)
- Review logs for performance and errors
- Tune scan frequency and risk limits as needed

## Integration Points
- ArbitrageOrchestrator is imported in OrchestratorAgent
- TaskQueue registers arbitrage handler for FEDERATION_SYNC tasks
- Existing agents (market analyzer, risk manager, executor) are leveraged for execution

---
For production/live trading, add robust error handling, API key management, and compliance checks.
