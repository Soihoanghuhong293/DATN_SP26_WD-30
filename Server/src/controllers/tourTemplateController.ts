import { Request, Response } from 'express';
import TourTemplate from '../models/TourTemplate';

const templatePopulate = [
  { path: 'category_id' },
  { path: 'provider_id', select: 'name status' },
  { path: 'schedule.lunch_restaurant_id', select: 'name phone capacity location status' },
  { path: 'schedule.dinner_restaurant_id', select: 'name phone capacity location status' },
  {
    path: 'schedule.ticket_ids',
    select: 'name ticket_type application_mode price_adult price_child status',
  },
] as const;

export const getAllTourTemplates = async (req: Request, res: Response) => {
  try {
    const templates = await TourTemplate.find()
      .populate(templatePopulate as any)
      .sort({ created_at: -1 });

    res.status(200).json({
      status: 'success',
      results: templates.length,
      data: templates,
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getTourTemplate = async (req: Request, res: Response) => {
  try {
    const template = await TourTemplate.findById(req.params.id).populate(templatePopulate as any);
    if (!template) {
      return res.status(404).json({ status: 'fail', message: 'Không tìm thấy template' });
    }

    res.status(200).json({
      status: 'success',
      data: template,
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const createTourTemplate = async (req: Request, res: Response) => {
  try {
    const created = await TourTemplate.create(req.body);
    res.status(201).json({ status: 'success', data: created });
  } catch (error: any) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

export const updateTourTemplate = async (req: Request, res: Response) => {
  try {
    const updated = await TourTemplate.findByIdAndUpdate(
      req.params.id,
      { $set: { ...req.body } },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ status: 'fail', message: 'Không tìm thấy template' });
    }
    res.status(200).json({ status: 'success', data: updated });
  } catch (error: any) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

export const deleteTourTemplate = async (req: Request, res: Response) => {
  try {
    await TourTemplate.findByIdAndDelete(req.params.id);
    res.status(204).json({ status: 'success', data: null });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

