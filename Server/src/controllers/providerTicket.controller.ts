import { Request, Response } from 'express';
import mongoose from 'mongoose';
import ProviderTicket from '../models/ProviderTicket';

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

export const getProviderTickets = async (req: Request, res: Response) => {
  try {
    const { provider_id } = req.query as { provider_id?: string };
    const filter: Record<string, unknown> = {};
    if (provider_id && isValidObjectId(provider_id)) {
      filter.provider_id = provider_id;
    }

    const tickets = await ProviderTicket.find(filter).sort({ name: 1 });

    res.status(200).json({
      status: 'success',
      results: tickets.length,
      data: { tickets },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const createProviderTicket = async (req: Request, res: Response) => {
  try {
    const {
      name,
      ticket_type,
      price_adult,
      price_child,
      application_mode,
      provider_id,
      status,
    } = req.body || {};

    if (!name || !ticket_type || !provider_id || !isValidObjectId(provider_id)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Thiếu tên vé, loại vé hoặc nhà cung cấp không hợp lệ',
      });
    }

    const mode = application_mode === 'included_in_tour' ? 'included_in_tour' : 'optional_addon';
    const pa = typeof price_adult === 'number' ? price_adult : Number(price_adult ?? 0);
    const pc = typeof price_child === 'number' ? price_child : Number(price_child ?? 0);

    if (Number.isNaN(pa) || pa < 0 || Number.isNaN(pc) || pc < 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'Giá vé không hợp lệ',
      });
    }

    const ticket = await ProviderTicket.create({
      name: String(name).trim(),
      ticket_type: String(ticket_type).trim(),
      price_adult: pa,
      price_child: pc,
      application_mode: mode,
      provider_id,
      status: status === 'inactive' ? 'inactive' : 'active',
    });

    res.status(201).json({ status: 'success', data: { ticket } });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateProviderTicket = async (req: Request, res: Response) => {
  try {
    const tid = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!isValidObjectId(tid)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid ticket id' });
    }

    const allowed = [
      'name',
      'ticket_type',
      'price_adult',
      'price_child',
      'application_mode',
      'status',
    ];
    const filtered: Record<string, unknown> = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) filtered[k] = req.body[k];
    }
    if (filtered.name) filtered.name = String(filtered.name).trim();
    if (filtered.ticket_type) filtered.ticket_type = String(filtered.ticket_type).trim();
    if (filtered.price_adult !== undefined) filtered.price_adult = Number(filtered.price_adult);
    if (filtered.price_child !== undefined) filtered.price_child = Number(filtered.price_child);
    if (filtered.application_mode !== undefined) {
      filtered.application_mode =
        filtered.application_mode === 'included_in_tour' ? 'included_in_tour' : 'optional_addon';
    }

    const ticket = await ProviderTicket.findByIdAndUpdate(tid, filtered, {
      new: true,
      runValidators: true,
    });
    if (!ticket) {
      return res.status(404).json({ status: 'fail', message: 'Ticket not found' });
    }

    res.status(200).json({ status: 'success', data: { ticket } });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const deleteProviderTicket = async (req: Request, res: Response) => {
  try {
    const tid = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!isValidObjectId(tid)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid ticket id' });
    }

    await ProviderTicket.findByIdAndDelete(tid);
    res.status(204).json({ status: 'success', data: null });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
