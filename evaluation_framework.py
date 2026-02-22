"""
EVALUATION FRAMEWORK
Comprehensive testing and evaluation system for the trading platform
"""

import json
import time
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
import statistics


@dataclass
class EvaluationMetric:
    """Individual metric result"""
    name: str
    value: float
    status: str  # "pass", "fail", "warning"
    threshold: Optional[float] = None
    details: Optional[Dict[str, Any]] = None


@dataclass
class EvaluationResult:
    """Complete evaluation result"""
    timestamp: str
    category: str
    metrics: List[EvaluationMetric]
    overall_status: str
    duration_seconds: float
    notes: Optional[str] = None


class PerformanceEvaluator:
    """Evaluate system performance metrics"""
    
    def __init__(self):
        self.results = []
    
    def evaluate_execution_speed(self, execution_times: List[float]) -> EvaluationMetric:
        """Evaluate order execution speed"""
        if not execution_times:
            return EvaluationMetric(
                name="execution_speed",
                value=0.0,
                status="fail",
                details={"error": "No execution times recorded"}
            )
        
        avg_time = statistics.mean(execution_times)
        max_time = max(execution_times)
        threshold = 2.0  # 2 seconds max
        
        status = "pass" if max_time < threshold else "fail"
        
        return EvaluationMetric(
            name="execution_speed",
            value=avg_time,
            status=status,
            threshold=threshold,
            details={
                "avg_seconds": avg_time,
                "max_seconds": max_time,
                "samples": len(execution_times)
            }
        )
    
    def evaluate_throughput(self, num_operations: int, time_window: float) -> EvaluationMetric:
        """Evaluate system throughput"""
        ops_per_second = num_operations / time_window if time_window > 0 else 0
        threshold = 10.0  # 10 ops/sec minimum
        
        status = "pass" if ops_per_second >= threshold else "fail"
        
        return EvaluationMetric(
            name="throughput",
            value=ops_per_second,
            status=status,
            threshold=threshold,
            details={
                "operations": num_operations,
                "time_window": time_window
            }
        )
    
    def evaluate_latency(self, latency_measurements: List[float]) -> EvaluationMetric:
        """Evaluate system latency (p50, p95, p99)"""
        if not latency_measurements:
            return EvaluationMetric(
                name="latency",
                value=0.0,
                status="fail",
                details={"error": "No latency measurements"}
            )
        
        sorted_latencies = sorted(latency_measurements)
        p50 = sorted_latencies[len(sorted_latencies) // 2]
        p95 = sorted_latencies[int(len(sorted_latencies) * 0.95)]
        p99 = sorted_latencies[int(len(sorted_latencies) * 0.99)]
        
        threshold = 1.0  # 1 second p99
        status = "pass" if p99 < threshold else "fail"
        
        return EvaluationMetric(
            name="latency",
            value=p50,
            status=status,
            threshold=threshold,
            details={
                "p50_seconds": p50,
                "p95_seconds": p95,
                "p99_seconds": p99
            }
        )


class TradingEvaluator:
    """Evaluate trading performance"""
    
    def __init__(self):
        self.results = []
    
    def evaluate_win_rate(self, trades: List[Dict[str, Any]]) -> EvaluationMetric:
        """Calculate win rate from trades"""
        if not trades:
            return EvaluationMetric(
                name="win_rate",
                value=0.0,
                status="fail",
                details={"error": "No trades to evaluate"}
            )
        
        winning_trades = sum(1 for t in trades if t.get('pnl', 0) > 0)
        win_rate = winning_trades / len(trades)
        threshold = 0.5  # 50% minimum
        
        status = "pass" if win_rate >= threshold else "warning"
        
        return EvaluationMetric(
            name="win_rate",
            value=win_rate,
            status=status,
            threshold=threshold,
            details={
                "winning_trades": winning_trades,
                "total_trades": len(trades),
                "percentage": win_rate * 100
            }
        )
    
    def evaluate_profit_factor(self, trades: List[Dict[str, Any]]) -> EvaluationMetric:
        """Calculate profit factor (gross profit / gross loss)"""
        if not trades:
            return EvaluationMetric(
                name="profit_factor",
                value=0.0,
                status="fail",
                details={"error": "No trades to evaluate"}
            )
        
        gross_profit = sum(t.get('pnl', 0) for t in trades if t.get('pnl', 0) > 0)
        gross_loss = abs(sum(t.get('pnl', 0) for t in trades if t.get('pnl', 0) < 0))
        
        profit_factor = gross_profit / gross_loss if gross_loss > 0 else 0
        threshold = 1.5  # 1.5 minimum
        
        status = "pass" if profit_factor >= threshold else "warning"
        
        return EvaluationMetric(
            name="profit_factor",
            value=profit_factor,
            status=status,
            threshold=threshold,
            details={
                "gross_profit": gross_profit,
                "gross_loss": gross_loss
            }
        )
    
    def evaluate_max_drawdown(self, equity_curve: List[float]) -> EvaluationMetric:
        """Calculate maximum drawdown"""
        if len(equity_curve) < 2:
            return EvaluationMetric(
                name="max_drawdown",
                value=0.0,
                status="fail",
                details={"error": "Insufficient equity data"}
            )
        
        peak = equity_curve[0]
        max_dd = 0.0
        
        for value in equity_curve:
            if value > peak:
                peak = value
            dd = (peak - value) / peak if peak > 0 else 0
            max_dd = max(max_dd, dd)
        
        threshold = 0.20  # 20% maximum
        status = "pass" if max_dd <= threshold else "fail"
        
        return EvaluationMetric(
            name="max_drawdown",
            value=max_dd,
            status=status,
            threshold=threshold,
            details={
                "percentage": max_dd * 100,
                "peak_value": peak
            }
        )
    
    def evaluate_sharpe_ratio(self, returns: List[float], risk_free_rate: float = 0.0) -> EvaluationMetric:
        """Calculate Sharpe ratio"""
        if len(returns) < 2:
            return EvaluationMetric(
                name="sharpe_ratio",
                value=0.0,
                status="fail",
                details={"error": "Insufficient return data"}
            )
        
        avg_return = statistics.mean(returns)
        std_return = statistics.stdev(returns)
        
        sharpe = (avg_return - risk_free_rate) / std_return if std_return > 0 else 0
        threshold = 1.0  # 1.0 minimum
        
        status = "pass" if sharpe >= threshold else "warning"
        
        return EvaluationMetric(
            name="sharpe_ratio",
            value=sharpe,
            status=status,
            threshold=threshold,
            details={
                "avg_return": avg_return,
                "std_return": std_return
            }
        )


class RiskEvaluator:
    """Evaluate risk management effectiveness"""
    
    def evaluate_position_sizing(self, positions: List[Dict[str, Any]], 
                                 account_balance: float,
                                 max_position_pct: float = 0.02) -> EvaluationMetric:
        """Verify position sizing compliance"""
        violations = []
        
        for pos in positions:
            pos_value = pos.get('position_value', 0)
            pos_pct = pos_value / account_balance if account_balance > 0 else 0
            
            if pos_pct > max_position_pct:
                violations.append({
                    'symbol': pos.get('symbol'),
                    'percentage': pos_pct * 100,
                    'limit': max_position_pct * 100
                })
        
        status = "pass" if len(violations) == 0 else "fail"
        
        return EvaluationMetric(
            name="position_sizing",
            value=len(violations),
            status=status,
            threshold=0,
            details={
                "violations": violations,
                "positions_checked": len(positions)
            }
        )
    
    def evaluate_exposure_limits(self, total_exposure: float, 
                                 account_balance: float,
                                 max_exposure_pct: float = 0.1) -> EvaluationMetric:
        """Check total exposure limits"""
        exposure_pct = total_exposure / account_balance if account_balance > 0 else 0
        status = "pass" if exposure_pct <= max_exposure_pct else "fail"
        
        return EvaluationMetric(
            name="exposure_limits",
            value=exposure_pct,
            status=status,
            threshold=max_exposure_pct,
            details={
                "total_exposure": total_exposure,
                "account_balance": account_balance,
                "percentage": exposure_pct * 100
            }
        )
    
    def evaluate_stop_loss_compliance(self, trades: List[Dict[str, Any]]) -> EvaluationMetric:
        """Verify stop loss usage"""
        if not trades:
            return EvaluationMetric(
                name="stop_loss_compliance",
                value=0.0,
                status="fail",
                details={"error": "No trades to evaluate"}
            )
        
        trades_with_sl = sum(1 for t in trades if t.get('has_stop_loss', False))
        compliance_rate = trades_with_sl / len(trades)
        threshold = 0.95  # 95% minimum
        
        status = "pass" if compliance_rate >= threshold else "fail"
        
        return EvaluationMetric(
            name="stop_loss_compliance",
            value=compliance_rate,
            status=status,
            threshold=threshold,
            details={
                "trades_with_sl": trades_with_sl,
                "total_trades": len(trades),
                "percentage": compliance_rate * 100
            }
        )


class SystemHealthEvaluator:
    """Evaluate overall system health"""
    
    def evaluate_uptime(self, start_time: float, downtime_events: List[Dict]) -> EvaluationMetric:
        """Calculate system uptime percentage"""
        total_time = time.time() - start_time
        total_downtime = sum(e.get('duration', 0) for e in downtime_events)
        
        uptime_pct = (total_time - total_downtime) / total_time if total_time > 0 else 0
        threshold = 0.99  # 99% minimum
        
        status = "pass" if uptime_pct >= threshold else "fail"
        
        return EvaluationMetric(
            name="uptime",
            value=uptime_pct,
            status=status,
            threshold=threshold,
            details={
                "uptime_percentage": uptime_pct * 100,
                "downtime_events": len(downtime_events),
                "total_downtime_seconds": total_downtime
            }
        )
    
    def evaluate_error_rate(self, num_errors: int, num_operations: int) -> EvaluationMetric:
        """Calculate error rate"""
        error_rate = num_errors / num_operations if num_operations > 0 else 0
        threshold = 0.01  # 1% maximum
        
        status = "pass" if error_rate <= threshold else "fail"
        
        return EvaluationMetric(
            name="error_rate",
            value=error_rate,
            status=status,
            threshold=threshold,
            details={
                "errors": num_errors,
                "operations": num_operations,
                "percentage": error_rate * 100
            }
        )
    
    def evaluate_memory_usage(self, memory_mb: float) -> EvaluationMetric:
        """Check memory usage"""
        threshold = 1024.0  # 1GB maximum
        status = "pass" if memory_mb <= threshold else "warning"
        
        return EvaluationMetric(
            name="memory_usage",
            value=memory_mb,
            status=status,
            threshold=threshold,
            details={
                "memory_mb": memory_mb,
                "memory_gb": memory_mb / 1024
            }
        )


class EvaluationFramework:
    """Main evaluation framework coordinator"""
    
    def __init__(self):
        self.performance = PerformanceEvaluator()
        self.trading = TradingEvaluator()
        self.risk = RiskEvaluator()
        self.health = SystemHealthEvaluator()
        self.results: List[EvaluationResult] = []
    
    def run_full_evaluation(self, data: Dict[str, Any]) -> EvaluationResult:
        """Run complete evaluation suite"""
        start_time = time.time()
        metrics = []
        
        # Performance metrics
        if 'execution_times' in data:
            metrics.append(self.performance.evaluate_execution_speed(data['execution_times']))
        
        if 'num_operations' in data and 'time_window' in data:
            metrics.append(self.performance.evaluate_throughput(
                data['num_operations'], 
                data['time_window']
            ))
        
        if 'latency_measurements' in data:
            metrics.append(self.performance.evaluate_latency(data['latency_measurements']))
        
        # Trading metrics
        if 'trades' in data:
            metrics.append(self.trading.evaluate_win_rate(data['trades']))
            metrics.append(self.trading.evaluate_profit_factor(data['trades']))
        
        if 'equity_curve' in data:
            metrics.append(self.trading.evaluate_max_drawdown(data['equity_curve']))
        
        if 'returns' in data:
            metrics.append(self.trading.evaluate_sharpe_ratio(data['returns']))
        
        # Risk metrics
        if 'positions' in data and 'account_balance' in data:
            metrics.append(self.risk.evaluate_position_sizing(
                data['positions'],
                data['account_balance']
            ))
        
        if 'total_exposure' in data and 'account_balance' in data:
            metrics.append(self.risk.evaluate_exposure_limits(
                data['total_exposure'],
                data['account_balance']
            ))
        
        if 'trades' in data:
            metrics.append(self.risk.evaluate_stop_loss_compliance(data['trades']))
        
        # System health metrics
        if 'start_time' in data and 'downtime_events' in data:
            metrics.append(self.health.evaluate_uptime(
                data['start_time'],
                data['downtime_events']
            ))
        
        if 'num_errors' in data and 'num_operations' in data:
            metrics.append(self.health.evaluate_error_rate(
                data['num_errors'],
                data['num_operations']
            ))
        
        if 'memory_mb' in data:
            metrics.append(self.health.evaluate_memory_usage(data['memory_mb']))
        
        # Determine overall status
        failed = sum(1 for m in metrics if m.status == "fail")
        warnings = sum(1 for m in metrics if m.status == "warning")
        
        if failed > 0:
            overall_status = "fail"
        elif warnings > 0:
            overall_status = "warning"
        else:
            overall_status = "pass"
        
        duration = time.time() - start_time
        
        result = EvaluationResult(
            timestamp=datetime.now().isoformat(),
            category="full_evaluation",
            metrics=metrics,
            overall_status=overall_status,
            duration_seconds=duration
        )
        
        self.results.append(result)
        return result
    
    def export_results(self, filepath: str = "evaluation_results.json"):
        """Export evaluation results to file"""
        with open(filepath, 'w') as f:
            json.dump([asdict(r) for r in self.results], f, indent=2)
    
    def generate_report(self, result: EvaluationResult) -> str:
        """Generate human-readable report"""
        report = []
        report.append("=" * 80)
        report.append(f"EVALUATION REPORT - {result.timestamp}")
        report.append("=" * 80)
        report.append(f"Category: {result.category}")
        report.append(f"Overall Status: {result.overall_status.upper()}")
        report.append(f"Duration: {result.duration_seconds:.2f} seconds")
        report.append("")
        
        # Group by status
        passed = [m for m in result.metrics if m.status == "pass"]
        failed = [m for m in result.metrics if m.status == "fail"]
        warnings = [m for m in result.metrics if m.status == "warning"]
        
        if passed:
            report.append(f"PASSED ({len(passed)}):")
            for metric in passed:
                report.append(f"  ✓ {metric.name}: {metric.value:.4f}")
            report.append("")
        
        if warnings:
            report.append(f"WARNINGS ({len(warnings)}):")
            for metric in warnings:
                report.append(f"  ⚠ {metric.name}: {metric.value:.4f} (threshold: {metric.threshold})")
                if metric.details:
                    report.append(f"    Details: {metric.details}")
            report.append("")
        
        if failed:
            report.append(f"FAILED ({len(failed)}):")
            for metric in failed:
                report.append(f"  ✗ {metric.name}: {metric.value:.4f} (threshold: {metric.threshold})")
                if metric.details:
                    report.append(f"    Details: {metric.details}")
            report.append("")
        
        report.append("=" * 80)
        return "\n".join(report)


if __name__ == "__main__":
    # Example usage
    framework = EvaluationFramework()
    
    # Sample data
    test_data = {
        'execution_times': [0.5, 0.7, 0.6, 0.8, 0.55],
        'num_operations': 100,
        'time_window': 10.0,
        'latency_measurements': [0.1, 0.2, 0.15, 0.3, 0.12],
        'trades': [
            {'pnl': 50, 'has_stop_loss': True},
            {'pnl': -30, 'has_stop_loss': True},
            {'pnl': 80, 'has_stop_loss': True},
            {'pnl': -20, 'has_stop_loss': True},
        ],
        'equity_curve': [10000, 10050, 10020, 10100, 10080],
        'returns': [0.005, -0.003, 0.008, -0.002, 0.004],
        'positions': [
            {'symbol': 'BTC', 'position_value': 150},
            {'symbol': 'ETH', 'position_value': 100},
        ],
        'account_balance': 10000,
        'total_exposure': 250,
        'start_time': time.time() - 86400,  # 24 hours ago
        'downtime_events': [{'duration': 60}],  # 1 minute downtime
        'num_errors': 5,
        'memory_mb': 512
    }
    
    result = framework.run_full_evaluation(test_data)
    print(framework.generate_report(result))
    framework.export_results()
