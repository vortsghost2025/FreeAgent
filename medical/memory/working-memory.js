/**
 * Working Memory System
 * In-memory session context buffer with FIFO eviction
 */

class WorkingMemory {
  constructor(options = {}) {
    this.maxItems = options.maxItems || 50;
    this.buffer = [];
    this.createdAt = new Date().toISOString();
    console.log('🧠 Working Memory initialized with max', this.maxItems, 'items');
  }

  /**
   * Add item to working memory
   * @param {Object} item - Item to add with {id, content, type, timestamp}
   * @returns {boolean} Success status
   */
  add(item) {
    try {
      const memoryItem = {
        id: item.id || `wm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: item.content,
        type: item.type || 'generic',
        timestamp: item.timestamp || new Date().toISOString(),
        metadata: item.metadata || {}
      };

      this.buffer.push(memoryItem);

      // FIFO eviction if buffer is full
      if (this.buffer.length > this.maxItems) {
        this.buffer.shift();
      }

      console.log(`🧠 Added to working memory: ${memoryItem.type} (${this.buffer.length}/${this.maxItems})`);
      return true;
    } catch (error) {
      console.error('❌ Failed to add to working memory:', error.message);
      return false;
    }
  }

  /**
   * Get recent items from working memory
   * @param {number} count - Number of recent items to retrieve
   * @param {string} type - Optional filter by type
   * @returns {Array} Recent items
   */
  getRecent(count = 10, type = null) {
    try {
      let items = [...this.buffer];
      
      // Filter by type if specified
      if (type) {
        items = items.filter(item => item.type === type);
      }

      // Get most recent items
      const recent = items.slice(-count).reverse();
      
      console.log(`🧠 Retrieved ${recent.length} recent items from working memory`);
      return recent;
    } catch (error) {
      console.error('❌ Failed to retrieve from working memory:', error.message);
      return [];
    }
  }

  /**
   * Search working memory by content
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Array} Matching items
   */
  search(query, options = {}) {
    try {
      const { type = null, limit = 10 } = options;
      let items = [...this.buffer];

      // Filter by type if specified
      if (type) {
        items = items.filter(item => item.type === type);
      }

      // Search by content (case insensitive)
      const searchTerm = query.toLowerCase();
      const matches = items.filter(item => 
        JSON.stringify(item.content).toLowerCase().includes(searchTerm)
      );

      // Sort by relevance/timestamp and limit results
      const results = matches
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);

      console.log(`🧠 Found ${results.length} matches for query: "${query}"`);
      return results;
    } catch (error) {
      console.error('❌ Search failed:', error.message);
      return [];
    }
  }

  /**
   * Clear working memory
   * @returns {boolean} Success status
   */
  clear() {
    try {
      const clearedCount = this.buffer.length;
      this.buffer = [];
      console.log(`🧠 Cleared ${clearedCount} items from working memory`);
      return true;
    } catch (error) {
      console.error('❌ Failed to clear working memory:', error.message);
      return false;
    }
  }

  /**
   * Get working memory statistics
   * @returns {Object} Memory statistics
   */
  getStats() {
    const typeCounts = {};
    this.buffer.forEach(item => {
      typeCounts[item.type] = (typeCounts[item.type] || 0) + 1;
    });

    return {
      totalItems: this.buffer.length,
      maxCapacity: this.maxItems,
      utilization: ((this.buffer.length / this.maxItems) * 100).toFixed(1) + '%',
      types: typeCounts,
      createdAt: this.createdAt,
      lastUpdated: this.buffer.length > 0 ? 
        this.buffer[this.buffer.length - 1].timestamp : null
    };
  }

  /**
   * Export working memory to serializable format
   * @returns {Object} Exportable memory data
   */
  export() {
    return {
      buffer: this.buffer,
      maxItems: this.maxItems,
      createdAt: this.createdAt,
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Import working memory from exported data
   * @param {Object} data - Exported memory data
   * @returns {boolean} Success status
   */
  import(data) {
    try {
      if (data && data.buffer && Array.isArray(data.buffer)) {
        this.buffer = data.buffer.slice(0, this.maxItems); // Respect max items limit
        this.maxItems = data.maxItems || this.maxItems;
        this.createdAt = data.createdAt || this.createdAt;
        console.log(`🧠 Imported ${this.buffer.length} items into working memory`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Failed to import working memory:', error.message);
      return false;
    }
  }
}

// Export singleton instance
export const workingMemory = new WorkingMemory();

// Export class for testing/custom instances
export { WorkingMemory };