"""
Test suite for evaluation framework
"""

import time
from evaluation_framework import (
    EvaluationFramework,
    PerformanceEvaluator,
    TradingEvaluator,
    RiskEvaluator,
    SystemHealthEvaluator
)


def test_performance_evaluator():
    """Test performance evaluation"""
    print("\n" + "="*80)
    print("TESTING PERFORMANCE EVALUATOR")
    print("="*80)
    
    perf = PerformanceEvaluator()
    
    # Test execution speed
    execution_times = [0.5, 0.7, 0.6, 0.8, 0.55, 0.65]
    metric = perf.evaluate_execution_speed(execution_times)
    print(f"\nExecution Speed: {metric.value:.4f}s (Status: {metric.status})")
    print(f"  Details: {metric.details}")
    
    # Test throughput
    metric = perf.evaluate_throughput(num_operations=150, time_window=10.0)
    print(f"\nThroughput: {metric.value:.2f} ops/sec (Status: {metric.status})")
    print(f"  Details: {metric.details}")
    
    # Test latency
    latency_measurements = [0.1, 0.2, 0.15, 0.3, 0.12, 0.18, 0.22, 0.25, 0.14, 0.16]
    metric = perf.evaluate_latency(latency_measurements)
    print(f"\nLatency: {metric.value:.4f}s (Status: {metric.status})")
    print(f"  Details: {metric.details}")


def test_trading_evaluator():
    """Test trading evaluation"""
    print("\n" + "="*80)
    print("TESTING TRADING EVALUATOR")
    print("="*80)
    
    trading = TradingEvaluator()
    
    # Sample trades
    trades = [
        {'pnl': 50, 'has_stop_loss': True},
        {'pnl': -30, 'has_stop_loss': True},
        {'pnl': 80, 'has_stop_loss': True},
        {'pnl': -20, 'has_stop_loss': True},
        {'pnl': 60, 'has_stop_loss': True},
        {'pnl': -25, 'has_stop_loss': True},
    ]
    
    # Test win rate
    metric = trading.evaluate_win_rate(trades)
    print(f"\nWin Rate: {metric.value:.2%} (Status: {metric.status})")
    print(f"  Details: {metric.details}")
    
    # Test profit factor
    metric = trading.evaluate_profit_factor(trades)
    print(f"\nProfit Factor: {metric.value:.2f} (Status: {metric.status})")
    print(f"  Details: {metric.details}")
    
    # Test max drawdown
    equity_curve = [10000, 10050, 10020, 10100, 10080, 10150, 10120, 10200]
    metric = trading.evaluate_max_drawdown(equity_curve)
    print(f"\nMax Drawdown: {metric.value:.2%} (Status: {metric.status})")
    print(f"  Details: {metric.details}")
    
    # Test Sharpe ratio
    returns = [0.005, -0.003, 0.008, -0.002, 0.007, -0.0015, 0.006]
    metric = trading.evaluate_sharpe_ratio(returns)
    print(f"\nSharpe Ratio: {metric.value:.2f} (Status: {metric.status})")
    print(f"  Details: {metric.details}")


def test_risk_evaluator():
    """Test risk evaluation"""
    print("\n" + "="*80)
    print("TESTING RISK EVALUATOR")
    print("="*80)
    
    risk = RiskEvaluator()
    
    # Test position sizing
    positions = [
        {'symbol': 'BTC', 'position_value': 150},
        {'symbol': 'ETH', 'position_value': 100},
        {'symbol': 'SOL', 'position_value': 80},
    ]
    metric = risk.evaluate_position_sizing(positions, account_balance=10000)
    print(f"\nPosition Sizing: {metric.value} violations (Status: {metric.status})")
    print(f"  Details: {metric.details}")
    
    # Test exposure limits
    metric = risk.evaluate_exposure_limits(total_exposure=250, account_balance=10000)
    print(f"\nExposure Limits: {metric.value:.2%} (Status: {metric.status})")
    print(f"  Details: {metric.details}")
    
    # Test stop loss compliance
    trades = [
        {'pnl': 50, 'has_stop_loss': True},
        {'pnl': -30, 'has_stop_loss': True},
        {'pnl': 80, 'has_stop_loss': True},
        {'pnl': -20, 'has_stop_loss': False},  # Violation
    ]
    metric = risk.evaluate_stop_loss_compliance(trades)
    print(f"\nStop Loss Compliance: {metric.value:.2%} (Status: {metric.status})")
    print(f"  Details: {metric.details}")


def test_system_health_evaluator():
    """Test system health evaluation"""
    print("\n" + "="*80)
    print("TESTING SYSTEM HEALTH EVALUATOR")
    print("="*80)
    
    health = SystemHealthEvaluator()
    
    # Test uptime
    start_time = time.time() - 86400  # 24 hours ago
    downtime_events = [
        {'duration': 60},   # 1 minute
        {'duration': 120},  # 2 minutes
    ]
    metric = health.evaluate_uptime(start_time, downtime_events)
    print(f"\nUptime: {metric.value:.4%} (Status: {metric.status})")
    print(f"  Details: {metric.details}")
    
    # Test error rate
    metric = health.evaluate_error_rate(num_errors=5, num_operations=1000)
    print(f"\nError Rate: {metric.value:.2%} (Status: {metric.status})")
    print(f"  Details: {metric.details}")
    
    # Test memory usage
    metric = health.evaluate_memory_usage(memory_mb=512)
    print(f"\nMemory Usage: {metric.value:.2f} MB (Status: {metric.status})")
    print(f"  Details: {metric.details}")


def test_full_evaluation():
    """Test complete evaluation framework"""
    print("\n" + "="*80)
    print("TESTING FULL EVALUATION FRAMEWORK")
    print("="*80)
    
    framework = EvaluationFramework()
    
    # Comprehensive test data
    test_data = {
        # Performance data
        'execution_times': [0.5, 0.7, 0.6, 0.8, 0.55, 0.65, 0.72, 0.58],
        'num_operations': 150,
        'time_window': 10.0,
        'latency_measurements': [0.1, 0.2, 0.15, 0.3, 0.12, 0.18, 0.22, 0.25, 0.14, 0.16],
        
        # Trading data
        'trades': [
            {'pnl': 50, 'has_stop_loss': True},
            {'pnl': -30, 'has_stop_loss': True},
            {'pnl': 80, 'has_stop_loss': True},
            {'pnl': -20, 'has_stop_loss': True},
            {'pnl': 60, 'has_stop_loss': True},
            {'pnl': -25, 'has_stop_loss': True},
        ],
        'equity_curve': [10000, 10050, 10020, 10100, 10080, 10150, 10120, 10200],
        'returns': [0.005, -0.003, 0.008, -0.002, 0.007, -0.0015, 0.006],
        
        # Risk data
        'positions': [
            {'symbol': 'BTC', 'position_value': 150},
            {'symbol': 'ETH', 'position_value': 100},
            {'symbol': 'SOL', 'position_value': 80},
        ],
        'account_balance': 10000,
        'total_exposure': 330,
        
        # Health data
        'start_time': time.time() - 86400,
        'downtime_events': [
            {'duration': 60},
            {'duration': 120},
        ],
        'num_errors': 5,
        'num_operations': 1000,
        'memory_mb': 512
    }
    
    # Run full evaluation
    result = framework.run_full_evaluation(test_data)
    
    # Generate and print report
    report = framework.generate_report(result)
    print("\n" + report)
    
    # Export results
    framework.export_results("test_evaluation_results.json")
    print("\nResults exported to: test_evaluation_results.json")
    
    return result


def test_failure_scenarios():
    """Test evaluation with failing metrics"""
    print("\n" + "="*80)
    print("TESTING FAILURE SCENARIOS")
    print("="*80)
    
    framework = EvaluationFramework()
    
    # Data with failures
    failing_data = {
        'execution_times': [3.5, 4.2, 3.8],  # Too slow (threshold: 2s)
        'num_operations': 50,
        'time_window': 10.0,  # Low throughput (5 ops/sec, threshold: 10)
        'trades': [
            {'pnl': -50, 'has_stop_loss': True},
            {'pnl': -30, 'has_stop_loss': False},  # No stop loss
            {'pnl': -80, 'has_stop_loss': True},
        ],
        'equity_curve': [10000, 9500, 8000, 7500],  # 25% drawdown
        'positions': [
            {'symbol': 'BTC', 'position_value': 5000},  # 50% position (threshold: 2%)
        ],
        'account_balance': 10000,
        'total_exposure': 5000,  # 50% exposure (threshold: 10%)
        'start_time': time.time() - 86400,
        'downtime_events': [{'duration': 3600}],  # 1 hour downtime
        'num_errors': 200,
        'num_operations': 1000,  # 20% error rate
        'memory_mb': 2048  # 2GB usage
    }
    
    result = framework.run_full_evaluation(failing_data)
    report = framework.generate_report(result)
    print("\n" + report)


def test_edge_cases():
    """Test edge cases and error handling"""
    print("\n" + "="*80)
    print("TESTING EDGE CASES")
    print("="*80)
    
    perf = PerformanceEvaluator()
    trading = TradingEvaluator()
    
    # Empty data
    print("\n1. Empty execution times:")
    metric = perf.evaluate_execution_speed([])
    print(f"   Status: {metric.status}, Details: {metric.details}")
    
    # Empty trades
    print("\n2. Empty trades list:")
    metric = trading.evaluate_win_rate([])
    print(f"   Status: {metric.status}, Details: {metric.details}")
    
    # Insufficient equity data
    print("\n3. Insufficient equity data:")
    metric = trading.evaluate_max_drawdown([10000])
    print(f"   Status: {metric.status}, Details: {metric.details}")
    
    # All losing trades
    print("\n4. All losing trades:")
    losing_trades = [
        {'pnl': -50, 'has_stop_loss': True},
        {'pnl': -30, 'has_stop_loss': True},
        {'pnl': -20, 'has_stop_loss': True},
    ]
    metric = trading.evaluate_profit_factor(losing_trades)
    print(f"   Status: {metric.status}, Value: {metric.value}, Details: {metric.details}")


if __name__ == "__main__":
    print("\n" + "="*80)
    print("EVALUATION FRAMEWORK TEST SUITE")
    print("="*80)
    
    try:
        # Run all tests
        test_performance_evaluator()
        test_trading_evaluator()
        test_risk_evaluator()
        test_system_health_evaluator()
        test_full_evaluation()
        test_failure_scenarios()
        test_edge_cases()
        
        print("\n" + "="*80)
        print("ALL TESTS COMPLETED")
        print("="*80)
        
    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
