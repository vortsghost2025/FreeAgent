#!/usr/bin/env python3
"""
analyze-arb-data.py - Analyze arbitrage opportunity data
Run after collecting data with base-arb-data-collector.cjs
"""

import json
import os
from collections import defaultdict
from datetime import datetime
from pathlib import Path

PRICE_LOG = "price-snapshots.jsonl"
OPPORTUNITY_LOG = "opportunities.jsonl"
STATS_FILE = "session-stats.json"

def load_jsonl(filename):
    """Load JSONL file into list of dicts"""
    data = []
    if os.path.exists(filename):
        with open(filename, 'r') as f:
            for line in f:
                try:
                    data.append(json.loads(line.strip()))
                except json.JSONDecodeError:
                    pass
    return data

def load_stats():
    """Load session stats"""
    if os.path.exists(STATS_FILE):
        with open(STATS_FILE, 'r') as f:
            return json.load(f)
    return {}

def analyze_price_snapshots(snapshots):
    """Analyze price snapshot data"""
    if not snapshots:
        return {}
    
    spreads = []
    pool_prices = defaultdict(list)
    
    for snap in snapshots:
        if 'bestPair' in snap:
            bp = snap['bestPair']
            spreads.append(bp['spread'] * 100)  # Convert to percentage
            
            # Track individual pool prices
            for p in snap.get('prices', []):
                pool_prices[p['name']].append(p['price'])
    
    if not spreads:
        return {}
    
    return {
        'total_snapshots': len(snapshots),
        'spread_mean': sum(spreads) / len(spreads),
        'spread_median': sorted(spreads)[len(spreads)//2],
        'spread_max': max(spreads),
        'spread_min': min(spreads),
        'spreads_above_015': len([s for s in spreads if s >= 0.15]),
        'spreads_above_020': len([s for s in spreads if s >= 0.20]),
        'spreads_above_025': len([s for s in spreads if s >= 0.25]),
        'spreads_above_030': len([s for s in spreads if s >= 0.30]),
    }

def analyze_opportunities(opportunities):
    """Analyze logged opportunities"""
    if not opportunities:
        return {
            'total': 0,
            'total_profit': 0,
            'avg_profit': 0,
            'max_profit': 0,
            'profitable_count': 0
        }
    
    profits = [o['profitUSD'] for o in opportunities]
    return {
        'total': len(opportunities),
        'total_profit': sum(profits),
        'avg_profit': sum(profits) / len(profits),
        'max_profit': max(profits),
        'profitable_count': len([p for p in profits if p > 0])
    }

def get_timing_insights(snapshots):
    """Analyze timing patterns"""
    if not snapshots:
        return {}
    
    # Group by hour of day (UTC)
    hourly_spreads = defaultdict(list)
    
    for snap in snapshots:
        if 'bestPair' in snap and 'timestamp' in snap:
            try:
                dt = datetime.fromtimestamp(snap['timestamp'] / 1000)
                hour = dt.hour
                hourly_spreads[hour].append(snap['bestPair']['spread'] * 100)
            except:
                pass
    
    if not hourly_spreads:
        return {}
    
    hourly_avg = {h: sum(s)/len(s) for h, s in hourly_spreads.items()}
    best_hour = max(hourly_avg.items(), key=lambda x: x[1])
    
    return {
        'hours_tracked': len(hourly_spreads),
        'best_hour_utc': best_hour[0],
        'best_hour_avg_spread': best_hour[1],
        'hourly_averages': dict(hourly_avg)
    }

def generate_recommendations(stats, price_analysis, opp_analysis, timing):
    """Generate strategic recommendations"""
    recs = []
    
    max_spread = price_analysis.get('spread_max', 0)
    profitable_pct = (price_analysis.get('spreads_above_030', 0) / max(price_analysis.get('total_snapshots', 1), 1)) * 100
    
    if max_spread >= 0.30:
        recs.append("✅ Market shows 0.30%+ spreads - AUTO-EXECUTE may be viable")
    elif max_spread >= 0.25:
        recs.append("⚠️  Max spread ~0.25% - borderline profitable, consider larger trades")
    elif max_spread >= 0.20:
        recs.append("❌ Max spread ~0.20% - likely not profitable after gas")
    else:
        recs.append("❌ Market very efficient - consider different pool pairs or chains")
    
    if timing.get('best_hour_utc') is not None:
        recs.append(f"⏰ Best trading hour: {timing['best_hour_utc']}:00 UTC")
    
    if stats.get('poolPairStats'):
        top_pairs = sorted(stats['poolPairStats'].items(), 
                         key=lambda x: x[1]['maxSpread'], reverse=True)[:3]
        recs.append(f"🏆 Top pairs: {', '.join([p[0] for p in top_pairs])}")
    
    return recs

def main():
    print("=" * 70)
    print("📊 ARBITRAGE DATA ANALYSIS")
    print("=" * 70 + "\n")
    
    # Load data
    snapshots = load_jsonl(PRICE_LOG)
    opportunities = load_jsonl(OPPORTUNITY_LOG)
    stats = load_stats()
    
    print(f"📁 Files analyzed:")
    print(f"   - {PRICE_LOG}: {len(snapshots)} snapshots")
    print(f"   - {OPPORTUNITY_LOG}: {len(opportunities)} opportunities")
    print(f"   - {STATS_FILE}: {'Found' if stats else 'Not found'}")
    print()
    
    # Session overview
    if stats:
        print("📈 SESSION OVERVIEW")
        print("-" * 40)
        runtime_mins = (Date.now() - stats.get('startTime', Date.now())) / 60000 if stats.get('startTime') else 0
        print(f"   Runtime: {runtime_mins:.1f} minutes")
        print(f"   Iterations: {stats.get('iterations', 0)}")
        print(f"   Max spread seen: {(stats.get('maxSpread', 0) * 100):.3f}%")
        print(f"   Opportunities logged: {stats.get('opportunitiesFound', 0)}")
        print()
    
    # Price analysis
    print("📉 PRICE SPREAD ANALYSIS")
    print("-" * 40)
    price_analysis = analyze_price_snapshots(snapshots)
    
    if price_analysis:
        print(f"   Total snapshots: {price_analysis['total_snapshots']}")
        print(f"   Mean spread: {price_analysis['spread_mean']:.3f}%")
        print(f"   Median spread: {price_analysis['spread_median']:.3f}%")
        print(f"   Max spread: {price_analysis['spread_max']:.3f}%")
        print(f"   Min spread: {price_analysis['spread_min']:.3f}%")
        print()
        print("   Spread distribution:")
        print(f"   - ≥0.15%: {price_analysis['spreads_above_015']} ({price_analysis['spreads_above_015']/max(price_analysis['total_snapshots'],1)*100:.1f}%)")
        print(f"   - ≥0.20%: {price_analysis['spreads_above_020']} ({price_analysis['spreads_above_020']/max(price_analysis['total_snapshots'],1)*100:.1f}%)")
        print(f"   - ≥0.25%: {price_analysis['spreads_above_025']} ({price_analysis['spreads_above_025']/max(price_analysis['total_snapshots'],1)*100:.1f}%)")
        print(f"   - ≥0.30%: {price_analysis['spreads_above_030']} ({price_analysis['spreads_above_030']/max(price_analysis['total_snapshots'],1)*100:.1f}%)")
        print()
    else:
        print("   No price data collected yet\n")
    
    # Opportunity analysis
    print("💰 OPPORTUNITY ANALYSIS")
    print("-" * 40)
    opp_analysis = analyze_opportunities(opportunities)
    
    if opp_analysis['total'] > 0:
        print(f"   Total opportunities: {opp_analysis['total']}")
        print(f"   Total potential profit: ${opp_analysis['total_profit']:.4f}")
        print(f"   Average profit: ${opp_analysis['avg_profit']:.4f}")
        print(f"   Max profit: ${opp_analysis['max_profit']:.4f}")
        print()
    else:
        print("   No opportunities logged (spread never exceeded threshold)\n")
    
    # Timing insights
    print("⏰ TIMING INSIGHTS")
    print("-" * 40)
    timing = get_timing_insights(snapshots)
    
    if timing:
        if timing.get('best_hour_utc') is not None:
            print(f"   Best trading hour: {timing['best_hour_utc']}:00 UTC")
            print(f"   Average spread at best hour: {timing['best_hour_avg_spread']:.3f}%")
        print(f"   Hours tracked: {timing.get('hours_tracked', 0)}")
        print()
    else:
        print("   Not enough timing data\n")
    
    # Pool pair stats
    if stats.get('poolPairStats'):
        print("🏆 POOL PAIR PERFORMANCE")
        print("-" * 40)
        sorted_pairs = sorted(stats['poolPairStats'].items(), 
                           key=lambda x: x[1]['maxSpread'], reverse=True)
        for pair, data in sorted_pairs:
            print(f"   {pair}: max {data['maxSpread']*100:.2f}%, {data['count']} observations")
        print()
    
    # Recommendations
    print("🎯 RECOMMENDATIONS")
    print("-" * 40)
    recs = generate_recommendations(stats, price_analysis, opp_analysis, timing)
    for rec in recs:
        print(f"   {rec}")
    print()
    
    print("=" * 70)
    print("Analysis complete. Run collector longer for better insights!")
    print("=" * 70)

if __name__ == "__main__":
    main()
