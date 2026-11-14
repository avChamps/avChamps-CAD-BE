const EquipmentModel = require('../models/equipment.model');

exports.getEquipmentList = async (req, res) => {
  try {
    const { category, search } = req.query;
    const items = await EquipmentModel.getAll({ category, search });
    res.json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    console.error('Error in getEquipmentList:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch equipment library from database',
      error: error.message
    });
  }
};

exports.getEquipmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await EquipmentModel.getById(id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: `Equipment with ID "${id}" not found`
      });
    }
    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Error in getEquipmentById:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve equipment item',
      error: error.message
    });
  }
};

exports.createEquipment = async (req, res) => {
  try {
    const body = req.body;
    if (!body || !body.id || !body.model || !body.mfg) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: id, model, and mfg are mandatory'
      });
    }

    const created = await EquipmentModel.create(body);
    res.status(201).json({
      success: true,
      message: `Equipment "${body.model}" created successfully`,
      data: created
    });
  } catch (error) {
    console.error('Error in createEquipment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save equipment item',
      error: error.message
    });
  }
};

exports.updateEquipment = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await EquipmentModel.update(id, req.body);
    res.json({
      success: true,
      message: `Equipment "${id}" updated successfully`,
      ...result
    });
  } catch (error) {
    console.error('Error in updateEquipment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update equipment item',
      error: error.message
    });
  }
};

exports.deleteEquipment = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await EquipmentModel.delete(id);
    res.json({
      success: true,
      message: `Equipment "${id}" deleted successfully`,
      ...result
    });
  } catch (error) {
    console.error('Error in deleteEquipment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete equipment item',
      error: error.message
    });
  }
};
