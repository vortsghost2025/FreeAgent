/**
 * Episodic Memory System
 * Stores complete session events for replay and learning
 */

class EpisodicMemory {
  constructor(options = {}) {
    this.episodes = new Map(); // sessionId -> episode data
    this.index = {
      byTimestamp: [], // Sorted array of {sessionId, timestamp}
      byType: new Map() // type -> Set of sessionIds
    };
    this.maxEpisodes = options.maxEpisodes || 1000;
    this.storagePath = options.storagePath || './memory/episodes';
    console.log('🎬 Episodic Memory initialized');
  }

  /**
   * Record a complete episode/session
   * @param {Object} episode - Episode data
   * @returns {string} Session ID
   */
  recordEpisode(episode) {
    try {
      const sessionId = episode.sessionId || `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const timestamp = episode.timestamp || new Date().toISOString();
      
      const episodeData = {
        sessionId,
        timestamp,
        events: episode.events || [],
        context: episode.context || {},
        outcome: episode.outcome || 'completed',
        duration: episode.duration || 0,
        metadata: episode.metadata || {}
      };

      // Store episode
      this.episodes.set(sessionId, episodeData);

      // Update indexes
      this._updateIndexes(sessionId, timestamp, episodeData.metadata.type);

      // Evict oldest if over capacity
      if (this.episodes.size > this.maxEpisodes) {
        this._evictOldest();
      }

      console.log(`🎬 Recorded episode ${sessionId} with ${episodeData.events.length} events`);
      return sessionId;
    } catch (error) {
      console.error('❌ Failed to record episode:', error.message);
      return null;
    }
  }

  /**
   * Get specific episode by session ID
   * @param {string} sessionId - Session identifier
   * @returns {Object|null} Episode data or null
   */
  getEpisode(sessionId) {
    try {
      const episode = this.episodes.get(sessionId);
      if (episode) {
        console.log(`🎬 Retrieved episode ${sessionId}`);
        return { ...episode }; // Return copy
      }
      return null;
    } catch (error) {
      console.error('❌ Failed to retrieve episode:', error.message);
      return null;
    }
  }

  /**
   * List episodes with filtering and pagination
   * @param {Object} options - Filter and pagination options
   * @returns {Array} List of episodes
   */
  listEpisodes(options = {}) {
    try {
      const {
        type = null,
        limit = 50,
        offset = 0,
        sortBy = 'timestamp',
        sortOrder = 'desc'
      } = options;

      let sessionIds;

      // Filter by type if specified
      if (type) {
        sessionIds = Array.from(this.index.byType.get(type) || []);
      } else {
        // Get all session IDs ordered by timestamp
        sessionIds = this.index.byTimestamp
          .map(entry => entry.sessionId);
      }

      // Sort
      if (sortBy === 'timestamp') {
        sessionIds.sort((a, b) => {
          const timeA = this.episodes.get(a)?.timestamp || '';
          const timeB = this.episodes.get(b)?.timestamp || '';
          return sortOrder === 'asc' ? 
            timeA.localeCompare(timeB) : 
            timeB.localeCompare(timeA);
        });
      }

      // Apply pagination
      const paginatedIds = sessionIds.slice(offset, offset + limit);

      // Get episode data
      const episodes = paginatedIds
        .map(id => this.episodes.get(id))
        .filter(Boolean);

      console.log(`🎬 Listed ${episodes.length} episodes (filtered: ${type || 'all'})`);
      return episodes;
    } catch (error) {
      console.error('❌ Failed to list episodes:', error.message);
      return [];
    }
  }

  /**
   * Search episodes by content
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Array} Matching episodes
   */
  searchEpisodes(query, options = {}) {
    try {
      const { limit = 20 } = options;
      const searchTerm = query.toLowerCase();
      const matches = [];

      for (const [sessionId, episode] of this.episodes) {
        const searchableContent = JSON.stringify({
          events: episode.events,
          context: episode.context,
          metadata: episode.metadata
        }).toLowerCase();

        if (searchableContent.includes(searchTerm)) {
          matches.push({
            sessionId,
            timestamp: episode.timestamp,
            matchScore: this._calculateMatchScore(searchableContent, searchTerm),
            eventCount: episode.events.length
          });
        }
      }

      // Sort by match score and limit
      const results = matches
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, limit)
        .map(match => this.getEpisode(match.sessionId));

      console.log(`🎬 Found ${results.length} episodes matching "${query}"`);
      return results;
    } catch (error) {
      console.error('❌ Episode search failed:', error.message);
      return [];
    }
  }

  /**
   * Get episode statistics
   * @returns {Object} Statistics about stored episodes
   */
  getStats() {
    const typeCounts = {};
    let totalEvents = 0;
    let totalDuration = 0;

    for (const episode of this.episodes.values()) {
      const type = episode.metadata.type || 'unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
      totalEvents += episode.events.length;
      totalDuration += episode.duration || 0;
    }

    const timestamps = Array.from(this.episodes.values())
      .map(ep => new Date(ep.timestamp))
      .sort((a, b) => a - b);

    return {
      totalEpisodes: this.episodes.size,
      maxCapacity: this.maxEpisodes,
      utilization: ((this.episodes.size / this.maxEpisodes) * 100).toFixed(1) + '%',
      typeDistribution: typeCounts,
      totalEvents,
      totalDuration: Math.round(totalDuration / 1000) + 's',
      dateRange: timestamps.length > 0 ? {
        earliest: timestamps[0].toISOString(),
        latest: timestamps[timestamps.length - 1].toISOString()
      } : null
    };
  }

  /**
   * Export episodic memory
   * @returns {Object} Exportable data
   */
  export() {
    const episodesArray = Array.from(this.episodes.entries()).map(([id, data]) => ({
      sessionId: id,
      ...data
    }));

    return {
      episodes: episodesArray,
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };
  }

  /**
   * Import episodic memory
   * @param {Object} data - Exported data
   * @returns {boolean} Success status
   */
  import(data) {
    try {
      if (!data || !data.episodes || !Array.isArray(data.episodes)) {
        return false;
      }

      // Clear existing data
      this.episodes.clear();
      this.index.byTimestamp = [];
      this.index.byType.clear();

      // Import episodes
      for (const episode of data.episodes) {
        if (episode.sessionId) {
          this.episodes.set(episode.sessionId, {
            ...episode,
            sessionId: episode.sessionId
          });
          this._updateIndexes(episode.sessionId, episode.timestamp, episode.metadata?.type);
        }
      }

      console.log(`🎬 Imported ${this.episodes.size} episodes`);
      return true;
    } catch (error) {
      console.error('❌ Failed to import episodes:', error.message);
      return false;
    }
  }

  /**
   * Private: Update internal indexes
   */
  _updateIndexes(sessionId, timestamp, type) {
    // Update timestamp index
    this.index.byTimestamp.push({ sessionId, timestamp });
    this.index.byTimestamp.sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    // Update type index
    if (type) {
      if (!this.index.byType.has(type)) {
        this.index.byType.set(type, new Set());
      }
      this.index.byType.get(type).add(sessionId);
    }
  }

  /**
   * Private: Remove oldest episode
   */
  _evictOldest() {
    if (this.index.byTimestamp.length > 0) {
      const oldest = this.index.byTimestamp[0];
      this.episodes.delete(oldest.sessionId);
      
      // Remove from indexes
      this.index.byTimestamp.shift();
      
      // Remove from type index
      for (const [type, sessionSet] of this.index.byType) {
        sessionSet.delete(oldest.sessionId);
        if (sessionSet.size === 0) {
          this.index.byType.delete(type);
        }
      }
      
      console.log(`🎬 Evicted oldest episode: ${oldest.sessionId}`);
    }
  }

  /**
   * Private: Calculate match score for search
   */
  _calculateMatchScore(content, searchTerm) {
    const matches = (content.match(new RegExp(searchTerm, 'gi')) || []).length;
    return matches * (searchTerm.length / content.length);
  }

  /**
   * Get total number of sessions
   */
  getSessionCount() {
    return this.episodes.size;
  }

  /**
   * Get all session IDs
   */
  getSessionIds() {
    return Array.from(this.episodes.keys());
  }
}

// Export singleton instance
export const episodicMemory = new EpisodicMemory();

// Export class for testing/custom instances
export { EpisodicMemory };