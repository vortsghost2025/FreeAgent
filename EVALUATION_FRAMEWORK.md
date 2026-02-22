# Evaluation Framework Documentation

## Overview

The Evaluation Framework provides comprehensive testing and performance analysis for the trading system. It evaluates multiple aspects of system performance, trading effectiveness, risk management, and overall health.

## Components

### 1. Performance Evaluator
Assesses system performance metrics:

- **Execution Speed**: Measures how quickly orders are executed
  - Threshold: < 2 seconds maximum
  - Tracks average and max execution times
  
- **Throughput**: Operations per second capacity
  - Threshold: ≥ 10 ops/sec
  - Measures system capacity under load
  
- **Latency**: Response time percentiles (p50, p95, p99)
  - Threshold: p99 < 1 second
  - Critical for real-time trading

### 2. Trading Evaluator
Evaluates trading strategy effectiveness:

- **Win Rate**: Percentage of profitable trades
  - Threshold: ≥ 50%
  - Basic profitability indicator
  
- **Profit Factor**: Gross profit / gross loss ratio
  - Threshold: ≥ 1.5
  - Measures strategy edge
  
- **Maximum Drawdown**: Largest peak-to-trough decline
  - Threshold: ≤ 20%
  - Risk assessment metric
  
- **Sharpe Ratio**: Risk-adjusted returns
  - Threshold: ≥ 1.0
  - Quality of returns measurement

### 3. Risk Evaluator
Validates risk management compliance:

- **Position Sizing**: Verifies position limits
  - Threshold: ≤ 2% per position
  - Prevents overexposure
  
- **Exposure Limits**: Total market exposure
  - Threshold: ≤ 10% total
  - Portfolio-level risk control
  
- **Stop Loss Compliance**: Usage of protective stops
  - Threshold: ≥ 95% compliance
  - Essential risk protection

### 4. System Health Evaluator
Monitors operational reliability:

- **Uptime**: System availability percentage
  - Threshold: ≥ 99%
  - Reliability indicator
  
- **Error Rate**: Percentage of failed operations
  - Threshold: ≤ 1%
  - Quality metric
  
- **Memory Usage**: Resource consumption
  - Threshold: ≤ 1GB
  - Performance sustainability

## Usage

### Basic Usage

```python
from evaluation_framework import EvaluationFramework

# Initialize framework
framework = EvaluationFramework()

# Prepare evaluation data
data = {
    'execution_times': [0.5, 0.7, 0.6],
    'trades': [
        {'pnl': 50, 'has_stop_loss': True},
        {'pnl': -30, 'has_stop_loss': True}
    ],
    'account_balance': 10000,
    # ... other metrics
}

# Run evaluation
result = framework.run_full_evaluation(data)

# Generate report
report = framework.generate_report(result)
print(report)

# Export results
framework.export_results("results.json")
```

### Individual Evaluators

```python
# Use specific evaluators
from evaluation_framework import PerformanceEvaluator, TradingEvaluator

perf = PerformanceEvaluator()
metric = perf.evaluate_execution_speed([0.5, 0.7, 0.6])

trading = TradingEvaluator()
metric = trading.evaluate_win_rate(trades_list)
```

## Data Structure

### Input Data Format

```python
{
    # Performance data
    'execution_times': [float, ...],           # Seconds per execution
    'num_operations': int,                      # Total operations
    'time_window': float,                       # Time period in seconds
    'latency_measurements': [float, ...],      # Response times
    
    # Trading data
    'trades': [
        {
            'pnl': float,                       # Profit/loss
            'has_stop_loss': bool,              # Stop loss present
            'symbol': str,                      # Trading symbol
            # ... other trade fields
        },
        # ...
    ],
    'equity_curve': [float, ...],              # Account values over time
    'returns': [float, ...],                   # Periodic returns
    
    # Risk data
    'positions': [
        {
            'symbol': str,
            'position_value': float,
            # ... other position fields
        },
        # ...
    ],
    'account_balance': float,
    'total_exposure': float,
    
    # Health data
    'start_time': float,                       # System start timestamp
    'downtime_events': [
        {'duration': float},                   # Downtime in seconds
        # ...
    ],
    'num_errors': int,
    'memory_mb': float
}
```

### Output Format

```python
{
    'timestamp': str,                          # ISO format
    'category': str,                           # Evaluation type
    'overall_status': str,                     # "pass", "warning", "fail"
    'duration_seconds': float,
    'metrics': [
        {
            'name': str,
            'value': float,
            'status': str,
            'threshold': float,
            'details': dict
        },
        # ...
    ]
}
```

## Evaluation Status

- **pass**: Metric meets or exceeds threshold
- **warning**: Metric below threshold but not critical
- **fail**: Metric fails threshold, immediate attention needed

## Integration Points

### With Trading System

```python
# In your trading loop
from evaluation_framework import EvaluationFramework

framework = EvaluationFramework()

# Collect metrics during trading
execution_times = []
trades = []

# After trading session
result = framework.run_full_evaluation({
    'execution_times': execution_times,
    'trades': trades,
    # ... other collected data
})

# Act on results
if result.overall_status == "fail":
    alert_admins(result)
```

### With Monitoring

```python
# Continuous evaluation
import time

framework = EvaluationFramework()

while True:
    # Collect recent metrics
    data = collect_metrics()
    
    # Evaluate
    result = framework.run_full_evaluation(data)
    
    # Log results
    framework.export_results(f"eval_{int(time.time())}.json")
    
    # Wait before next evaluation
    time.sleep(3600)  # Hourly evaluation
```

### With Backtesting

```python
# Evaluate backtest results
from evaluation_framework import EvaluationFramework

def evaluate_backtest(backtest_results):
    framework = EvaluationFramework()
    
    data = {
        'trades': backtest_results['trades'],
        'equity_curve': backtest_results['equity_curve'],
        'returns': backtest_results['returns'],
        # ... other backtest data
    }
    
    result = framework.run_full_evaluation(data)
    return result

# Use in optimization
best_params = None
best_score = 0

for params in parameter_space:
    backtest = run_backtest(params)
    evaluation = evaluate_backtest(backtest)
    
    if evaluation.overall_status == "pass":
        score = calculate_score(evaluation)
        if score > best_score:
            best_score = score
            best_params = params
```

## Customization

### Adding Custom Metrics

```python
from evaluation_framework import EvaluationMetric

class CustomEvaluator:
    def evaluate_custom_metric(self, data):
        # Your evaluation logic
        value = calculate_metric(data)
        threshold = 100
        status = "pass" if value >= threshold else "fail"
        
        return EvaluationMetric(
            name="custom_metric",
            value=value,
            status=status,
            threshold=threshold,
            details={"info": "Custom details"}
        )
```

### Adjusting Thresholds

```python
# Modify thresholds when calling evaluators
perf = PerformanceEvaluator()

# Custom threshold
metric = perf.evaluate_execution_speed(
    execution_times,
    threshold=1.5  # 1.5 seconds instead of default 2
)
```

## Best Practices

1. **Regular Evaluation**: Run evaluations after each trading session
2. **Trend Analysis**: Track metrics over time to identify degradation
3. **Threshold Tuning**: Adjust thresholds based on actual system capabilities
4. **Alert Integration**: Connect failed evaluations to alerting systems
5. **Documentation**: Keep evaluation results for compliance and analysis

## Reporting

### Console Report

```
================================================================================
EVALUATION REPORT - 2026-02-22T19:42:00.000000
================================================================================
Category: full_evaluation
Overall Status: PASS
Duration: 0.05 seconds

PASSED (8):
  ✓ execution_speed: 0.6320
  ✓ throughput: 10.0000
  ✓ latency: 0.1500
  ✓ win_rate: 0.5000
  ✓ profit_factor: 2.3333
  ✓ position_sizing: 0.0000
  ✓ uptime: 0.9993
  ✓ error_rate: 0.0050

================================================================================
```

### JSON Export

Results exported to JSON for further analysis, dashboards, or archival.

## Maintenance

- Review thresholds quarterly
- Add new metrics as system evolves
- Archive old evaluation results
- Update documentation with new evaluators

## Future Enhancements

- Real-time streaming evaluation
- Machine learning anomaly detection
- Comparative analysis across strategies
- Automated threshold optimization
- Integration with external monitoring tools
