"""
Continuous Trading Bot - Live Monitoring Mode
Runs CONTINUOUS trading cycles in an infinite loop.

Use this for:
- Extended paper trading validation
- Live trading operations (when configured)
- Long-term market monitoring
- Multi-day resilience testing

For single test cycles, use single_cycle.py instead.

Configuration:
- CYCLE_INTERVAL_SECONDS: Time between cycles (default: 300 = 5 minutes)
- Press Ctrl+C to stop gracefully
"""

# CRITICAL: Force UTF-8 encoding to prevent UnicodeEncodeError on Windows
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import logging
import os
import signal
import time
from datetime import datetime

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False

from agents import (
    OrchestratorAgent,
    DataFetchingAgent,
    MarketAnalysisAgent,
    RiskManagementAgent,
    BacktestingAgent,
    ExecutionAgent,
    MonitoringAgent
)

# Import configuration
try:
    from config import TRADING_CONFIG, RISK_CONFIG, API_CONFIG, ENTRY_TIMING_CONFIG
    CONFIG_LOADED = True
except ImportError:
    CONFIG_LOADED = False
    TRADING_CONFIG = None
    RISK_CONFIG = None
    API_CONFIG = None
    ENTRY_TIMING_CONFIG = None


def setup_logging():
    """Setup root logger configuration."""
    logging.basicConfig(
        level=logging.INFO,
        format='[%(asctime)s] %(name)s - %(levelname)s: %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )


def check_singleton_enforcement():
    """
    PRODUCTION REQUIREMENT #2: Singleton Enforcement
    
    Ensures only ONE instance of the bot can run at a time.
    Uses PID file to track running instance and prevent duplicates.
    
    Returns: True if startup approved, False if should exit
    """
    pid_file = 'bot.pid'
    process_log = 'bot_process.log'
    current_pid = os.getpid()
    
    # Check if PID file exists
    if os.path.exists(pid_file):
        try:
            with open(pid_file, 'r') as f:
                content = f.read().strip().split('|')
                old_pid = int(content[0])
                old_timestamp = content[1] if len(content) > 1 else 'unknown'
            
            # Check if process is still running
            is_running = False
            if PSUTIL_AVAILABLE:
                is_running = psutil.pid_exists(old_pid)
            else:
                # Fallback: Try to send signal 0 (doesn't actually signal, just checks)
                try:
                    os.kill(old_pid, 0)
                    is_running = True
                except OSError:
                    is_running = False
            
            if is_running:
                print("\n" + "="*60)
                print("❌ SINGLETON VIOLATION: Bot Already Running")
                print("="*60)
                print(f"\nAnother instance is already active:")
                print(f"  PID: {old_pid}")
                print(f"  Started: {old_timestamp}")
                print(f"\nOnly ONE bot instance can run at a time.")
                print("This prevents duplicate trades and conflicting orders.")
                print("\nIf you believe this is a stale lock:")
                print(f"  1. Verify no bot is running: tasklist | findstr python")
                print(f"  2. Delete stale lock: del {pid_file}")
                print("\n" + "="*60)
                
                # Log the violation
                with open(process_log, 'a') as log:
                    log.write(f"[{datetime.now().isoformat()}] SINGLETON_VIOLATION: "
                             f"PID {current_pid} blocked by existing PID {old_pid}\n")
                
                return False
            else:
                # Stale PID file - clean it up
                print(f"⚠️  Stale PID file detected (process {old_pid} not running)")
                print(f"   Cleaning up and proceeding...\n")
                os.remove(pid_file)
                
                with open(process_log, 'a') as log:
                    log.write(f"[{datetime.now().isoformat()}] STALE_PID_CLEANED: "
                             f"PID {old_pid} from {old_timestamp}\n")
        
        except Exception as e:
            print(f"⚠️  Error reading PID file: {e}")
            print(f"   Removing corrupted file and proceeding...\n")
            os.remove(pid_file)
    
    # Write new PID file
    try:
        with open(pid_file, 'w') as f:
            f.write(f"{current_pid}|{datetime.now().isoformat()}")
        
        with open(process_log, 'a') as log:
            log.write(f"[{datetime.now().isoformat()}] BOT_START: PID {current_pid}\n")
        
        print(f"✅ Singleton check passed (PID: {current_pid})\n")
        return True
    
    except Exception as e:
        print(f"❌ ERROR: Could not write PID file: {e}")
        print(f"   Bot startup aborted for safety.\n")
        return False


def cleanup_singleton():
    """Remove PID file on graceful shutdown."""
    pid_file = 'bot.pid'
    process_log = 'bot_process.log'
    current_pid = os.getpid()
    
    if os.path.exists(pid_file):
        try:
            os.remove(pid_file)
            with open(process_log, 'a') as log:
                log.write(f"[{datetime.now().isoformat()}] BOT_STOP: PID {current_pid}\n")
            print(f"\n✅ Singleton lock released (PID: {current_pid})")
        except Exception as e:
            print(f"\n⚠️  Error removing PID file: {e}")


def initialize_agents(config: dict) -> dict:
    """Initialize and register all trading agents."""
    print("\n" + "="*60)
    print("  Continuous Trading Mode")
    print("  (Press Ctrl+C to stop)")
    print("="*60 + "\n")
    
    orchestrator = OrchestratorAgent(config.get('orchestrator', {}))
    
    print("Initializing agents...")
    
    data_agent = DataFetchingAgent(config.get('data_fetcher', {}))
    orchestrator.register_agent(data_agent)
    
    market_agent = MarketAnalysisAgent(config.get('market_analyzer', {}))
    orchestrator.register_agent(market_agent)
    
    risk_agent = RiskManagementAgent(config.get('risk_manager', {}))
    orchestrator.register_agent(risk_agent)
    
    backtest_agent = BacktestingAgent(config.get('backtester', {}))
    orchestrator.register_agent(backtest_agent)
    
    exec_agent = ExecutionAgent(config.get('executor', {}))
    orchestrator.register_agent(exec_agent)
    
    monitor_agent = MonitoringAgent(config.get('monitor', {}))
    orchestrator.register_agent(monitor_agent)
    
    print("[OK] All 6 agents initialized and registered\n")
    
    return {
        'orchestrator': orchestrator,
        'data_fetcher': data_agent,
        'market_analyzer': market_agent,
        'risk_manager': risk_agent,
        'backtester': backtest_agent,
        'executor': exec_agent,
        'monitor': monitor_agent
    }


def print_system_status(agents: dict):
    """Print current system status."""
    orchestrator = agents['orchestrator']
    status = orchestrator.get_system_status()
    
    print("\n" + "="*60)
    print("  System Status Report")
    print("="*60)
    print(f"Orchestrator: {status['orchestrator']['status']}")
    print(f"Trading Paused: {status['trading_paused']}")
    print(f"Circuit Breaker: {status['circuit_breaker_active']}")
    print(f"Current Stage: {status['current_stage']}")
    print(f"\nAgent Status:")
    for agent_status in status['agents']:
        print(f"  • {agent_status['name']}: {agent_status['status']}")
    print("="*60 + "\n")


def run_trading_cycle(agents: dict, symbols: list, cycle_number: int):
    """Execute one complete trading cycle."""
    orchestrator = agents['orchestrator']
    executor = agents['executor']
    
    print("\n" + "="*60)
    print(f"  Trading Cycle #{cycle_number}")
    print(f"  Symbols: {', '.join(symbols)}")
    print(f"  Time: {datetime.utcnow().isoformat()}")
    print("="*60 + "\n")
    
    result = orchestrator.execute(symbols)
    
    if not result['success']:
        print(f"\n❌ Orchestration failed: {result['error']}\n")
        return result
    
    data = result.get('data', {})
    
    print("\n" + "-"*60)
    print(f"Cycle #{cycle_number} Results:")
    print("-"*60)
    print(f"Trade Executed: {data.get('trade_executed', False)}")
    
    if data.get('trade_executed'):
        exec_data = data.get('execution', {})
        print(f"  Trade ID: {exec_data.get('trade_id')}")
        print(f"  Entry Price: ${exec_data.get('entry_price', 0):.4f}")
        print(f"  Position Size: {exec_data.get('position_size', 0):.4f}")
        print(f"  Stop Loss: ${exec_data.get('stop_loss', 0):.4f}")
        print(f"  Take Profit: ${exec_data.get('take_profit', 0):.4f}")
    else:
        reason = data.get('reason', 'Unknown')
        print(f"  Reason: {reason}")
    
    perf = executor.get_performance_summary()
    print(f"\nPerformance Summary (Cycle #{cycle_number}):")
    print(f"  Total Trades: {perf['total_trades']}")
    print(f"  Winning: {perf['winning_trades']} | Losing: {perf['losing_trades']}")
    print(f"  Win Rate: {perf['win_rate']:.1%}")
    print(f"  Total P&L: ${perf['total_pnl']:.2f}")
    print(f"  Average P&L: ${perf['avg_pnl']:.2f}")
    print(f"  Max Win: ${perf['max_win']:.2f} | Max Loss: ${perf['max_loss']:.2f}")
    print(f"  Open Positions: {perf['open_positions']}")
    print("-"*60 + "\n")
    
    return result


def main():
    """Main entry point for continuous trading mode."""
    setup_logging()
    logger = logging.getLogger("ContinuousBot")
    
    # PRODUCTION REQUIREMENT #2: Singleton Enforcement
    if not check_singleton_enforcement():
        sys.exit(1)
    
    # Graceful shutdown tracking
    shutdown_requested = {'flag': False, 'first_signal_time': None}
    
    # Signal handler: Double Ctrl+C pattern
    # First Ctrl+C: Request graceful shutdown after current cycle
    # Second Ctrl+C (within 2 seconds): Force immediate exit
    def signal_handler(sig, frame):
        current_time = time.time()
        
        if shutdown_requested['flag']:
            # Second Ctrl+C - force exit
            elapsed = current_time - shutdown_requested['first_signal_time']
            if elapsed < 2.0:
                logger.info("Second Ctrl+C received - forcing immediate shutdown")
                print("\n⚠️  Force shutdown initiated...")
                cleanup_singleton()
                sys.exit(0)
            else:
                # Reset if more than 2 seconds elapsed
                shutdown_requested['first_signal_time'] = current_time
                logger.info("Graceful shutdown already requested - press Ctrl+C again within 2s to force")
        else:
            # First Ctrl+C - request graceful shutdown
            shutdown_requested['flag'] = True
            shutdown_requested['first_signal_time'] = current_time
            logger.info("Graceful shutdown requested - will stop after current cycle completes")
            print("\n✋ Graceful shutdown requested...")
            print("   (Press Ctrl+C again within 2 seconds to force immediate stop)\n")
    
    signal.signal(signal.SIGINT, signal_handler)
    
    # Load configuration from config.py
    account_balance = 100.0
    paper_trading = True
    
    if CONFIG_LOADED and TRADING_CONFIG:
        paper_trading = TRADING_CONFIG.get('paper_trading', True)
        account_balance = TRADING_CONFIG.get('account_balance', 100.0)
        logger.info(f"[CONFIG.PY] Loaded: paper_trading={paper_trading}, account_balance=${account_balance}")
    
    # Cycle interval configuration
    cycle_interval = int(os.getenv('CYCLE_INTERVAL_SECONDS', '300'))
    logger.info(f"Cycle interval: {cycle_interval} seconds")
    
    config = {
        'logs_dir': './logs/production',
        'orchestrator': {
            'paper_trading': paper_trading
        },
        'data_fetcher': {
            'cache_timeout': 300
        },
        'market_analyzer': {
            'rsi_period': 14,
            'downtrend_threshold': -5,
            'entry_timing_config': ENTRY_TIMING_CONFIG if CONFIG_LOADED and ENTRY_TIMING_CONFIG else {'enabled': False}
        },
        'risk_manager': {
            'account_balance': account_balance,
            'risk_per_trade': 0.01,
            'min_risk_reward_ratio': 1.5,
            'max_daily_loss': 0.05,
            'min_signal_strength': 0.10,
            'min_win_rate': 0.45,
            'min_position_size_units': 0.01,
            'min_position_size_by_pair': {
                'SOL/USDT': 0.01,
                'BTC/USDT': 0.0001
            },
            'enforce_min_position_size_only': False
        },
        'backtester': {
            'min_win_rate': 0.45,
            'max_drawdown': 0.15
        },
        'executor': {
            'paper_trading': paper_trading,
            'live_mode': not paper_trading,
            'exchange': os.getenv('EXCHANGE') if not paper_trading else None,
            'order_type': os.getenv('ORDER_TYPE', 'market'),
            'api_key': API_CONFIG.get('api_key') if CONFIG_LOADED and API_CONFIG else None,
            'api_secret': API_CONFIG.get('api_secret') if CONFIG_LOADED and API_CONFIG else None,
            'api_passphrase': API_CONFIG.get('api_passphrase') if CONFIG_LOADED and API_CONFIG else None,
        },
        'monitor': {
            'logs_dir': './logs'
        }
    }
    
    try:
        agents = initialize_agents(config)
        print_system_status(agents)
        
        trading_pairs = TRADING_CONFIG.get('trading_pairs', ['SOL/USDT'])
        cycle_count = 0
        
        logger.info("Starting continuous trading loop...")
        print(f"\n{'='*60}")
        print(f"  CONTINUOUS MODE ACTIVE")
        print(f"  Cycle Interval: {cycle_interval}s")
        print(f"  Press Ctrl+C to stop")
        print(f"{'='*60}\n")
        
        while True:
            cycle_count += 1
            logger.info(f"===== Starting Trading Cycle #{cycle_count} =====")
            
            result = run_trading_cycle(agents, trading_pairs, cycle_count)
            
            print_system_status(agents)
            
            # Check if graceful shutdown requested
            if shutdown_requested['flag']:
                logger.info(f"Graceful shutdown - stopping after cycle #{cycle_count}")
                print(f"\n✅ Graceful shutdown complete after {cycle_count} cycles\n")
                break
            
            logger.info(f"Cycle #{cycle_count} completed. Sleeping for {cycle_interval}s...")
            time.sleep(cycle_interval)
    
    except KeyboardInterrupt:
        logger.info(f"\nTrading bot stopped by user after {cycle_count} cycles")
        
        # Cleanup singleton lock
        cleanup_singleton()
        
        # Print final performance
        executor = agents['executor']
        perf = executor.get_performance_summary()
        print("\n" + "="*60)
        print("  Final Performance Summary")
        print("="*60)
        print(f"  Total Cycles: {cycle_count}")
        print(f"  Total Trades: {perf['total_trades']}")
        print(f"  Winning: {perf['winning_trades']} | Losing: {perf['losing_trades']}")
        print(f"  Win Rate: {perf['win_rate']:.1%}")
        print(f"  Total P&L: ${perf['total_pnl']:.2f}")
        print(f"  Average P&L: ${perf['avg_pnl']:.2f}")
        print(f"  Max Win: ${perf['max_win']:.2f} | Max Loss: ${perf['max_loss']:.2f}")
        print(f"  Open Positions: {perf['open_positions']}")
        print("="*60 + "\n")
        
        return 0
    
    except Exception as e:
        logger.error(f"Fatal error: {str(e)}", exc_info=True)
        cleanup_singleton()
        return 1
    
    finally:
        # Ensure cleanup on any exit path
        cleanup_singleton()


if __name__ == '__main__':
    sys.exit(main())
