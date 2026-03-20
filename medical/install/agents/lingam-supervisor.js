/**
 * Lingam Supervisor - Code review and reasoning specialist
 * Only handles structured tasks, never raw messages
 * Prevents queue explosion by receiving pre-classified work
 */

import { EventEmitter } from 'events';

class LingamSupervisor extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      maxConcurrentReviews: config.maxConcurrentReviews || 3,
      reviewTimeout: config.reviewTimeout || 30000,
      qualityThreshold: config.qualityThreshold || 0.8,
      ...config
    };
    
    this.status = 'idle';
    this.currentReviews = new Map();
    this.reviewHistory = [];
    
    this.stats = {
      reviewsCompleted: 0,
      reviewsFailed: 0,
      avgReviewTime: 0,
      qualityScore: 0
    };
  }

  async reviewCode(task) {
    if (this.currentReviews.size >= this.config.maxConcurrentReviews) {
      throw new Error('Maximum concurrent reviews reached');
    }
    
    this.status = 'reviewing';
    this.currentReviews.set(task.id, {
      task,
      startTime: Date.now()
    });
    
    console.log(`🧠 Lingam reviewing task ${task.id}: ${task.content.substring(0, 50)}...`);
    
    try {
      const review = await this.performCodeReview(task);
      
      const reviewRecord = this.currentReviews.get(task.id);
      const duration = Date.now() - reviewRecord.startTime;
      
      this.stats.reviewsCompleted++;
      this.updateReviewStats(duration, review.quality);
      
      this.currentReviews.delete(task.id);
      this.status = this.currentReviews.size === 0 ? 'idle' : 'reviewing';
      
      this.reviewHistory.push({
        taskId: task.id,
        duration,
        quality: review.quality,
        timestamp: Date.now()
      });
      
      console.log(`✅ Lingam completed review ${task.id} (${duration}ms, quality: ${(review.quality * 100).toFixed(1)}%)`);
      
      return review;
      
    } catch (error) {
      console.error(`❌ Lingam review failed for ${task.id}:`, error.message);
      
      this.stats.reviewsFailed++;
      this.currentReviews.delete(task.id);
      this.status = this.currentReviews.size === 0 ? 'idle' : 'reviewing';
      
      throw error;
    }
  }

  async performCodeReview(task) {
    // Simulate code review process
    await this.delay(1000 + Math.random() * 2000);
    
    // Analyze the task content
    const analysis = this.analyzeTaskContent(task.content);
    
    // Generate review feedback
    const feedback = this.generateReviewFeedback(analysis);
    
    // Calculate quality score
    const quality = this.calculateQualityScore(analysis, feedback);
    
    return {
      taskId: task.id,
      content: task.content,
      analysis,
      feedback,
      quality,
      recommendations: this.generateRecommendations(analysis),
      timestamp: new Date().toISOString(),
      reviewer: 'lingam-supervisor'
    };
  }

  analyzeTaskContent(content) {
    const lowerContent = content.toLowerCase();
    
    // Code quality indicators
    const hasCode = /\b(function|class|const|let|var|import|export)\b/.test(lowerContent);
    const hasLogic = /\b(if|for|while|return|throw|try|catch)\b/.test(lowerContent);
    const hasStructure = /[{}();]/.test(content);
    
    // Complexity analysis
    const lines = content.split('\n').length;
    const complexity = Math.min(lines / 10, 1.0);
    
    // Issue detection patterns
    const antiPatterns = [
      /var\s+\w+\s*=\s*\w+/i,           // Old var declarations
      /eval\(/i,                        // Dangerous eval usage
      /document\.write/i,               // Direct DOM manipulation
      /innerHTML\s*=/i,                 // XSS risk
      /password\s*=.*['"]/i             // Hardcoded passwords
    ];
    
    const issuesFound = antiPatterns.filter(pattern => pattern.test(content)).length;
    
    return {
      hasCode,
      hasLogic,
      hasStructure,
      lines,
      complexity,
      issuesFound,
      antiPatternMatches: issuesFound
    };
  }

  generateReviewFeedback(analysis) {
    const feedback = [];
    
    if (analysis.complexity > 0.7) {
      feedback.push('⚠️ High complexity - consider breaking into smaller functions');
    }
    
    if (analysis.issuesFound > 0) {
      feedback.push('🚨 Potential security/code quality issues detected');
    }
    
    if (analysis.lines > 50) {
      feedback.push('📏 Long function - consider refactoring for readability');
    }
    
    if (feedback.length === 0) {
      feedback.push('✅ Code structure looks good');
    }
    
    return feedback;
  }

  calculateQualityScore(analysis, feedback) {
    let score = 1.0;
    
    // Deduct for complexity
    score -= analysis.complexity * 0.3;
    
    // Deduct for issues
    score -= (analysis.issuesFound * 0.2);
    
    // Deduct for length
    if (analysis.lines > 100) {
      score -= 0.1;
    }
    
    // Bonus for good structure
    if (analysis.hasCode && analysis.hasLogic && analysis.hasStructure) {
      score += 0.1;
    }
    
    return Math.max(0.1, Math.min(1.0, score));
  }

  generateRecommendations(analysis) {
    const recommendations = [];
    
    if (analysis.complexity > 0.6) {
      recommendations.push('Extract complex logic into separate functions');
      recommendations.push('Add more descriptive variable names');
    }
    
    if (analysis.issuesFound > 0) {
      recommendations.push('Address security anti-patterns');
      recommendations.push('Add proper input validation');
    }
    
    if (analysis.lines > 30) {
      recommendations.push('Consider splitting into multiple smaller functions');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Maintain current approach');
      recommendations.push('Add unit tests for edge cases');
    }
    
    return recommendations;
  }

  updateReviewStats(duration, quality) {
    // Update average review time
    this.stats.avgReviewTime = (
      (this.stats.avgReviewTime * (this.stats.reviewsCompleted - 1) + duration) / 
      this.stats.reviewsCompleted
    );
    
    // Update quality score
    this.stats.qualityScore = (
      (this.stats.qualityScore * (this.stats.reviewsCompleted - 1) + quality) / 
      this.stats.reviewsCompleted
    );
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStats() {
    return {
      status: this.status,
      currentReviews: this.currentReviews.size,
      performance: {
        reviewsCompleted: this.stats.reviewsCompleted,
        reviewsFailed: this.stats.reviewsFailed,
        avgReviewTime: this.stats.avgReviewTime.toFixed(0) + 'ms',
        qualityScore: (this.stats.qualityScore * 100).toFixed(1) + '%',
        successRate: this.stats.reviewsCompleted > 0 ?
          ((this.stats.reviewsCompleted / (this.stats.reviewsCompleted + this.stats.reviewsFailed)) * 100).toFixed(1) + '%' : '0%'
      },
      recentReviews: this.reviewHistory.slice(-5)
    };
  }

  getStatus() {
    return {
      id: 'lingam-supervisor',
      status: this.status,
      currentTasks: Array.from(this.currentReviews.keys()),
      load: (this.currentReviews.size / this.config.maxConcurrentReviews * 100).toFixed(0) + '%'
    };
  }
}

export default LingamSupervisor;