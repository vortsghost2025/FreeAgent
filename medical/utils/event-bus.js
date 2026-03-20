/**
 * EVENT BUS
 * Pub/sub system for inter-component communication in Kilo Code YOLO
 * Features: Event filtering, transformation, dead letter queue, event replay
 */

import { EventEmitter } from 'events';

/**
 * Event Filter - filters and transforms events
 */
class EventFilter {
  constructor(options = {}) {
    this.filters = options.filters || [];
    this.transformer = options.transformer || null;
  }

  /**
   * Add a filter function
   * @param {Function} filterFn - Filter function
   */
  addFilter(filterFn) {
    this.filters.push(filterFn);
  }

  /**
   * Set transformer function
   * @param {Function} transformerFn - Transformer function
   */
  setTransformer(transformerFn) {
    this.transformer = transformerFn;
  }

  /**
   * Process an event through filters and transformer
   * @param {Object} event - Event object
   * @returns {Object|null} Processed event or null if filtered out
   */
  process(event) {
    // Apply filters
    for (const filter of this.filters) {
      if (!filter(event)) {
        return null;
      }
    }

    // Apply transformer
    if (this.transformer) {
      return this.transformer(event);
    }

    return event;
  }

  /**
   * Clear all filters
   */
  clearFilters() {
    this.filters = [];
  }

  /**
   * Clear transformer
   */
  clearTransformer() {
    this.transformer = null;
  }
}

/**
 * Dead Letter Queue - stores failed events
 */
class DeadLetterQueue {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000;
    this.queue = [];
    this.retryPolicy = options.retryPolicy || {
      maxRetries: 3,
      backoffMs: 1000
    };
  }

  /**
   * Add event to dead letter queue
   * @param {Object} event - Failed event
   * @param {Error} error - Error that caused failure
   */
  add(event, error) {
    const entry = {
      event,
      error: error.message || String(error),
      stack: error.stack,
      timestamp: Date.now(),
      retries: 0
    };

    this.queue.push(entry);

    // Trim if needed
    if (this.queue.length > this.maxSize) {
      this.queue.shift();
    }

    return entry;
  }

  /**
   * Get all failed events
   * @param {Object} options - Query options
   * @returns {Array}
   */
  getAll(options = {}) {
    let results = [...this.queue];

    if (options.since) {
      results = results.filter(e => e.timestamp >= options.since);
    }

    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Retry a failed event
   * @param {number} index - Index of event to retry
   * @returns {Object|null}
   */
  retry(index) {
    const entry = this.queue[index];
    if (!entry) return null;

    entry.retries++;
    return entry;
  }

  /**
   * Remove event from queue
   * @param {number} index - Index to remove
   */
  remove(index) {
    this.queue.splice(index, 1);
  }

  /**
   * Clear queue
   */
  clear() {
    this.queue = [];
  }

  /**
   * Get queue size
   * @returns {number}
   */
  size() {
    return this.queue.length;
  }
}

/**
 * Event Replay System - replays historical events
 */
class EventReplay {
  constructor(options = {}) {
    this.maxEvents = options.maxEvents || 10000;
    this.events = [];
    this.replayHandlers = new Map();
  }

  /**
   * Record an event
   * @param {string} type - Event type
   * @param {Object} data - Event data
   * @param {Object} metadata - Event metadata
   */
  record(type, data, metadata = {}) {
    const event = {
      id: this._generateId(),
      type,
      data,
      metadata,
      timestamp: Date.now(),
      sequence: this.events.length
    };

    this.events.push(event);

    // Trim if needed
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    return event;
  }

  /**
   * Replay events
   * @param {Object} options - Replay options
   * @returns {Promise<Array>}
   */
  async replay(options = {}) {
    const {
      fromTimestamp,
      types,
      limit,
      handler
    } = options;

    let eventsToReplay = this.events;

    // Filter by timestamp
    if (fromTimestamp) {
      eventsToReplay = eventsToReplay.filter(e => e.timestamp >= fromTimestamp);
    }

    // Filter by types
    if (types && types.length > 0) {
      eventsToReplay = eventsToReplay.filter(e => types.includes(e.type));
    }

    // Limit
    if (limit) {
      eventsToReplay = eventsToReplay.slice(0, limit);
    }

    // Execute handler
    if (handler) {
      const results = [];
      for (const event of eventsToReplay) {
        try {
          const result = await handler(event);
          results.push({ event, success: true, result });
        } catch (error) {
          results.push({ event, success: false, error: error.message });
        }
      }
      return results;
    }

    return eventsToReplay;
  }

  /**
   * Get recorded events
   * @param {Object} options - Query options
   * @returns {Array}
   */
  getEvents(options = {}) {
    let events = [...this.events];

    if (options.type) {
      events = events.filter(e => e.type === options.type);
    }

    if (options.since) {
      events = events.filter(e => e.timestamp >= options.since);
    }

    if (options.until) {
      events = events.filter(e => e.timestamp <= options.until);
    }

    if (options.limit) {
      events = events.slice(-options.limit);
    }

    return events;
  }

  /**
   * Clear recorded events
   */
  clear() {
    this.events = [];
  }

  /**
   * Get event count
   * @returns {number}
   */
  count() {
    return this.events.length;
  }

  /**
   * Generate unique event ID
   * @returns {string}
   */
  _generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Subscriber - manages subscription state
 */
class Subscriber {
  constructor(id, handler, options = {}) {
    this.id = id;
    this.handler = handler;
    this.options = {
      filter: options.filter || null,
      transformer: options.transformer || null,
      priority: options.priority || 0,
      once: options.once || false
    };
    this.filter = new EventFilter({
      filters: options.filter ? [options.filter] : []
    });
  }

  /**
   * Check if subscriber can handle event
   * @param {Object} event - Event object
   * @returns {boolean}
   */
  canHandle(event) {
    if (!this.filter) return true;
    return this.filter.process(event) !== null;
  }

  /**
   * Handle event
   * @param {Object} event - Event object
   * @returns {Promise}
   */
  async handle(event) {
    let processedEvent = event;

    // Apply subscriber-specific transformer
    if (this.options.transformer) {
      processedEvent = this.options.transformer(event);
      if (processedEvent === null) return null;
    }

    return this.handler(processedEvent);
  }
}

/**
 * Main Event Bus
 */
export class EventBus extends EventEmitter {
  constructor(options = {}) {
    super();
    this.subscribers = new Map();
    this.subscriberId = 0;
    this.deadLetterQueue = new DeadLetterQueue(options.dlq);
    this.replay = new EventReplay(options.replay);
    this.config = {
      captureReplays: options.captureReplays !== false,
      maxSubscribers: options.maxSubscribers || 1000,
      ...options
    };
  }

  /**
   * Subscribe to an event
   * @param {string} eventType - Event type to subscribe to
   * @param {Function} handler - Event handler
   * @param {Object} options - Subscription options
   * @returns {string} Subscriber ID
   */
  subscribe(eventType, handler, options = {}) {
    if (this.subscribers.size >= this.config.maxSubscribers) {
      throw new Error('Maximum subscribers reached');
    }

    const id = `sub_${++this.subscriberId}`;
    const subscriber = new Subscriber(id, handler, options);

    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }

    this.subscribers.get(eventType).push(subscriber);

    // Sort by priority (higher first)
    this.subscribers.get(eventType).sort((a, b) => 
      b.options.priority - a.options.priority
    );

    return id;
  }

  /**
   * Subscribe once
   * @param {string} eventType - Event type
   * @param {Function} handler - Handler
   * @param {Object} options - Options
   * @returns {string}
   */
  subscribeOnce(eventType, handler, options = {}) {
    return this.subscribe(eventType, handler, { ...options, once: true });
  }

  /**
   * Unsubscribe
   * @param {string} subscriberId - Subscriber ID
   */
  unsubscribe(subscriberId) {
    for (const [eventType, subs] of this.subscribers) {
      const index = subs.findIndex(s => s.id === subscriberId);
      if (index !== -1) {
        subs.splice(index, 1);
        break;
      }
    }
  }

  /**
   * Publish an event
   * @param {string} eventType - Event type
   * @param {Object} data - Event data
   * @param {Object} metadata - Event metadata
   * @returns {Promise<Array>}
   */
  async publish(eventType, data, metadata = {}) {
    const event = {
      id: this._generateId(),
      type: eventType,
      data,
      metadata,
      timestamp: Date.now()
    };

    // Record for replay
    if (this.config.captureReplays) {
      this.replay.record(eventType, data, metadata);
    }

    // Get subscribers
    const subs = this.subscribers.get(eventType) || [];
    const results = [];

    for (const subscriber of subs) {
      try {
        if (!subscriber.canHandle(event)) {
          continue;
        }

        const result = await subscriber.handle(event);
        results.push({ subscriberId: subscriber.id, success: true, result });

        // Remove if once subscription
        if (subscriber.options.once) {
          this.unsubscribe(subscriber.id);
        }
      } catch (error) {
        results.push({ subscriberId: subscriber.id, success: false, error: error.message });
        
        // Add to dead letter queue
        this.deadLetterQueue.add(event, error);
        this.emit('event:failed', { event, error });
      }
    }

    // Emit on Any events
    const anySubs = this.subscribers.get('*') || [];
    for (const subscriber of anySubs) {
      try {
        if (subscriber.canHandle(event)) {
          const result = await subscriber.handle(event);
          results.push({ subscriberId: subscriber.id, success: true, result, wildcard: true });
        }
      } catch (error) {
        results.push({ subscriberId: subscriber.id, success: false, error: error.message, wildcard: true });
      }
    }

    this.emit('event:published', { event, results });
    return results;
  }

  /**
   * Publish synchronously
   * @param {string} eventType - Event type
   * @param {Object} data - Event data
   * @param {Object} metadata - Metadata
   * @returns {Array}
   */
  publishSync(eventType, data, metadata = {}) {
    const event = {
      id: this._generateId(),
      type: eventType,
      data,
      metadata,
      timestamp: Date.now()
    };

    if (this.config.captureReplays) {
      this.replay.record(eventType, data, metadata);
    }

    const subs = this.subscribers.get(eventType) || [];
    const results = [];

    for (const subscriber of subs) {
      try {
        if (!subscriber.canHandle(event)) {
          continue;
        }

        const result = subscriber.handler(event);
        results.push({ subscriberId: subscriber.id, success: true, result });

        if (subscriber.options.once) {
          this.unsubscribe(subscriber.id);
        }
      } catch (error) {
        results.push({ subscriberId: subscriber.id, success: false, error: error.message });
        this.deadLetterQueue.add(event, error);
      }
    }

    return results;
  }

  /**
   * Get subscriber count
   * @param {string} eventType - Event type
   * @returns {number}
   */
  getSubscriberCount(eventType) {
    return (this.subscribers.get(eventType) || []).length;
  }

  /**
   * Get all subscribers
   * @returns {Map}
   */
  getSubscribers() {
    const result = new Map();
    for (const [type, subs] of this.subscribers) {
      result.set(type, subs.map(s => ({ id: s.id, priority: s.options.priority, once: s.options.once })));
    }
    return result;
  }

  /**
   * Get dead letter queue
   * @returns {DeadLetterQueue}
   */
  getDeadLetterQueue() {
    return this.deadLetterQueue;
  }

  /**
   * Get replay system
   * @returns {EventReplay}
   */
  getReplay() {
    return this.replay;
  }

  /**
   * Clear all subscribers for an event type
   * @param {string} eventType - Event type
   */
  clearSubscribers(eventType) {
    if (eventType) {
      this.subscribers.delete(eventType);
    } else {
      this.subscribers.clear();
    }
  }

  /**
   * Get event bus status
   * @returns {Object}
   */
  getStatus() {
    let totalSubscribers = 0;
    for (const subs of this.subscribers.values()) {
      totalSubscribers += subs.length;
    }

    return {
      eventTypes: this.subscribers.size,
      totalSubscribers,
      deadLetterQueue: this.deadLetterQueue.size(),
      replayEvents: this.replay.count(),
      timestamp: Date.now()
    };
  }

  /**
   * Generate unique event ID
   * @returns {string}
   */
  _generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Default singleton instance
let defaultBus = null;

/**
 * Get default event bus instance
 * @returns {EventBus}
 */
export function getEventBus() {
  if (!defaultBus) {
    defaultBus = new EventBus();
  }
  return defaultBus;
}

/**
 * Create new event bus instance
 * @param {Object} options - Bus options
 * @returns {EventBus}
 */
export function createEventBus(options) {
  return new EventBus(options);
}

export default EventBus;