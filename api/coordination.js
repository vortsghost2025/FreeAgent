/**
 * Agent Coordination API
 * REST API for Kilo and Claude Code to coordinate work
 */

const express = require('express');
const { getCoordinator } = require('../services/agent-coordinator');

const router = express.Router();
const coordinator = getCoordinator();

// Agent Registration
router.post('/register', (req, res) => {
  try {
    const { agent_id, agent_info } = req.body;
    const result = coordinator.registerAgent(agent_id, agent_info);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/heartbeat', (req, res) => {
  try {
    const { agent_id, status } = req.body;
    coordinator.heartbeat(agent_id, status);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Task Management
router.post('/tasks', (req, res) => {
  try {
    const task = req.body;
    const result = coordinator.createTask(task);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/tasks/:taskId/claim', (req, res) => {
  try {
    const { taskId } = req.params;
    const { agent_id } = req.body;
    const result = coordinator.claimTask(taskId, agent_id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/tasks/:taskId/collaborate', (req, res) => {
  try {
    const { taskId } = req.params;
    const { agent_id, action, data } = req.body;
    const result = coordinator.collaborateOnTask(taskId, agent_id, action, data);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/tasks/:taskId/complete', (req, res) => {
  try {
    const { taskId } = req.params;
    const { agent_id, result } = req.body;
    const taskResult = coordinator.completeTask(taskId, agent_id, result);
    res.json({ success: true, data: taskResult });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/tasks', (req, res) => {
  try {
    const filter = req.query;
    const tasks = coordinator.getTasks(filter);
    res.json({ success: true, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// File Coordination
router.post('/files/interest', (req, res) => {
  try {
    const { agent_id, file_path, purpose } = req.body;
    coordinator.registerFileInterest(agent_id, file_path, purpose);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/files/:filePath/interests', (req, res) => {
  try {
    const { filePath } = req.params;
    const interests = coordinator.getFileInterests(filePath);
    res.json({ success: true, data: interests });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/files/change', (req, res) => {
  try {
    const { agent_id, file_path, change } = req.body;
    const notification = coordinator.notifyFileChange(agent_id, file_path, change);
    res.json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Shared Context
router.post('/context', (req, res) => {
  try {
    const { agent_id, context } = req.body;
    coordinator.updateSharedContext(agent_id, context);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/context', (req, res) => {
  try {
    const context = coordinator.getSharedContext();
    res.json({ success: true, data: context });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Communication
router.post('/messages', (req, res) => {
  try {
    const { from_agent, to_agent, message } = req.body;
    const msg = coordinator.sendMessage(from_agent, to_agent, message);
    res.json({ success: true, data: msg });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/messages/:agentId', (req, res) => {
  try {
    const { agentId } = req.params;
    const messages = coordinator.getMessages(agentId);
    res.json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Dashboard and Logs
router.get('/dashboard', (req, res) => {
  try {
    const dashboard = coordinator.getDashboardInfo();
    res.json({ success: true, data: dashboard });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/log', (req, res) => {
  try {
    const filter = req.query;
    const log = coordinator.getCoordinationLog(filter);
    res.json({ success: true, data: log });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;