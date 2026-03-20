const express = require('express');
const { getSystemSnapshot } = require('./services/metrics');

const router = express.Router();

// Get current system metrics
router.get('/', async (req, res) => {
  try {
    const snapshot = await getSystemSnapshot();
    res.json({
      timestamp: Date.now(),
      ...snapshot
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific metric
router.get('/:metric', async (req, res) => {
  try {
    const snapshot = await getSystemSnapshot();
    const { metric } = req.params;
    
    if (snapshot[metric] !== undefined) {
      res.json({ [metric]: snapshot[metric] });
    } else {
      res.status(404).json({ error: `Metric '${metric}' not found` });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
