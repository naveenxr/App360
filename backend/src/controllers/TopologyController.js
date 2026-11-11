const TopologyService = require('../services/TopologyService');
const { sendSuccess } = require('../utils/response');

class TopologyController {
  async getSites(req, res, next) {
    try {
      const filters = {
        region: req.query.region,
        severity: req.query.severity,
        status: req.query.status
      };

      const sites = await TopologyService.getSites(filters);
      return sendSuccess(res, sites, 'Sites topology retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  async getSiteById(req, res, next) {
    try {
      const data = await TopologyService.getSiteById(req.params.id);
      return sendSuccess(res, data, 'Site details retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  async getNodes(req, res, next) {
    try {
      const filters = {
        siteId: req.query.siteId,
        type: req.query.type,
        status: req.query.status,
        severity: req.query.severity
      };

      const nodes = await TopologyService.getNodes(filters);
      return sendSuccess(res, nodes, 'Network nodes retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  async getNodeAlarms(req, res, next) {
    try {
      const data = await TopologyService.getNodeLiveAlarms(req.params.id);
      return sendSuccess(res, data, 'Dynamic node alarms retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  async getSummary(req, res, next) {
    try {
      const summary = await TopologyService.getTopologySummary();
      return sendSuccess(res, summary, 'Topology summary metrics retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TopologyController();

