/**
 * Main Perception Module
 * Wrapper for the simple perception implementation
 */

import { perceptionModule as simplePerception } from './simple-perception.js';

// Re-export with the expected interface
export const perceptionModule = {
  async processImage(imageData, mimeType) {
    return await simplePerception.processImage(imageData, mimeType);
  },
  
  async processVoice(audioData, mimeType) {
    return await simplePerception.processVoice(audioData, mimeType);
  },
  
  async getStatus() {
    return {
      available: true,
      vision: true,
      audio: true,
      models: {
        'vision': 'mock-vision-model',
        'speech': 'mock-speech-model'
      }
    };
  }
};