# consensus_checker/rate_limiter.py
"""Simple file-based rate limiting for consensus checker"""

import json
import time
from pathlib import Path
from typing import Dict, Tuple
from datetime import datetime, timedelta

class RateLimiter:
    """File-based rate limiter to conserve API credits"""
    
    def __init__(self, storage_file: Path, max_checks_per_hour: int):
        self.storage_file = storage_file
        self.max_checks_per_hour = max_checks_per_hour
        self._ensure_storage_exists()
    
    def _ensure_storage_exists(self):
        """Create storage file if it doesn't exist"""
        if not self.storage_file.exists():
            self._write_data({"checks": [], "total_checks": 0})
    
    def _read_data(self) -> Dict:
        """Read rate limit data from file"""
        try:
            with open(self.storage_file, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return {"checks": [], "total_checks": 0}
    
    def _write_data(self, data: Dict):
        """Write rate limit data to file"""
        with open(self.storage_file, 'w') as f:
            json.dump(data, f, indent=2)
    
    def _clean_old_checks(self, checks: list) -> list:
        """Remove checks older than 1 hour"""
        one_hour_ago = time.time() - 3600
        return [check for check in checks if check > one_hour_ago]
    
    def check_rate_limit(self) -> Tuple[bool, str, int]:
        """
        Check if rate limit allows another verification
        
        Returns:
            (allowed: bool, message: str, checks_remaining: int)
        """
        data = self._read_data()
        checks = self._clean_old_checks(data["checks"])
        
        checks_in_last_hour = len(checks)
        checks_remaining = max(0, self.max_checks_per_hour - checks_in_last_hour)
        
        if checks_in_last_hour >= self.max_checks_per_hour:
            oldest_check = min(checks)
            time_until_reset = int(oldest_check + 3600 - time.time())
            minutes = time_until_reset // 60
            
            return (
                False,
                f"Rate limit reached. {checks_in_last_hour}/{self.max_checks_per_hour} checks used in last hour. Try again in {minutes} minutes.",
                0
            )
        
        return (
            True,
            f"Rate limit OK. {checks_remaining} checks remaining this hour.",
            checks_remaining
        )
    
    def record_check(self):
        """Record a successful check"""
        data = self._read_data()
        checks = self._clean_old_checks(data["checks"])
        checks.append(time.time())
        
        data["checks"] = checks
        data["total_checks"] = data.get("total_checks", 0) + 1
        
        self._write_data(data)
    
    def get_stats(self) -> Dict:
        """Get usage statistics"""
        data = self._read_data()
        checks = self._clean_old_checks(data["checks"])
        
        return {
            "checks_last_hour": len(checks),
            "total_checks_all_time": data.get("total_checks", 0),
            "limit_per_hour": self.max_checks_per_hour
        }
