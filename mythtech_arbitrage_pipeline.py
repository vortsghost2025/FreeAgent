"""
MYTH-TECH ARBITRAGE PIPELINE
Integrates all functional layers and agents into the arbitrage engine
"""

from signal_layer import SignalLayer
from validation_layer import ValidationLayer
from risk_layer import RiskLayer
from execution_layer import ExecutionLayer
from post_trade_layer import PostTradeLayer
from mythtech_agents import Spreadseer, SlippageWarden, LatencyDragonfly, CircuitOracle, LedgerTitan

class MythTechArbitragePipeline:
    def __init__(self, config):
        self.signal_layer = SignalLayer()
        self.validation_layer = ValidationLayer()
        self.risk_layer = RiskLayer()
        self.execution_layer = ExecutionLayer()
        self.post_trade_layer = PostTradeLayer()
        # Instantiate myth-tech agents
        self.spreadseer = Spreadseer()
        self.slippage_warden = SlippageWarden()
        self.latency_dragonfly = LatencyDragonfly()
        self.circuit_oracle = CircuitOracle()
        self.ledger_titan = LedgerTitan()
        self.config = config
        self.account_balance = config.get('account_balance', 10000)
        self.risk_per_trade = config.get('risk_per_trade', 0.01)

    def process_market_data(self, market_data):
        # 1. Signal Layer: Detect opportunities
        opportunities = self.signal_layer.detect_cross_exchange_spreads(market_data)
        # 2. Validation Layer: Filter by fees/slippage/liquidity/venue
        validated = [opp for opp in opportunities if self.validation_layer.validate_fees_slippage(opp)]
        # 3. Risk Layer: Exposure, correlation, sizing
        approved = []
        for opp in validated:
            if self.risk_layer.check_exposure_limits(opp, self.account_balance):
                opp['position_size'] = self.risk_layer.calculate_position_size(opp, self.account_balance, self.risk_per_trade)
                approved.append(opp)
        # 4. Execution Layer: Decide and execute
        results = []
        for opp in approved:
            plan = self.execution_layer.decide_execution_strategy(opp)
            result = self.execution_layer.execute_trade_plan(plan)
            results.append(result)
        # 5. Post-Trade Layer: Reconcile and learn
        pnl = self.post_trade_layer.reconcile_pnl(results)
        errors = self.post_trade_layer.analyze_error_patterns(results)
        latency = self.post_trade_layer.track_latency_stats(results)
        # Ledger Titan records
        for res in results:
            self.ledger_titan.record(res)
        return {
            'executed_trades': len(results),
            'pnl': pnl,
            'errors': errors,
            'latency': latency
        }
