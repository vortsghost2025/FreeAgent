"""
ARBITRAGE_ENGINE.PY - High-Frequency Arbitrage Implementation
Integrates with your existing multi-agent ensemble architecture
"""

import asyncio
import time
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum
import ccxt  # Cryptocurrency Exchange Library
import numpy as np

from agents.orchestrator import OrchestratorAgent
from agents.market_analyzer import MarketAnalysisAgent
from agents.risk_manager import RiskManagementAgent
from agents.executor import ExecutionAgent
from task_queue import TaskQueue, TaskType, TaskPriority


class ArbitrageType(Enum):
    CROSS_EXCHANGE = "cross_exchange"
    TRIANGULAR = "triangular"
    SPOT_FUTURES = "spot_futures"
    CROSS_CURRENCY = "cross_currency"


@dataclass
class ArbitrageOpportunity:
    """Represents an arbitrage opportunity"""
    opportunity_id: str
    arbitrage_type: ArbitrageType
    spread_percentage: float
    buy_exchange: str
    sell_exchange: str
    trading_pair: str
    buy_price: float
    sell_price: float
    quantity: float
    estimated_profit: float
    transaction_cost: float
    time_to_execute: float
    confidence_score: float


class ArbitrageDetector:
    """Detects arbitrage opportunities across exchanges"""
    
    def __init__(self, exchanges: List[str]):
        self.exchanges = {}
        self.min_spread_threshold = 0.005  # 0.5% minimum spread
        self.transaction_fee = 0.001  # 0.1% per transaction
        
        # Initialize exchanges
        for ex_name in exchanges:
            exchange_class = getattr(ccxt, ex_name.lower())()
            self.exchanges[ex_name] = exchange_class
    
    def detect_cross_exchange_arbitrage(self, symbol: str) -> Optional[ArbitrageOpportunity]:
        """Detect cross-exchange arbitrage opportunities"""
        prices = {}
        
        # Fetch current prices from all exchanges
        for name, exchange in self.exchanges.items():
            try:
                ticker = exchange.fetch_ticker(symbol)
                prices[name] = {
                    'bid': ticker['bid'],
                    'ask': ticker['ask'],
                    'last': ticker['last']
                }
            except Exception as e:
                print(f"Error fetching {symbol} from {name}: {e}")
        
        if len(prices) < 2:
            return None
        
        # Find highest bid and lowest ask
        highest_bid = max(prices.items(), key=lambda x: x[1]['bid'])
        lowest_ask = min(prices.items(), key=lambda x: x[1]['ask'])
        
        buy_exchange, buy_data = lowest_ask
        sell_exchange, sell_data = highest_bid
        
        # Calculate potential spread
        spread = (sell_data['bid'] - buy_data['ask']) / buy_data['ask']
        net_spread = spread - (2 * self.transaction_fee)  # Account for fees on both sides
        
        if net_spread > self.min_spread_threshold:
            # Calculate optimal quantity based on available liquidity
            min_quantity = min(buy_data['ask'], sell_data['bid'])  # Simplified
            
            opportunity = ArbitrageOpportunity(
                opportunity_id=f"arb_{int(time.time())}",
                arbitrage_type=ArbitrageType.CROSS_EXCHANGE,
                spread_percentage=net_spread * 100,
                buy_exchange=buy_exchange,
                sell_exchange=sell_exchange,
                trading_pair=symbol,
                buy_price=buy_data['ask'],
                sell_price=sell_data['bid'],
                quantity=min_quantity,
                estimated_profit=(net_spread * min_quantity * buy_data['ask']),
                transaction_cost=2 * self.transaction_fee,
                time_to_execute=0.1,  # Estimated execution time in seconds
                confidence_score=min(1.0, net_spread / 0.02)  # Scale confidence with spread
            )
            
            return opportunity
        
        return None


class ArbitrageOrchestrator:
    """Enhanced orchestrator for arbitrage operations"""
    
    def __init__(self, config: Dict[str, Any]):
        self.orchestrator = OrchestratorAgent(config.get('orchestrator', {}))
        self.arbitrage_detector = ArbitrageDetector(config.get('exchanges', []))
        self.task_queue = TaskQueue(max_workers=config.get('max_workers', 4))
        self.active_opportunities = {}
        self.performance_metrics = {
            'total_opportunities': 0,
            'executed_trades': 0,
            'total_profit': 0.0,
            'avg_execution_time': 0.0
        }
        
        # Register arbitrage-specific handlers
        self.task_queue.register_handler(TaskType.FEDERATION_SYNC, self._handle_arbitrage_task)
    
    async def monitor_arbitrage_opportunities(self, symbols: List[str]):
        """Continuously monitor for arbitrage opportunities"""
        while True:
            start_time = time.time()
            
            for symbol in symbols:
                opportunity = self.arbitrage_detector.detect_cross_exchange_arbitrage(symbol)
                
                if opportunity and opportunity.opportunity_id not in self.active_opportunities:
                    # Submit arbitrage opportunity as high-priority task
                    task_id = self.task_queue.submit_task(
                        task_type=TaskType.FEDERATION_SYNC,  # Repurposed for arbitrage
                        payload={
                            'opportunity': opportunity,
                            'timestamp': time.time()
                        },
                        priority=TaskPriority.CRITICAL
                    )
                    
                    self.active_opportunities[opportunity.opportunity_id] = {
                        'opportunity': opportunity,
                        'task_id': task_id,
                        'submitted_at': time.time()
                    }
                    
                    print(f"🔍 ARBITRAGE OPPORTUNITY FOUND: {opportunity.trading_pair} "
                          f"Spread: {opportunity.spread_percentage:.3f}% "
                          f"Profit: ${opportunity.estimated_profit:.2f}")
            
            # Control frequency - scan every 0.1 seconds for HFT
            elapsed = time.time() - start_time
            sleep_time = max(0.0, 0.1 - elapsed)  # Scan every 100ms
            await asyncio.sleep(sleep_time)
    
    async def _handle_arbitrage_task(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Handle arbitrage execution task"""
        opportunity = payload['opportunity']
        
        start_time = time.time()
        
        try:
            # Prepare market data for your existing agents
            market_data = {
                opportunity.trading_pair: {
                    'current_price': opportunity.buy_price,
                    'spread': opportunity.spread_percentage / 100,
                    'volume_24h': 1000000,  # Placeholder
                    'price_change_24h_pct': 0  # Neutral for arbitrage
                }
            }
            
            # Prepare analysis data for your agents
            analysis_data = {
                opportunity.trading_pair: {
                    'signal_strength': opportunity.confidence_score,
                    'regime': 'neutral',  # Arbitrage is regime-independent
                    'volatility_approved': True,
                    'entry_timing_approved': True
                }
            }
            
            # Prepare backtest results (simulated for arbitrage)
            backtest_results = {
                opportunity.trading_pair: {
                    'win_rate': 0.95,  # High confidence in arbitrage
                    'expected_return': opportunity.spread_percentage / 100,
                    'max_drawdown': 0.01  # Minimal drawdown expected
                }
            }
            
            # Execute through your existing workflow
            result = self.orchestrator.execute([opportunity.trading_pair])
            
            if result.get('success', False):
                execution_data = result.get('data', {})
                
                if execution_data.get('trade_executed', False):
                    execution_time = time.time() - start_time
                    self.performance_metrics['executed_trades'] += 1
                    self.performance_metrics['total_profit'] += opportunity.estimated_profit
                    self.performance_metrics['avg_execution_time'] = (
                        (self.performance_metrics['avg_execution_time'] * (self.performance_metrics['executed_trades'] - 1) + execution_time) /
                        self.performance_metrics['executed_trades']
                    )
                    
                    print(f"✅ ARBITRAGE EXECUTED: {opportunity.trading_pair} "
                          f"Profit: ${opportunity.estimated_profit:.2f} "
                          f"Time: {execution_time:.3f}s")
                    
                    return {
                        'success': True,
                        'opportunity_id': opportunity.opportunity_id,
                        'profit': opportunity.estimated_profit,
                        'execution_time': execution_time
                    }
                else:
                    reason = execution_data.get('reason', 'unknown')
                    print(f"❌ ARBITRAGE REJECTED: {reason}")
                    return {
                        'success': False,
                        'opportunity_id': opportunity.opportunity_id,
                        'reason': reason
                    }
            else:
                error = result.get('error', 'unknown error')
                print(f"❌ ARBITRAGE FAILED: {error}")
                return {
                    'success': False,
                    'opportunity_id': opportunity.opportunity_id,
                    'error': error
                }
                
        except Exception as e:
            print(f"❌ ARBITRAGE ERROR: {str(e)}")
            return {
                'success': False,
                'opportunity_id': opportunity.opportunity_id,
                'error': str(e)
            }
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get arbitrage performance metrics"""
        return self.performance_metrics


class EnhancedRiskManager(RiskManagementAgent):
    """Enhanced risk manager for arbitrage operations"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        self.arbitrage_risk_limits = {
            'max_position_per_opportunity': 0.02,  # 2% of account per opportunity
            'max_simultaneous_arbitrage': 5,       # Max concurrent arb trades
            'min_spread_threshold': 0.005,         # 0.5% minimum
            'max_execution_time': 2.0              # Max 2 seconds to execute
        }
    
    def assess_arbitrage_risk(self, opportunity: ArbitrageOpportunity) -> Dict[str, Any]:
        """Assess risk for specific arbitrage opportunity"""
        # Check spread threshold
        if opportunity.spread_percentage < self.arbitrage_risk_limits['min_spread_threshold'] * 100:
            return {
                'position_approved': False,
                'rejection_reason': f'Spread too small: {opportunity.spread_percentage:.3f}% < '
                                   f'{self.arbitrage_risk_limits["min_spread_threshold"] * 100:.3f}%'
            }
        
        # Check execution time feasibility
        if opportunity.time_to_execute > self.arbitrage_risk_limits['max_execution_time']:
            return {
                'position_approved': False,
                'rejection_reason': f'Execution time too long: {opportunity.time_to_execute}s > '
                                   f'{self.arbitrage_risk_limits["max_execution_time"]}s'
            }
        
        # Calculate position size based on arbitrage parameters
        max_position_value = self.account_balance * self.arbitrage_risk_limits['max_position_per_opportunity']
        position_size = min(
            opportunity.quantity,
            max_position_value / opportunity.buy_price
        )
        
        return {
            'position_approved': True,
            'position_size': position_size,
            'stop_loss': 0,  # No stop loss needed for true arbitrage
            'take_profit': opportunity.sell_price,  # Target sell price
            'risk_amount': 0,  # Arbitrage should be risk-free
            'confidence': opportunity.confidence_score
        }


async def run_high_frequency_arbitrage():
    """Run the high-frequency arbitrage system"""
    config = {
        'orchestrator': {
            'paper_trading': True  # Set to False for live trading
        },
        'exchanges': ['binance', 'kucoin', 'bybit'],  # Add your exchanges
        'max_workers': 8,
        'account_balance': 10000,
        'risk_per_trade': 0.01,
        'min_spread_threshold': 0.005
    }
    
    arbitrage_orchestrator = ArbitrageOrchestrator(config)
    
    print("🚀 INITIATING HIGH-FREQUENCY ARBITRAGE SYSTEM 🚀")
    print(f"Exchanges: {config['exchanges']}")
    print(f"Account Balance: ${config['account_balance']}")
    print("Scanning for opportunities every 100ms...")
    
    # Monitor common trading pairs
    symbols = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'ADA/USDT', 'DOT/USDT']
    
    try:
        await arbitrage_orchestrator.monitor_arbitrage_opportunities(symbols)
    except KeyboardInterrupt:
        print("\n🛑 ARBITRAGE SYSTEM STOPPED BY USER")
        
        # Print final metrics
        metrics = arbitrage_orchestrator.get_performance_metrics()
        print(f"\n📊 FINAL PERFORMANCE METRICS:")
        print(f"  Total Opportunities Found: {metrics['total_opportunities']}")
        print(f"  Executed Trades: {metrics['executed_trades']}")
        print(f"  Total Profit: ${metrics['total_profit']:.2f}")
        print(f"  Avg Execution Time: {metrics['avg_execution_time']:.3f}s")


if __name__ == "__main__":
    # Run the arbitrage system
    asyncio.run(run_high_frequency_arbitrage())
