const express = require('express');
const mockSourcesService = require('../services/mockSources.service');
const { sendSuccess, sendError } = require('../utils/response');

const router = express.Router();

// GET /api/mock/source-a - Source A: Network Monitoring
router.get('/source-a', (req, res) => {
  try {
    const simulateFailure = req.query.simulateFailure === 'true';
    const data = mockSourcesService.getSourceAData(simulateFailure);
    return res.status(200).json(data);
  } catch (error) {
    return sendError(res, error.message, error.status || 500, error.code);
  }
});

// GET /api/mock/source-b - Source B: Infrastructure Monitoring
router.get('/source-b', (req, res) => {
  try {
    const simulateFailure = req.query.simulateFailure === 'true';
    const data = mockSourcesService.getSourceBData(simulateFailure);
    return res.status(200).json(data);
  } catch (error) {
    return sendError(res, error.message, error.status || 500, error.code);
  }
});

// GET /api/mock/source-c - Source C: Network Connectivity
router.get('/source-c', (req, res) => {
  try {
    const simulateFailure = req.query.simulateFailure === 'true';
    const data = mockSourcesService.getSourceCData(simulateFailure);
    return res.status(200).json(data);
  } catch (error) {
    return sendError(res, error.message, error.status || 500, error.code);
  }
});

// POST /api/mock/simulate-failure - Toggle failure state for testing
router.post('/simulate-failure', (req, res) => {
  const { sourceId, shouldFail } = req.body;
  if (!['SOURCE_A', 'SOURCE_B', 'SOURCE_C'].includes(sourceId)) {
    return sendError(res, 'Invalid sourceId. Must be SOURCE_A, SOURCE_B, or SOURCE_C', 400);
  }
  mockSourcesService.setSimulatedFailure(sourceId, shouldFail);
  return sendSuccess(res, { sourceId, simulatedFailure: Boolean(shouldFail) }, 'Simulation state updated');
});

module.exports = router;

