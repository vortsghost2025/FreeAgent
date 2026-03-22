/**
 * Web Scraper & Scheduler - Phase 2 Automation Layer
 * Feeds the stable foundation with real data and automated workflows
 */

import { EventEmitter } from 'events';
import axios from 'axios';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Intelligent Web Scraper - Data ingestion engine
 */
class WebScraper extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      maxConcurrent: config.maxConcurrent || 3,
      timeout: config.timeout || 10000,
      retryAttempts: config.retryAttempts || 3,
      userAgent: config.userAgent || 'Kilo-Platform/1.0',
      ...config
    };
    
    this.scrapingJobs = new Map();
    this.activeScrapers = 0;
    this.stats = {
      totalScrapes: 0,
      successfulScrapes: 0,
      failedScrapes: 0,
      dataPointsCollected: 0
    };
  }

  /**
   * Schedule scraping job with cron-like syntax
   */
  scheduleScrape(jobConfig) {
    const jobId = `scrape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job = {
      id: jobId,
      url: jobConfig.url,
      selector: jobConfig.selector,
      interval: jobConfig.interval || 300000, // 5 minutes default
      parser: jobConfig.parser || this._defaultParser,
      transform: jobConfig.transform || ((data) => data),
      active: true,
      lastRun: null,
      nextRun: Date.now() + (jobConfig.delay || 0)
    };
    
    this.scrapingJobs.set(jobId, job);
    
    // Start the scraping loop
    this._startScrapingJob(job);
    
    this.emit('scrape:scheduled', job);
    return jobId;
  }

  _startScrapingJob(job) {
    const runJob = async () => {
      if (!job.active) return;
      
      try {
        const data = await this.scrapeUrl(job.url, job.selector, job.parser);
        const transformed = job.transform(data);
        
        job.lastRun = Date.now();
        this.stats.successfulScrapes++;
        this.stats.dataPointsCollected += Array.isArray(transformed) ? transformed.length : 1;
        
        this.emit('scrape:completed', {
          jobId: job.id,
          url: job.url,
          data: transformed,
          timestamp: new Date().toISOString()
        });
        
        // Schedule next run
        job.nextRun = Date.now() + job.interval;
        setTimeout(runJob, job.interval);
        
      } catch (error) {
        this.stats.failedScrapes++;
        this.emit('scrape:failed', {
          jobId: job.id,
          url: job.url,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        
        // Retry with exponential backoff
        if (this.stats.failedScrapes < this.config.retryAttempts) {
          const backoff = Math.pow(2, this.stats.failedScrapes) * 1000;
          setTimeout(runJob, backoff);
        }
      }
    };
    
    // Initial run
    const initialDelay = Math.max(0, job.nextRun - Date.now());
    setTimeout(runJob, initialDelay);
  }

  async scrapeUrl(url, selector = null, parser = null) {
    if (this.activeScrapers >= this.config.maxConcurrent) {
      throw new Error('Max concurrent scrapers reached');
    }
    
    this.activeScrapers++;
    this.stats.totalScrapes++;
    
    try {
      const response = await axios.get(url, {
        timeout: this.config.timeout,
        headers: {
          'User-Agent': this.config.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });
      
      const rawData = response.data;
      const parsedData = parser ? parser(rawData, selector) : rawData;
      
      return parsedData;
      
    } finally {
      this.activeScrapers--;
    }
  }

  _defaultParser(html, selector) {
    // Simple HTML parsing - in production, use cheerio or similar
    if (!selector) return html;
    
    // Mock parsing for demo
    const mockData = {
      price: (50000 + Math.random() * 10000).toFixed(2),
      volume: (1000000 + Math.random() * 5000000).toFixed(0),
      change: ((Math.random() - 0.5) * 10).toFixed(2)
    };
    
    return mockData;
  }

  stopJob(jobId) {
    const job = this.scrapingJobs.get(jobId);
    if (job) {
      job.active = false;
      this.scrapingJobs.delete(jobId);
      this.emit('scrape:stopped', { jobId });
    }
  }

  getStats() {
    return {
      ...this.stats,
      activeJobs: this.scrapingJobs.size,
      activeScrapers: this.activeScrapers,
      successRate: this.stats.totalScrapes > 0 
        ? (this.stats.successfulScrapes / this.stats.totalScrapes * 100).toFixed(1) + '%'
        : '0%'
    };
  }
}

/**
 * Intelligent Scheduler - Workflow automation engine
 */
class IntelligentScheduler extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      maxConcurrentWorkflows: config.maxConcurrentWorkflows || 5,
      defaultTimeout: config.defaultTimeout || 300000, // 5 minutes
      ...config
    };
    
    this.workflows = new Map();
    this.runningWorkflows = new Set();
    this.workflowHistory = [];
    
    this.stats = {
      totalWorkflows: 0,
      completedWorkflows: 0,
      failedWorkflows: 0,
      avgCompletionTime: 0
    };
  }

  /**
   * Define and schedule automated workflow
   */
  defineWorkflow(name, steps, trigger = null) {
    const workflowId = `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const workflow = {
      id: workflowId,
      name,
      steps,
      trigger,
      status: 'pending',
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      results: []
    };
    
    this.workflows.set(workflowId, workflow);
    
    // Set up trigger if provided
    if (trigger) {
      this._setupTrigger(workflow, trigger);
    }
    
    this.emit('workflow:defined', workflow);
    return workflowId;
  }

  _setupTrigger(workflow, trigger) {
    switch (trigger.type) {
      case 'interval':
        setInterval(() => {
          if (this.runningWorkflows.size < this.config.maxConcurrentWorkflows) {
            this.executeWorkflow(workflow.id);
          }
        }, trigger.interval);
        break;
        
      case 'event':
        // Listen for specific events
        this.on(trigger.event, () => {
          if (this.runningWorkflows.size < this.config.maxConcurrentWorkflows) {
            this.executeWorkflow(workflow.id);
          }
        });
        break;
        
      case 'schedule':
        // Cron-like scheduling
        this._scheduleWorkflow(workflow, trigger.cron);
        break;
    }
  }

  async executeWorkflow(workflowId) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow || this.runningWorkflows.has(workflowId)) {
      return;
    }
    
    this.runningWorkflows.add(workflowId);
    workflow.status = 'running';
    workflow.startedAt = Date.now();
    
    this.emit('workflow:started', workflow);
    
    try {
      const results = [];
      
      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        const startTime = Date.now();
        
        try {
          const result = await this._executeStep(step, results);
          const duration = Date.now() - startTime;
          
          results.push({
            step: i + 1,
            name: step.name,
            result,
            duration,
            status: 'success'
          });
          
          this.emit('workflow:step:completed', {
            workflowId,
            step: i + 1,
            result,
            duration
          });
          
        } catch (error) {
          const duration = Date.now() - startTime;
          
          results.push({
            step: i + 1,
            name: step.name,
            error: error.message,
            duration,
            status: 'failed'
          });
          
          this.emit('workflow:step:failed', {
            workflowId,
            step: i + 1,
            error: error.message,
            duration
          });
          
          throw error; // Stop workflow on step failure
        }
      }
      
      workflow.results = results;
      workflow.status = 'completed';
      workflow.completedAt = Date.now();
      
      this.stats.completedWorkflows++;
      this._updateAvgCompletionTime(workflow.completedAt - workflow.startedAt);
      
      this.emit('workflow:completed', workflow);
      
    } catch (error) {
      workflow.status = 'failed';
      workflow.completedAt = Date.now();
      workflow.error = error.message;
      
      this.stats.failedWorkflows++;
      this.emit('workflow:failed', { ...workflow, error: error.message });
      
    } finally {
      this.runningWorkflows.delete(workflowId);
      this.workflowHistory.push({ ...workflow });
      
      // Keep only recent history
      if (this.workflowHistory.length > 100) {
        this.workflowHistory.shift();
      }
    }
  }

  async _executeStep(step, previousResults) {
    switch (step.type) {
      case 'api-call':
        return await this._executeApiCall(step.config);
        
      case 'data-processing':
        return await this._executeDataProcessing(step.config, previousResults);
        
      case 'notification':
        return await this._executeNotification(step.config, previousResults);
        
      case 'storage':
        return await this._executeStorage(step.config, previousResults);
        
      case 'custom':
        return await step.executor(previousResults);
        
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  async _executeApiCall(config) {
    const response = await axios(config);
    return response.data;
  }

  async _executeDataProcessing(config, previousResults) {
    // Mock data processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      processed: true,
      count: previousResults.length,
      timestamp: new Date().toISOString()
    };
  }

  async _executeNotification(config, previousResults) {
    // Mock notification
    console.log(`🔔 Notification: ${config.message}`);
    return { sent: true, recipients: config.recipients || [] };
  }

  async _executeStorage(config, previousResults) {
    // Mock storage
    const filename = `workflow_${Date.now()}.json`;
    await fs.promises.writeFile(filename, JSON.stringify(previousResults, null, 2));
    return { stored: true, filename };
  }

  _updateAvgCompletionTime(duration) {
    this.stats.avgCompletionTime = (
      (this.stats.avgCompletionTime * (this.stats.completedWorkflows - 1) + duration) / 
      this.stats.completedWorkflows
    );
  }

  getStats() {
    return {
      ...this.stats,
      activeWorkflows: this.runningWorkflows.size,
      definedWorkflows: this.workflows.size,
      successRate: this.stats.totalWorkflows > 0
        ? (this.stats.completedWorkflows / this.stats.totalWorkflows * 100).toFixed(1) + '%'
        : '0%',
      avgCompletionTime: `${(this.stats.avgCompletionTime / 1000).toFixed(1)}s`
    };
  }
}

/**
 * Business Integration Layer - Gmail/Calendar connectivity
 */
class BusinessIntegrator extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      gmailEnabled: config.gmailEnabled || false,
      calendarEnabled: config.calendarEnabled || false,
      ...config
    };
    
    this.integrations = {
      gmail: null,
      calendar: null
    };
    
    this.stats = {
      emailsProcessed: 0,
      calendarEvents: 0,
      integrationsActive: 0
    };
  }

  async initialize() {
    console.log('📧 Initializing Business Integrations...');
    
    if (this.config.gmailEnabled) {
      await this._setupGmail();
    }
    
    if (this.config.calendarEnabled) {
      await this._setupCalendar();
    }
    
    console.log('✅ Business Integrations ready');
  }

  async _setupGmail() {
    // Mock Gmail setup - in reality would use Google APIs
    this.integrations.gmail = {
      client: 'mock-gmail-client',
      watchLabels: ['INBOX', 'Kilo-Notifications'],
      lastCheck: Date.now()
    };
    
    this.stats.integrationsActive++;
    this.emit('gmail:connected');
    
    // Simulate email monitoring
    setInterval(() => {
      this._checkEmails();
    }, 300000); // Check every 5 minutes
  }

  async _setupCalendar() {
    // Mock Calendar setup
    this.integrations.calendar = {
      client: 'mock-calendar-client',
      watchCalendars: ['primary', 'work'],
      lastSync: Date.now()
    };
    
    this.stats.integrationsActive++;
    this.emit('calendar:connected');
    
    // Simulate calendar monitoring
    setInterval(() => {
      this._checkCalendar();
    }, 600000); // Check every 10 minutes
  }

  async _checkEmails() {
    if (!this.integrations.gmail) return;
    
    // Mock email checking
    const newEmails = Math.floor(Math.random() * 3);
    if (newEmails > 0) {
      this.stats.emailsProcessed += newEmails;
      this.emit('emails:received', { count: newEmails });
    }
  }

  async _checkCalendar() {
    if (!this.integrations.calendar) return;
    
    // Mock calendar checking
    const upcomingEvents = Math.floor(Math.random() * 2);
    if (upcomingEvents > 0) {
      this.stats.calendarEvents += upcomingEvents;
      this.emit('calendar:events', { count: upcomingEvents });
    }
  }

  getStats() {
    return {
      ...this.stats,
      gmailActive: !!this.integrations.gmail,
      calendarActive: !!this.integrations.calendar
    };
  }
}

/**
 * Phase 2 Automation Orchestrator
 * Combines all components into a self-feeding system
 */
class Phase2Orchestrator extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      autoStart: config.autoStart !== false,
      ...config
    };
    
    // Core components
    this.webScraper = new WebScraper(config.scraper);
    this.scheduler = new IntelligentScheduler(config.scheduler);
    this.businessIntegrator = new BusinessIntegrator(config.business);
    
    this.isRunning = false;
    this.startTime = null;
    
    this._setupComponentIntegration();
  }

  _setupComponentIntegration() {
    // Connect scraper events to scheduler
    this.webScraper.on('scrape:completed', (data) => {
      this.emit('data:collected', data);
      // Trigger relevant workflows based on scraped data
      this._triggerDataWorkflows(data);
    });
    
    // Connect scheduler events to business integrations
    this.scheduler.on('workflow:completed', (workflow) => {
      this.emit('automation:completed', workflow);
      // Send notifications for important completions
      this._sendCompletionNotifications(workflow);
    });
    
    // Connect business events to system
    this.businessIntegrator.on('emails:received', (data) => {
      this.emit('business:email', data);
    });
    
    this.businessIntegrator.on('calendar:events', (data) => {
      this.emit('business:calendar', data);
    });
  }

  async initialize() {
    console.log('🚀 Initializing Phase 2 Automation System');
    console.log('========================================\n');
    
    await this.businessIntegrator.initialize();
    
    // Define core workflows
    this._defineCoreWorkflows();
    
    // Set up data collection
    this._setupDataCollection();
    
    this.startTime = Date.now();
    this.isRunning = true;
    
    this.emit('phase2:initialized');
    
    if (this.config.autoStart) {
      await this.start();
    }
    
    return this;
  }

  _defineCoreWorkflows() {
    // Market Data Processing Workflow
    this.scheduler.defineWorkflow('market-data-processing', [
      {
        name: 'Collect Latest Prices',
        type: 'api-call',
        config: {
          url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd',
          method: 'GET'
        }
      },
      {
        name: 'Analyze Price Movements',
        type: 'data-processing',
        config: { analysisType: 'volatility' }
      },
      {
        name: 'Store Historical Data',
        type: 'storage',
        config: { collection: 'price_history' }
      },
      {
        name: 'Send Alert if Significant Move',
        type: 'notification',
        config: { 
          message: 'Significant price movement detected',
          recipients: ['admin@kilo-platform.com']
        }
      }
    ], { type: 'interval', interval: 300000 }); // Every 5 minutes

    // System Health Monitoring Workflow
    this.scheduler.defineWorkflow('system-health-monitor', [
      {
        name: 'Check Component Status',
        type: 'custom',
        executor: async () => {
          return {
            scraper: this.webScraper.getStats(),
            scheduler: this.scheduler.getStats(),
            business: this.businessIntegrator.getStats()
          };
        }
      },
      {
        name: 'Generate Health Report',
        type: 'data-processing',
        config: { reportType: 'health-summary' }
      },
      {
        name: 'Log Health Data',
        type: 'storage',
        config: { collection: 'system_health' }
      }
    ], { type: 'interval', interval: 60000 }); // Every minute
  }

  _setupDataCollection() {
    // Schedule cryptocurrency data scraping
    this.webScraper.scheduleScrape({
      url: 'https://coinmarketcap.com/',
      selector: '.cmc-table-row',
      interval: 300000, // 5 minutes
      parser: (html) => this._parseCryptoData(html),
      transform: (data) => this._transformMarketData(data)
    });

    // Schedule DeFi protocol data
    this.webScraper.scheduleScrape({
      url: 'https://defillama.com/',
      selector: '.protocol-card',
      interval: 600000, // 10 minutes
      parser: (html) => this._parseDefiData(html),
      transform: (data) => this._transformProtocolData(data)
    });
  }

  _parseCryptoData(html) {
    // Mock parsing - real implementation would use proper HTML parsing
    return {
      btc: { price: 55000 + Math.random() * 5000, change: (Math.random() - 0.5) * 10 },
      eth: { price: 3000 + Math.random() * 1000, change: (Math.random() - 0.5) * 15 }
    };
  }

  _parseDefiData(html) {
    return {
      tvl: 50000000000 + Math.random() * 10000000000,
      protocols: 200 + Math.floor(Math.random() * 50)
    };
  }

  _transformMarketData(data) {
    return {
      ...data,
      timestamp: new Date().toISOString(),
      source: 'coinmarketcap',
      processed: true
    };
  }

  _transformProtocolData(data) {
    return {
      ...data,
      timestamp: new Date().toISOString(),
      source: 'defillama',
      processed: true
    };
  }

  _triggerDataWorkflows(scrapedData) {
    // Trigger workflows based on scraped data patterns
    if (scrapedData.data.change && Math.abs(scrapedData.data.change) > 5) {
      // Significant price movement - trigger alert workflow
      this.emit('trigger:price-alert', scrapedData);
    }
  }

  _sendCompletionNotifications(workflow) {
    // Send notifications for important workflow completions
    if (workflow.name.includes('market-data')) {
      this.emit('notification:market-update', workflow.results);
    }
  }

  async start() {
    if (this.isRunning) return this;
    
    console.log('🎬 Starting Phase 2 Automation System');
    console.log('====================================\n');
    
    this.isRunning = true;
    this.emit('phase2:started');
    
    return this;
  }

  async stop() {
    console.log('🛑 Stopping Phase 2 Automation System');
    
    this.isRunning = false;
    
    // Stop all scraping jobs
    for (const [jobId] of this.webScraper.scrapingJobs) {
      this.webScraper.stopJob(jobId);
    }
    
    this.emit('phase2:stopped');
    console.log('✅ Phase 2 Automation System stopped');
  }

  getStatus() {
    return {
      running: this.isRunning,
      uptime: this.isRunning ? Date.now() - this.startTime : 0,
      components: {
        scraper: this.webScraper.getStats(),
        scheduler: this.scheduler.getStats(),
        business: this.businessIntegrator.getStats()
      },
      system: {
        totalDataPoints: this.webScraper.stats.dataPointsCollected,
        workflowsExecuted: this.scheduler.stats.completedWorkflows,
        businessEvents: this.businessIntegrator.stats.emailsProcessed + this.businessIntegrator.stats.calendarEvents
      }
    };
  }
}

export { 
  WebScraper, 
  IntelligentScheduler, 
  BusinessIntegrator, 
  Phase2Orchestrator 
};