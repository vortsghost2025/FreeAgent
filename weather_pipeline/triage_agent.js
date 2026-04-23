/**
 * Weather Pipeline - Triage Agent
 * Classifies weather events under constraint
 * Validates Papers 1.2: Selection Under Constraint
 */
class WeatherTriageAgent {
  constructor() {
    this.name = 'WeatherTriageAgent';
    this.version = '1.0.0';
    
    this.keywords = {
      severe: ['hurricane', 'tornado', 'tsunami', 'flash flood', 'extreme'],
      moderate: ['storm', 'rain', 'wind', 'advisory', 'warning'],
      mild: ['clear', 'cloudy', 'partly', 'fair']
    };
    
    this.structuralHints = {
      severe: {pressure: < 950, wind_speed: > 100},
      moderate: {pressure: < 1010, wind_speed: > 50},
      mild: {pressure: >= 1010, wind_speed: <= 50}
    };
  }

  async run(task, state = {}) {
    const data = state.data || task;
    const classification = this.classifyWeather(data);
    
    return {
      ...state,
      classification: classification.category,
      confidence: classification.confidence,
      severity: classification.severity
    };
  }

  classifyWeather(data) {
    let score = 0;
    
    const conditions = (data.conditions || '').toLowerCase();
    for (const [category, words] of Object.entries(this.keywords)) {
      for (const word of words) {
        if (conditions.includes(word)) score += 1;
      }
    }
    
    if (data.pressure && data.pressure < 950) score += 2;
    if (data.wind_speed && data.wind_speed > 100) score += 2;
    
    const confidence = Math.min(0.99, 0.5 + (score * 0.08));
    const severity = confidence > 0.7 ? 'high' : confidence > 0.5 ? 'medium' : 'low';
    const category = severity === 'high' ? 'severe' : severity === 'medium' ? 'moderate' : 'mild';
    
    return { category, confidence: Math.round(confidence * 100) / 100, severity };
  }
}

export default WeatherTriageAgent;
export { WeatherTriageAgent };
