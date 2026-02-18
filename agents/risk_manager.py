"""
Risk Management Agent
Calculates position sizing, stop-loss and take-profit levels.
Enforces strict risk controls: never risk more than 1% of capital per trade.
"""

from typing import Any, Dict, Optional
import logging

from .base_agent import BaseAgent, AgentStatus

MAX_DAILY_LOSS_CAP = 0.02  # 2% hard cap for safety
DEFAULT_MIN_POSITION_SIZE_UNITS = 0.001


class RiskManagementAgent(BaseAgent):
    """
    Risk Management Agent: Enforces position sizing and risk controls.
    
    Responsibilities:
    - Calculate position size based on risk percentage
    - Generate stop-loss levels
    - Generate take-profit levels
    - Enforce risk-reward ratio minimum
    - Reject trades that violate risk thresholds
    - Track cumulative risk exposure
    
    Core Rule: Never risk more than 1% of capital per trade
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize the risk management agent."""
        super().__init__("RiskManagementAgent", config)
        self.account_balance = config.get('account_balance', 10000) if config else 10000
        self.risk_per_trade = config.get('risk_per_trade', 0.01) if config else 0.01  # 1%
        self.min_risk_reward_ratio = config.get('min_risk_reward_ratio', 1.5) if config else 1.5
        requested_max_daily_loss = config.get('max_daily_loss', 0.05) if config else 0.05
        self.max_daily_loss = min(requested_max_daily_loss, MAX_DAILY_LOSS_CAP)
        self.default_stop_loss_pct = config.get('default_stop_loss_pct', 0.02) if config else 0.02
        self.min_signal_strength = config.get('min_signal_strength', 0.3) if config else 0.3
        self.min_win_rate = config.get('min_win_rate', 0.45) if config else 0.45
        self.min_notional_usd = config.get('min_notional_usd', 10.0) if config else 10.0
        if config:
            configured_min_size = config.get('min_position_size_units')
            self.min_position_size_units = (
                configured_min_size if configured_min_size is not None else DEFAULT_MIN_POSITION_SIZE_UNITS
            )
        else:
            self.min_position_size_units = DEFAULT_MIN_POSITION_SIZE_UNITS
        self.min_position_size_by_pair = config.get('min_position_size_by_pair', {}) if config else {}
        self.enforce_min_position_size_only = config.get(
            'enforce_min_position_size_only', True
        ) if config else True
        self.cumulative_risk_today = 0.0

        # Asset-specific risk configurations (to handle performance differences)
        # BTC/ETH underperform SOL, so we use tighter controls for those assets
        self.asset_configs = {
            'SOL/USDT': {
                'min_signal_strength_adjustment': 0.0,      # No adjustment (baseline: 0.25)
                'stop_loss_adjustment': 1.0,               # No adjustment (baseline: 2.0% or 1.5% in sideways)
                'position_size_multiplier': 1.0,           # Full position size
            },
            'BTC/USDT': {
                'min_signal_strength_adjustment': 0.05,    # +5% → 0.30 min signal strength (5% stricter)
                'stop_loss_adjustment': 0.95,              # -5% tighter stops (1.9% instead of 2%)
                'position_size_multiplier': 0.80,          # 20% smaller positions for BTC
            },
            'ETH/USDT': {
                'min_signal_strength_adjustment': 0.03,    # +3% → 0.28 min signal strength (3% stricter)
                'stop_loss_adjustment': 0.97,              # -3% tighter stops (1.94% instead of 2%)
                'position_size_multiplier': 0.90,          # 10% smaller positions for ETH
            }
        }
    
    def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Assess risk and calculate position size.
        
        Args:
            input_data: Contains market_data, analysis, and backtest_results
            
        Returns:
            Message with position sizing and risk assessment
        """
        self.log_execution_start("assess_and_size_position")
        
        try:
            market_data = input_data.get('market_data', {})
            analysis = input_data.get('analysis', {})
            backtest_results = input_data.get('backtest_results', {})
            
            if not market_data or not analysis:
                raise ValueError("Missing market data or analysis")
            
            risk_assessments = {}
            total_risk = 0.0
            all_approved = True
            
            for pair, data in market_data.items():
                pair_analysis = analysis.get(pair, {})
                pair_backtest = backtest_results.get(pair, {})
                
                # Assess risk for this pair
                assessment = self._assess_pair_risk(
                    pair, data, pair_analysis, pair_backtest
                )
                risk_assessments[pair] = assessment
                
                if assessment['position_approved']:
                    total_risk += assessment['risk_amount']
                else:
                    all_approved = False
                
                self.logger.info(
                    f"{pair}: {'✓ Approved' if assessment['position_approved'] else '✗ Rejected'} "
                    f"- Size: {assessment['position_size']:.4f}"
                )
                
                # Risk debug log for approved positions
                if assessment["position_approved"]:
                    self.logger.info(
                        "[RISK DEBUG] %s | price=%.4f, size=%.4f, notional=%.2f, "
                        "stop=%.4f, tp=%.4f, risk_amt=%.2f, risk_pct=%.3f%%, "
                        "sig=%.3f, win_rate=%.3f",
                        pair,
                        assessment["current_price"],
                        assessment["position_size"],
                        assessment["position_size_usd"],
                        assessment["stop_loss"],
                        assessment["take_profit"],
                        assessment["risk_amount"],
                        assessment["risk_pct_of_account"],
                        assessment["signal_strength"],
                        assessment["backtest_win_rate"],
                    )
            
            # Check if total risk exceeds daily limit
            if (self.cumulative_risk_today + total_risk) > (self.account_balance * self.max_daily_loss):
                all_approved = False
                rejection_reason = f"Daily loss limit would be exceeded: {self.cumulative_risk_today + total_risk:.2f} > {self.account_balance * self.max_daily_loss:.2f}"
                self.logger.warning(f"⚠️ {rejection_reason}")
            else:
                rejection_reason = None
            
            self.log_execution_end("assess_and_size_position", success=all_approved)
            
            # Update cumulative risk
            if all_approved:
                self.cumulative_risk_today += total_risk
            
            return self.create_message(
                action='assess_and_size_position',
                success=True,
                data={
                    'position_approved': all_approved,
                    'rejection_reason': rejection_reason,
                    'assessments': risk_assessments,
                    'total_risk_amount': total_risk,
                    'total_risk_pct': (total_risk / self.account_balance) * 100,
                    'cumulative_daily_risk': self.cumulative_risk_today,
                    'account_balance': self.account_balance,
                    # Pick first approved pair for execution (simplified)
                    'position_size': next(
                        (a['position_size'] for a in risk_assessments.values() if a['position_approved']),
                        0
                    ),
                    'stop_loss': next(
                        (a['stop_loss'] for a in risk_assessments.values() if a['position_approved']),
                        None
                    ),
                    'take_profit': next(
                        (a['take_profit'] for a in risk_assessments.values() if a['position_approved']),
                        None
                    )
                }
            )
        
        except Exception as e:
            error_msg = f"Risk assessment error: {str(e)}"
            self.set_status(AgentStatus.ERROR, error_msg)
            self.log_execution_end("assess_and_size_position", success=False)
            return self.create_message(
                action='assess_and_size_position',
                success=False,
                error=error_msg
            )
    
    def _assess_pair_risk(
        self,
        pair: str,
        market_data: Dict[str, Any],
        analysis: Dict[str, Any],
        backtest_results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Assess risk for a specific trading pair.
        CORRECTED: Uses proper position sizing formula based on stop-loss distance.
        
        Args:
            pair: Trading pair
            market_data: Market data for the pair
            analysis: Market analysis for the pair
            backtest_results: Backtesting results for the pair
            
        Returns:
            Risk assessment dictionary
        """
        # Extract current price
        current_price = market_data.get('current_price', 0) if isinstance(market_data, dict) else 0
        
        # Validate price is valid
        if current_price <= 0:
            return {
                'pair': pair,
                'current_price': current_price,
                'position_size': 0,
                'position_size_usd': 0,
                'stop_loss': 0,
                'take_profit': 0,
                'stop_loss_pct': self.default_stop_loss_pct * 100,
                'take_profit_pct': 0,
                'risk_amount': 0,
                'risk_pct_of_account': 0,
                'signal_strength': 0,
                'backtest_win_rate': 0,
                'position_approved': False,
                'rejection_reason': 'Invalid price',
                'risk_reward_ratio': 0
            }
        
        # Handle analysis data that might be nested
        if isinstance(analysis, dict) and pair in analysis:
            pair_analysis = analysis[pair]
        elif isinstance(analysis, dict):
            pair_analysis = analysis
        else:
            pair_analysis = {}
        
        signal_strength = pair_analysis.get('signal_strength', 0) if isinstance(pair_analysis, dict) else 0

        # Check volatility suitability (NEW - from Lambda research)
        volatility_approved = pair_analysis.get('volatility_approved', True)
        if not volatility_approved:
            volatility_msg = pair_analysis.get('volatility', 'unknown')
            self.logger.info(f"[{pair}] Position rejected: Volatility not suitable ({volatility_msg})")
            return {
                'pair': pair,
                'current_price': current_price,
                'position_size': 0,
                'position_size_usd': 0,
                'stop_loss': 0,
                'take_profit': 0,
                'stop_loss_pct': 0,
                'take_profit_pct': 0,
                'risk_amount': 0,
                'risk_pct_of_account': 0,
                'signal_strength': signal_strength,
                'backtest_win_rate': 0,
                'position_approved': False,
                'rejection_reason': f'Volatility not suitable ({volatility_msg})',
                'risk_reward_ratio': 0
            }

        # Check entry timing approval (maximum restraint)
        entry_timing_approved = pair_analysis.get('entry_timing_approved', True)
        if not entry_timing_approved:
            entry_timing_reason = pair_analysis.get('entry_timing_reason', 'Entry timing check failed')
            self.logger.info(f"[{pair}] Position rejected: {entry_timing_reason}")
            return {
                'pair': pair,
                'current_price': current_price,
                'position_size': 0,
                'position_size_usd': 0,
                'stop_loss': 0,
                'take_profit': 0,
                'stop_loss_pct': 0,
                'take_profit_pct': 0,
                'risk_amount': 0,
                'risk_pct_of_account': 0,
                'signal_strength': signal_strength,
                'backtest_win_rate': 0,
                'position_approved': False,
                'rejection_reason': f'Entry timing: {entry_timing_reason}',
                'risk_reward_ratio': 0
            }
        
        # Handle backtest results
        if isinstance(backtest_results, dict) and pair in backtest_results:
            pair_backtest = backtest_results[pair]
        elif isinstance(backtest_results, dict):
            pair_backtest = backtest_results
        else:
            pair_backtest = {}
        
        backtest_win_rate = pair_backtest.get('win_rate', 0.5) if isinstance(pair_backtest, dict) else 0.5
        
        # CORRECTED POSITION SIZING FORMULA
        # Step 1: Calculate max risk amount (1% of account by default)
        max_risk_amount = self.account_balance * self.risk_per_trade

        # Step 3: Calculate stop-loss price (IMPROVED - regime aware and asset-specific)
        # In sideways markets (low volatility), use tighter stops to minimize whipsaws
        current_regime = pair_analysis.get('regime', 'unknown')

        # Get asset-specific configuration (default to SOL if not found)
        asset_config = self.asset_configs.get(pair, self.asset_configs.get('SOL/USDT'))
        stop_loss_adjustment = asset_config['stop_loss_adjustment']
        position_size_multiplier = asset_config['position_size_multiplier']
        min_signal_strength_adjustment = asset_config['min_signal_strength_adjustment']

        # NEW: Adjust signal strength requirements based on market regime AND asset
        # In sideways markets, require stronger signals to avoid false entries
        adjusted_min_signal_strength = self.min_signal_strength + min_signal_strength_adjustment
        if current_regime == 'sideways':
            # Require stronger signals in sideways markets (45% vs default 25%)
            adjusted_min_signal_strength = max(adjusted_min_signal_strength, 0.45)
            self.logger.debug(f"[{pair}] Sideways regime: adjusted min signal strength {self.min_signal_strength + min_signal_strength_adjustment:.2f} → {adjusted_min_signal_strength:.2f}")
        else:
            self.logger.debug(f"[{pair}] Asset adjustment: min signal strength {self.min_signal_strength:.2f} → {adjusted_min_signal_strength:.2f}")

        if current_regime == 'sideways':
            # Use tighter stops in sideways markets (1.5% instead of 2%, then apply asset adjustment)
            base_stop_loss_pct = 0.015
            stop_loss_pct = base_stop_loss_pct * stop_loss_adjustment
            self.logger.info(f"[{pair}] Sideways regime detected - using tighter stop loss: {base_stop_loss_pct*100:.1f}% × {stop_loss_adjustment:.2f} = {stop_loss_pct*100:.2f}%")
        else:
            # Normal market: apply asset-specific adjustment to default stop loss
            stop_loss_pct = self.default_stop_loss_pct * stop_loss_adjustment
            if stop_loss_adjustment != 1.0:
                self.logger.debug(f"[{pair}] Asset adjustment: stop loss {self.default_stop_loss_pct*100:.1f}% × {stop_loss_adjustment:.2f} = {stop_loss_pct*100:.2f}%")
            else:
                stop_loss_pct = self.default_stop_loss_pct

        stop_loss = current_price * (1 - stop_loss_pct)
        
        # Step 4: Calculate risk per unit (the distance to stop-loss)
        risk_per_unit = current_price - stop_loss
        
        # Step 6: Enforce exchange minimum position size
        min_size_units = self.min_position_size_by_pair.get(pair, self.min_position_size_units)
        if self.enforce_min_position_size_only:
            # When enforcing minimum-only mode, skip dynamic sizing entirely
            if min_size_units <= 0:
                return {
                    'pair': pair,
                    'current_price': current_price,
                    'position_size': 0,
                    'position_size_usd': 0,
                    'stop_loss': stop_loss,
                    'take_profit': 0,
                    'stop_loss_pct': stop_loss_pct * 100,
                    'take_profit_pct': 0,
                    'risk_amount': 0,
                    'risk_pct_of_account': 0,
                    'signal_strength': signal_strength,
                    'backtest_win_rate': backtest_win_rate,
                    'position_approved': False,
                    'rejection_reason': 'Minimum position size not configured',
                    'risk_reward_ratio': 0
                }
            position_size = min_size_units
        else:
            # Step 2: Adjust based on signal strength and win rate (only when NOT enforcing minimum-only)
            confidence_multiplier = signal_strength * backtest_win_rate
            actual_risk_amount = max_risk_amount * confidence_multiplier

            # Step 5: Calculate position size using correct formula
            # CORRECT: position_size = risk_amount / risk_per_unit
            # This ensures: (position_size * risk_per_unit) = risk_amount
            if risk_per_unit > 0:
                position_size = actual_risk_amount / risk_per_unit
            else:
                position_size = 0

            # Apply asset-specific position size multiplier
            if position_size_multiplier != 1.0:
                original_position_size = position_size
                position_size = position_size * position_size_multiplier
                self.logger.debug(f"[{pair}] Asset adjustment: position size {original_position_size:.6f} × {position_size_multiplier:.2f} = {position_size:.6f}")

            # Enforce minimum if dynamic size is below minimum
            if min_size_units > 0 and position_size < min_size_units:
                position_size = min_size_units

        # Step 7: Validate position size doesn't exceed account balance
        position_size_usd = position_size * current_price
        if position_size_usd > self.account_balance:
            return {
                'pair': pair,
                'current_price': current_price,
                'position_size': 0,
                'position_size_usd': 0,
                'stop_loss': stop_loss,
                'take_profit': 0,
                'stop_loss_pct': stop_loss_pct * 100,
                'take_profit_pct': 0,
                'risk_amount': 0,
                'risk_pct_of_account': 0,
                'signal_strength': signal_strength,
                'backtest_win_rate': backtest_win_rate,
                'position_approved': False,
                'rejection_reason': 'Minimum position size exceeds account balance',
                'risk_reward_ratio': 0
            }

        # Recompute risk amount based on actual position size
        actual_risk_amount = position_size * risk_per_unit
        
        # Only validate against max risk if NOT in minimum-only mode
        if not self.enforce_min_position_size_only and actual_risk_amount > max_risk_amount:
            return {
                'pair': pair,
                'current_price': current_price,
                'position_size': 0,
                'position_size_usd': 0,
                'stop_loss': stop_loss,
                'take_profit': 0,
                'stop_loss_pct': stop_loss_pct * 100,
                'take_profit_pct': 0,
                'risk_amount': actual_risk_amount,
                'risk_pct_of_account': (actual_risk_amount / self.account_balance) * 100,
                'signal_strength': signal_strength,
                'backtest_win_rate': backtest_win_rate,
                'position_approved': False,
                'rejection_reason': 'Minimum position size exceeds max risk per trade',
                'risk_reward_ratio': 0
            }
        
        # Step 8: Calculate take-profit to meet risk-reward ratio
        take_profit_pct = stop_loss_pct * self.min_risk_reward_ratio
        take_profit = current_price * (1 + take_profit_pct)
        
        # Step 9: Check minimum notional value (avoid dust trades)
        if position_size_usd < self.min_notional_usd:
            return {
                'pair': pair,
                'current_price': current_price,
                'position_size': 0,
                'position_size_usd': 0,
                'stop_loss': stop_loss,
                'take_profit': take_profit,
                'stop_loss_pct': stop_loss_pct * 100,
                'take_profit_pct': take_profit_pct * 100,
                'risk_amount': actual_risk_amount,
                'risk_pct_of_account': (actual_risk_amount / self.account_balance) * 100,
                'signal_strength': signal_strength,
                'backtest_win_rate': backtest_win_rate,
                'position_approved': False,
                'rejection_reason': f"Position notional ${position_size_usd:.2f} below minimum ${self.min_notional_usd:.2f}",
                'risk_reward_ratio': take_profit_pct / stop_loss_pct if stop_loss_pct > 0 else 0
            }
        
        # Step 9: Validate the trade (skip signal/win rate checks in minimum-only mode)
        if self.enforce_min_position_size_only:
            # In minimum-only mode, we use the minimum size regardless of signal quality
            # So we only check that position size is valid
            approval = position_size > 0
            rejection_reason = None if approval else "Invalid position size"
        else:
            # Normal mode: validate signal strength and win rate with adjusted thresholds
            approval, rejection_reason = self._validate_trade(
                pair, position_size, signal_strength, backtest_win_rate, risk_per_unit, adjusted_min_signal_strength
            )
        
        return {
            'pair': pair,
            'current_price': current_price,
            'position_size': position_size,
            'position_size_usd': position_size * current_price,
            'stop_loss': stop_loss,
            'take_profit': take_profit,
            'stop_loss_pct': stop_loss_pct * 100,
            'take_profit_pct': take_profit_pct * 100,
            'risk_amount': actual_risk_amount,
            'risk_pct_of_account': (actual_risk_amount / self.account_balance) * 100,
            'signal_strength': signal_strength,
            'backtest_win_rate': backtest_win_rate,
            'position_approved': approval,
            'rejection_reason': rejection_reason,
            'risk_reward_ratio': take_profit_pct / stop_loss_pct if stop_loss_pct > 0 else 0
        }
    
    def _validate_trade(
        self,
        pair: str,
        position_size: float,
        signal_strength: float,
        win_rate: float,
        risk_per_unit: float,
        min_signal_strength: float = None  # NEW PARAMETER for regime-based thresholds
    ) -> tuple[bool, Optional[str]]:
        """
        Validate if a trade should be executed.

        Args:
            pair: Trading pair
            position_size: Size of position
            signal_strength: Signal confidence (0-1)
            win_rate: Historical win rate from backtesting
            risk_per_unit: Risk per unit of asset
            min_signal_strength: Override minimum signal strength (optional, for regime-based adjustments)

        Returns:
            Tuple of (is_valid, rejection_reason)
        """
        # Use provided threshold or default
        check_min_signal_strength = min_signal_strength if min_signal_strength is not None else self.min_signal_strength

        # Check minimum signal strength
        if signal_strength < check_min_signal_strength:
            return False, f"Signal strength too low ({signal_strength:.2f} < {check_min_signal_strength:.2f})"

        # Check win rate is positive
        if win_rate < self.min_win_rate:
            return False, f"Backtest win rate below {self.min_win_rate*100:.0f}% ({win_rate*100:.1f}%)"

        # Check position size is reasonable
        if position_size <= 0:
            return False, "Invalid position size"

        # All checks passed
        return True, None
    
    def reset_daily_risk(self) -> None:
        """Reset cumulative daily risk (call at market open)."""
        self.cumulative_risk_today = 0.0
        self.logger.info("Daily risk tracker reset")
    
    def update_account_balance(self, new_balance: float) -> None:
        """Update account balance (called after trades are executed)."""
        old_balance = self.account_balance
        self.account_balance = new_balance
        self.logger.info(f"Account balance updated: {old_balance:.2f} → {new_balance:.2f}")
