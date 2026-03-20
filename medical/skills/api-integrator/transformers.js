/**
 * Transformers - Request/Response data transformation utilities
 * Part of the API Integrator Skill
 */

class DataTransformer {
  constructor(transformFn) {
    this.transformFn = transformFn;
  }

  transform(data) {
    if (!this.transformFn) return data;
    return this.transformFn(data);
  }
}

/**
 * Create transformer from config
 */
function createTransformer(config) {
  if (!config) {
    return new DataTransformer(null);
  }

  if (typeof config === 'function') {
    return new DataTransformer(config);
  }

  if (typeof config === 'object') {
    const transformFn = createTransformFromConfig(config);
    return new DataTransformer(transformFn);
  }

  return new DataTransformer(null);
}

/**
 * Create transform function from config object
 */
function createTransformFromConfig(config) {
  return (data) => {
    let result = data;

    // Apply field mapping
    if (config.mapFields) {
      result = mapFields(result, config.mapFields);
    }

    // Apply pick/omit
    if (config.pick) {
      result = pickFields(result, config.pick);
    }
    if (config.omit) {
      result = omitFields(result, config.omit);
    }

    // Apply custom transformations
    if (config.transforms) {
      result = applyTransforms(result, config.transforms);
    }

    // Rename fields
    if (config.rename) {
      result = renameFields(result, config.rename);
    }

    // Flatten nested objects
    if (config.flatten) {
      result = flatten(result, config.flatten);
    }

    // Unflatten (expand) objects
    if (config.unflatten) {
      result = unflatten(result);
    }

    // Convert to array
    if (config.toArray) {
      result = Array.isArray(result) ? result : [result];
    }

    // Extract path
    if (config.extract) {
      result = extractPath(result, config.extract);
    }

    return result;
  };
}

/**
 * Map fields to new names/values
 */
function mapFields(data, fieldMap) {
  if (Array.isArray(data)) {
    return data.map(item => mapFields(item, fieldMap));
  }

  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const result = {};
  for (const [key, value] of Object.entries(data)) {
    const mappedKey = fieldMap[key] || key;
    result[mappedKey] = value;
  }
  return result;
}

/**
 * Pick only specified fields
 */
function pickFields(data, fields) {
  if (Array.isArray(data)) {
    return data.map(item => pickFields(item, fields));
  }

  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const result = {};
  for (const field of fields) {
    if (field in data) {
      result[field] = data[field];
    }
  }
  return result;
}

/**
 * Omit specified fields
 */
function omitFields(data, fields) {
  if (Array.isArray(data)) {
    return data.map(item => omitFields(item, fields));
  }

  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const result = { ...data };
  for (const field of fields) {
    delete result[field];
  }
  return result;
}

/**
 * Rename fields
 */
function renameFields(data, renameMap) {
  if (Array.isArray(data)) {
    return data.map(item => renameFields(item, renameMap));
  }

  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const result = {};
  for (const [key, value] of Object.entries(data)) {
    const newKey = renameMap[key] || key;
    result[newKey] = value;
  }
  return result;
}

/**
 * Apply custom transforms to fields
 */
function applyTransforms(data, transforms) {
  if (Array.isArray(data)) {
    return data.map(item => applyTransforms(item, transforms));
  }

  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const result = { ...data };
  for (const [field, transform] of Object.entries(transforms)) {
    if (field in result) {
      result[field] = transform(result[field], result);
    }
  }
  return result;
}

/**
 * Extract value at path
 */
function extractPath(data, path) {
  const keys = path.split('.');
  let result = data;
  
  for (const key of keys) {
    if (result === undefined || result === null) {
      return undefined;
    }
    result = result[key];
  }
  
  return result;
}

/**
 * Flatten nested object
 */
function flatten(data, separator = '.') {
  if (Array.isArray(data)) {
    return data.map(item => flatten(item, separator));
  }

  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const result = {};

  function flattenRecursive(obj, prefix = '') {
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}${separator}${key}` : key;
      
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        flattenRecursive(value, newKey);
      } else {
        result[newKey] = value;
      }
    }
  }

  flattenRecursive(data);
  return result;
}

/**
 * Unflatten object
 */
function unflatten(data, separator = '.') {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const result = {};

  for (const [key, value] of Object.entries(data)) {
    const keys = key.split(separator);
    let current = result;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current)) {
        current[k] = {};
      }
      current = current[k];
    }

    current[keys[keys.length - 1]] = value;
  }

  return result;
}

/**
 * Common predefined transformers
 */
const commonTransformers = {
  // Convert snake_case to camelCase
  toCamelCase: (data) => {
    if (Array.isArray(data)) {
      return data.map(item => commonTransformers.toCamelCase(item));
    }
    if (typeof data !== 'object' || data === null) {
      return data;
    }
    const result = {};
    for (const [key, value] of Object.entries(data)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = value;
    }
    return result;
  },

  // Convert camelCase to snake_case
  toSnakeCase: (data) => {
    if (Array.isArray(data)) {
      return data.map(item => commonTransformers.toSnakeCase(item));
    }
    if (typeof data !== 'object' || data === null) {
      return data;
    }
    const result = {};
    for (const [key, value] of Object.entries(data)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      result[snakeKey] = value;
    }
    return result;
  },

  // Wrap data in envelope
  wrapInEnvelope: (envelopeKey = 'data') => (data) => ({ [envelopeKey]: data }),

  // Extract from envelope
  extractFromEnvelope: (envelopeKey = 'data') => (data) => data[envelopeKey],

  // Add timestamp
  addTimestamp: (field = 'timestamp') => (data) => ({
    ...data,
    [field]: new Date().toISOString()
  }),

  // Parse JSON string fields
  parseJSON: (fields) => (data) => {
    const result = { ...data };
    for (const field of fields) {
      if (result[field] && typeof result[field] === 'string') {
        try {
          result[field] = JSON.parse(result[field]);
        } catch (e) {
          // Keep original value if parsing fails
        }
      }
    }
    return result;
  },

  // Stringify JSON fields
  stringifyJSON: (fields) => (data) => {
    const result = { ...data };
    for (const field of fields) {
      if (result[field] && typeof result[field] === 'object') {
        result[field] = JSON.stringify(result[field]);
      }
    }
    return result;
  }
};

module.exports = {
  DataTransformer,
  createTransformer,
  commonTransformers,
  mapFields,
  pickFields,
  omitFields,
  renameFields,
  flatten,
  unflatten,
  extractPath
};