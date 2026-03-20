/**
 * Semantic Memory Graph - The Cortex Underlayer
 * 
 * Builds a semantic graph that links ideas across agents:
 * - Nodes = concepts
 * - Edges = relationships
 * - Importance scoring
 * - Relevance filtering
 * - Context compression
 * 
 * This becomes the system's intuition engine.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GRAPH_FILE = path.join(process.cwd(), 'agent-memory', 'semantic-graph.json');

/**
 * Graph Node
 */
class GraphNode {
  constructor(id, label, type = 'concept') {
    this.id = id;
    this.label = label;
    this.type = type;
    this.importance = 0.5;
    this.accessCount = 0;
    this.lastAccessed = Date.now();
    this.properties = {};
  }
}

/**
 * Graph Edge
 */
class GraphEdge {
  constructor(sourceId, targetId, relationship, weight = 0.5) {
    this.sourceId = sourceId;
    this.targetId = targetId;
    this.relationship = relationship;
    this.weight = weight;
  }
}

/**
 * Semantic Memory Graph
 */
export class SemanticMemoryGraph {
  constructor() {
    this.nodes = new Map();
    this.edges = [];
    this.load();
  }

  /**
   * Add a concept node
   */
  addConcept(label, type = 'concept', properties = {}) {
    const id = this.generateId(label);
    
    if (this.nodes.has(id)) {
      const node = this.nodes.get(id);
      node.accessCount++;
      node.lastAccessed = Date.now();
      return node;
    }
    
    const node = new GraphNode(id, label, type);
    node.properties = properties;
    this.nodes.set(id, node);
    this.save();
    
    return node;
  }

  /**
   * Link two concepts
   */
  link(sourceLabel, targetLabel, relationship = 'related_to', weight = 0.5) {
    const sourceId = this.generateId(sourceLabel);
    const targetId = this.generateId(targetLabel);
    
    // Ensure nodes exist
    this.addConcept(sourceLabel);
    this.addConcept(targetLabel);
    
    // Check if edge exists
    const exists = this.edges.some(e => 
      e.sourceId === sourceId && e.targetId === targetId && e.relationship === relationship
    );
    
    if (!exists) {
      this.edges.push(new GraphEdge(sourceId, targetId, relationship, weight));
      this.save();
    }
  }

  /**
   * Find related concepts
   */
  findRelated(conceptLabel, maxResults = 5) {
    const conceptId = this.generateId(conceptLabel);
    
    // Find all edges connected to this concept
    const relatedEdges = this.edges.filter(e => 
      e.sourceId === conceptId || e.targetId === conceptId
    );
    
    // Get related nodes with scores
    const related = relatedEdges.map(edge => {
      const otherId = edge.sourceId === conceptId ? edge.targetId : edge.sourceId;
      const node = this.nodes.get(otherId);
      
      return {
        node,
        relationship: edge.relationship,
        score: edge.weight * (node?.importance || 0.5)
      };
    });
    
    // Sort by score and limit
    return related
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }

  /**
   * Find path between concepts (BFS)
   */
  findPath(startLabel, endLabel) {
    const startId = this.generateId(startLabel);
    const endId = this.generateId(endLabel);
    
    const queue = [[startId]];
    const visited = new Set([startId]);
    
    while (queue.length > 0) {
      const path = queue.shift();
      const currentId = path[path.length - 1];
      
      if (currentId === endId) {
        return path.map(id => this.nodes.get(id)?.label).filter(Boolean);
      }
      
      // Find neighbors
      const neighbors = this.edges
        .filter(e => e.sourceId === currentId || e.targetId === currentId)
        .map(e => e.sourceId === currentId ? e.targetId : e.sourceId)
        .filter(id => !visited.has(id));
      
      for (const neighbor of neighbors) {
        visited.add(neighbor);
        queue.push([...path, neighbor]);
      }
    }
    
    return null; // No path found
  }

  /**
   * Update importance scores based on access patterns
   */
  updateImportance() {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    for (const node of this.nodes.values()) {
      // Decay based on time
      const daysSinceAccess = (now - node.lastAccessed) / dayMs;
      const timeDecay = Math.exp(-daysSinceAccess * 0.1);
      
      // Boost based on access count
      const accessBoost = Math.log1p(node.accessCount) / 10;
      
      node.importance = Math.min(1, (0.3 * timeDecay + 0.7 * accessBoost));
    }
    
    this.save();
  }

  /**
   * Compress context by finding key concepts
   */
  compressContext(text) {
    // Simple keyword extraction (in production, use NLP)
    const words = text.toLowerCase().split(/\W+/);
    const wordCounts = new Map();
    
    for (const word of words) {
      if (word.length > 3) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }
    
    // Find top concepts that exist in graph
    const keyConcepts = [];
    for (const [word, count] of wordCounts) {
      const node = this.nodes.get(this.generateId(word));
      if (node) {
        keyConcepts.push({
          concept: word,
          count,
          importance: node.importance,
          score: count * node.importance
        });
      }
    }
    
    // Sort by score and return top concepts
    return keyConcepts
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(c => c.concept);
  }

  /**
   * Get graph statistics
   */
  getStats() {
    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.length,
      avgImportance: Array.from(this.nodes.values())
        .reduce((sum, n) => sum + n.importance, 0) / Math.max(1, this.nodes.size),
      topConcepts: Array.from(this.nodes.values())
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 10)
        .map(n => ({ label: n.label, importance: n.importance }))
    };
  }

  /**
   * Generate consistent ID from label
   */
  generateId(label) {
    return label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }

  /**
   * Save graph to file
   */
  save() {
    try {
      const data = {
        nodes: Array.from(this.nodes.entries()),
        edges: this.edges
      };
      
      const dir = path.dirname(GRAPH_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(GRAPH_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('[SemanticGraph] Save error:', e.message);
    }
  }

  /**
   * Load graph from file
   */
  load() {
    try {
      if (fs.existsSync(GRAPH_FILE)) {
        const data = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'));
        this.nodes = new Map(data.nodes || []);
        this.edges = data.edges || [];
      }
    } catch (e) {
      console.error('[SemanticGraph] Load error:', e.message);
    }
  }
}

export default SemanticMemoryGraph;