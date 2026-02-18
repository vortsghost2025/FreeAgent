# Multi-Agent Trading Bot Configuration File
# Active configuration - copied from template and customized

# Core Trading Configuration
TRADING_CONFIG = {
    'account_balance': 80,              # $20 withdrawn for VPS - FORTIFIED BOOTSTRAP
    'paper_trading': True,              # True = simulate, False = LIVE TRADING (API timestamp issue - fixing)
    'trading_pairs': ['SOL/USDT', 'BTC/USDT', 'ETH/USDT'],  # Multi-asset with asset-specific tuning
}

# Risk Management (CRITICAL - Do not modify lightly)
RISK_CONFIG = {
    'risk_per_trade': 0.005,            # 0.5% MICRO-STAKES for 3-week proof ($0.40/trade @ $80)
    'min_risk_reward_ratio': 1.5,       # Minimum profit:loss ratio
    'max_daily_loss': 0.05,             # 5% max daily loss ($4 at $80 balance)
    'account_balance': 80,              # $20 withdrawn for VPS runway (2-3 months)
    'min_signal_strength': 0.25,        # Minimum signal strength (raised from 0.10 to 0.25 for stronger entries)
    'min_win_rate': 0.45,               # Minimum backtest win rate
    'min_notional_usd': 1.0,            # Minimum trade size in USD (lowered for $80 micro-live account)
    'default_stop_loss_pct': 0.02,      # 2% stop loss by default
    'enforce_min_position_size_only': False,  # FALSE = Dynamic sizing based on 0.5% risk
    'min_position_size_units': 0.01,    # Default minimum (0.01 SOL)
    'min_position_size_by_pair': {
        'SOL/USDT': 0.01,               # Minimum 0.01 SOL per trade (~$0.88)
        'BTC/USDT': 0.0001,             # Minimum 0.0001 BTC per trade
        'ETH/USDT': 0.001,              # Minimum 0.001 ETH per trade
    },
    'max_position_size_usd': 10.0,      # HARD CAP: Maximum $10 position size
}

# Market Analysis
MARKET_CONFIG = {
    'rsi_period': 14,                   # RSI calculation period
    'macd_fast': 12,                    # MACD fast period
    'macd_slow': 26,                    # MACD slow period
    'macd_signal': 9,                   # MACD signal period
    'downtrend_threshold': -5,          # % drop to trigger bearish (-5%)
}

# Backtesting
BACKTEST_CONFIG = {
    'min_win_rate': 0.45,               # Minimum acceptable win rate
    'max_drawdown': 0.15,               # Maximum acceptable drawdown (15%)
}

# Data Fetching
DATA_CONFIG = {
    'cache_timeout': 300,               # 5 minutes between API calls
    'api_timeout': 10,                  # 10 second timeout per API call
}

# KuCoin API Credentials (LIVE TRADING)
API_CONFIG = {
    'api_key': '69713960cb7e89000126f2f6',
    'api_secret': 'a6b08fdc-045e-4cf4-bafb-c60984fb7b05',
    'api_passphrase': '134679Rosebud!',
}

# Execution
EXECUTION_CONFIG = {
    'paper_trading': False,             # True = paper, False = LIVE TRADING
    'max_open_positions': 1,            # Max concurrent open trades (conservative for micro-live)
}

# Entry Timing Validation (Maximum Restraint Approach)
# Prevents premature entries during mid-candle downswings
ENTRY_TIMING_CONFIG = {
    'enabled': True,                    # Enable entry timing validation
    'reversal_threshold_pct': 0.001,    # 0.1% - Wait for price reversal confirmation
}

# Monitoring & Logging
MONITOR_CONFIG = {
    'logs_dir': './logs',               # Directory for log files
    'enable_alerts': True,              # Console alerts for events
    'alert_level': 'WARNING',           # Minimum alert level
}
