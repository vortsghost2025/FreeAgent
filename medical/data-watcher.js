// Data Watcher - Adapted from MEV pool-watcher.js  
// Monitors real-time data sources for agent decision making

import axios from 'axios';
import { EventEmitter } from 'events';

class DataWatcher extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.sources = config.sources || [
            { type: 'news', url: 'https://newsapi.org/v2/top-headlines', enabled: true },
            { type: 'social', url: 'https://api.twitter.com/2/tweets/search/recent', enabled: true },
            { type: 'market', url: 'https://api.coingecko.com/api/v3/simple/price', enabled: true }
        ];
        
        this.watchInterval = config.interval || 5000; // 5 seconds
        this.cache = new Map();
        this.running = false;
        this.watchTimer = null;
        
        this.apiKeys = {
            news: process.env.NEWS_API_KEY,
            twitter: process.env.TWITTER_BEARER_TOKEN,
            coingecko: null // No key required
        };
        
        this.initializeSources();
    }

    initializeSources() {
        console.log('🔍 Initializing data sources...');
        
        this.sources.forEach(source => {
            if (source.enabled) {
                console.log(`✅ Enabled ${source.type} source: ${source.url}`);
            } else {
                console.log(`❌ Disabled ${source.type} source`);
            }
        });
    }

    async start() {
        if (this.running) return;
        
        console.log('🚀 Starting data watcher...');
        this.running = true;
        
        // Initial data fetch
        await this.fetchAllData();
        
        // Start periodic watching
        this.watchTimer = setInterval(() => {
            this.fetchAllData();
        }, this.watchInterval);
        
        console.log(`⏰ Data watcher active - checking every ${this.watchInterval}ms`);
    }

    async fetchAllData() {
        const promises = this.sources
            .filter(source => source.enabled)
            .map(source => this.fetchSourceData(source));
        
        await Promise.allSettled(promises);
    }

    async fetchSourceData(source) {
        try {
            let data;
            
            switch (source.type) {
                case 'news':
                    data = await this.fetchNewsData();
                    break;
                case 'social':
                    data = await this.fetchSocialData();
                    break;
                case 'market':
                    data = await this.fetchMarketData();
                    break;
                default:
                    throw new Error(`Unknown source type: ${source.type}`);
            }
            
            // Cache the data
            this.cache.set(source.type, {
                data,
                timestamp: Date.now(),
                source: source.url
            });
            
            // Emit data event for subscribers
            this.emit('data-update', {
                type: source.type,
                data,
                timestamp: Date.now()
            });
            
            console.log(`🔄 [${source.type}] Updated: ${Array.isArray(data) ? data.length : '1'} items`);
            
        } catch (error) {
            console.error(`❌ Failed to fetch ${source.type} data:`, error.message);
            this.emit('data-error', { type: source.type, error: error.message });
        }
    }

    async fetchNewsData() {
        if (!this.apiKeys.news) {
            // Return simulated data if no API key
            return this.generateSimulatedNews();
        }
        
        try {
            const response = await axios.get('https://newsapi.org/v2/top-headlines', {
                params: {
                    category: 'technology',
                    language: 'en',
                    pageSize: 10
                },
                headers: {
                    'Authorization': `Bearer ${this.apiKeys.news}`
                }
            });
            
            return response.data.articles.map(article => ({
                title: article.title,
                description: article.description,
                url: article.url,
                publishedAt: article.publishedAt,
                source: article.source.name,
                sentiment: this.analyzeSentiment(article.description || article.title)
            }));
        } catch (error) {
            console.warn('📰 News API failed, using simulated data');
            return this.generateSimulatedNews();
        }
    }

    async fetchSocialData() {
        if (!this.apiKeys.twitter) {
            return this.generateSimulatedSocial();
        }
        
        try {
            const response = await axios.get('https://api.twitter.com/2/tweets/search/recent', {
                params: {
                    query: 'AI OR cryptocurrency OR blockchain -is:retweet',
                    max_results: 20,
                    'tweet.fields': 'created_at,public_metrics'
                },
                headers: {
                    'Authorization': `Bearer ${this.apiKeys.twitter}`
                }
            });
            
            return response.data.data.map(tweet => ({
                id: tweet.id,
                text: tweet.text,
                createdAt: tweet.created_at,
                likes: tweet.public_metrics.like_count,
                retweets: tweet.public_metrics.retweet_count,
                sentiment: this.analyzeSentiment(tweet.text)
            }));
        } catch (error) {
            console.warn('📱 Social API failed, using simulated data');
            return this.generateSimulatedSocial();
        }
    }

    async fetchMarketData() {
        try {
            const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
                params: {
                    ids: 'bitcoin,ethereum,cardano,solana,polkadot',
                    vs_currencies: 'usd',
                    include_24hr_change: true
                }
            });
            
            return Object.entries(response.data).map(([coin, data]) => ({
                coin: coin.toUpperCase(),
                price: data.usd,
                change24h: data.usd_24h_change,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.warn('💰 Market API failed, using simulated data');
            return this.generateSimulatedMarket();
        }
    }

    analyzeSentiment(text) {
        // Simple sentiment analysis (would use proper NLP in production)
        const positiveWords = ['good', 'great', 'excellent', 'positive', 'bullish', 'surge', 'jump'];
        const negativeWords = ['bad', 'terrible', 'negative', 'bearish', 'crash', 'drop', 'fall'];
        
        const words = text.toLowerCase().split(/\W+/);
        let score = 0;
        
        words.forEach(word => {
            if (positiveWords.includes(word)) score += 1;
            if (negativeWords.includes(word)) score -= 1;
        });
        
        if (score > 0) return 'POSITIVE';
        if (score < 0) return 'NEGATIVE';
        return 'NEUTRAL';
    }

    // Simulated data generators for testing
    generateSimulatedNews() {
        const topics = ['AI breakthrough', 'Market volatility', 'Regulatory update', 'Technology innovation'];
        return Array.from({ length: 5 }, (_, i) => ({
            title: `${topics[Math.floor(Math.random() * topics.length)]} reported`,
            description: `Recent developments in ${['finance', 'technology', 'regulation'][Math.floor(Math.random() * 3)]}`,
            url: 'https://example.com/news',
            publishedAt: new Date(Date.now() - Math.random() * 3600000).toISOString(),
            source: ['TechCrunch', 'Reuters', 'Bloomberg'][Math.floor(Math.random() * 3)],
            sentiment: ['POSITIVE', 'NEGATIVE', 'NEUTRAL'][Math.floor(Math.random() * 3)]
        }));
    }

    generateSimulatedSocial() {
        return Array.from({ length: 8 }, (_, i) => ({
            id: `tweet_${i}`,
            text: `Breaking: ${['Market', 'AI', 'Crypto'][Math.floor(Math.random() * 3)]} ${['surges', 'drops', 'stabilizes'][Math.floor(Math.random() * 3)]}`,
            createdAt: new Date(Date.now() - Math.random() * 1800000).toISOString(),
            likes: Math.floor(Math.random() * 1000),
            retweets: Math.floor(Math.random() * 100),
            sentiment: ['POSITIVE', 'NEGATIVE', 'NEUTRAL'][Math.floor(Math.random() * 3)]
        }));
    }

    generateSimulatedMarket() {
        return [
            { coin: 'BTC', price: 45000 + Math.random() * 5000, change24h: (Math.random() - 0.5) * 10, timestamp: Date.now() },
            { coin: 'ETH', price: 2500 + Math.random() * 500, change24h: (Math.random() - 0.5) * 8, timestamp: Date.now() },
            { coin: 'ADA', price: 0.5 + Math.random() * 0.5, change24h: (Math.random() - 0.5) * 15, timestamp: Date.now() }
        ];
    }

    getData(type) {
        const cached = this.cache.get(type);
        if (!cached) return null;
        
        // Check if data is stale (older than 2 minutes)
        if (Date.now() - cached.timestamp > 120000) {
            return null;
        }
        
        return cached.data;
    }

    getAllData() {
        const result = {};
        for (const [type, cache] of this.cache) {
            if (Date.now() - cache.timestamp <= 120000) {
                result[type] = cache.data;
            }
        }
        return result;
    }

    getHealthStatus() {
        return {
            running: this.running,
            sources: this.sources.length,
            activeSources: this.sources.filter(s => s.enabled).length,
            cacheSize: this.cache.size,
            lastUpdate: Math.max(...Array.from(this.cache.values()).map(c => c.timestamp), 0)
        };
    }

    stop() {
        if (this.watchTimer) {
            clearInterval(this.watchTimer);
            this.watchTimer = null;
        }
        this.running = false;
        console.log('🛑 Data watcher stopped');
    }
}

export { DataWatcher };