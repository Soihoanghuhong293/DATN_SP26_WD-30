import { Response } from "express";
import mongoose from "mongoose";
import GuideLeaveRequest from "../models/GuideLeaveRequest";
import Booking from "../models/Booking";
import Tour from "../models/Tour";
import Guide from "../models/Guide";
import User from "../models/user.model";
import type { AuthRequest } from "../middlewares/auth.middleware";

const normalizeTripDate = (raw: string) => String(raw || "").trim().slice(0, 10);

/** Khớp ngày khởi hành với chuỗi YYYY-MM-DD theo giờ VN (cùng chuẩn với dayjs trên client VN). */
const tripStartDateMatchesExpr = (tripDate: string) => ({
  $expr: {
    $eq: [
      { $dateToString: { format: "%Y-%m-%d", date: "$startDate", timezone: "Asia/Ho_Chi_Minh" } },
      tripDate,
    ],
  },
});

async function guideHasTripAccess(guideUserId: string, tourId: string, tripDate: string): Promise<boolean> {
  const tid = new mongoose.Types.ObjectId(tourId);
  const t = await Tour.findById(tid).select("primary_guide_id secondary_guide_ids").lean();
  if (!t) return false;
  const gid = String(guideUserId);
  const p = String((t as any).primary_guide_id ?? "");
  if (p && p === gid) return true;
  const secs = Array.isArray((t as any).secondary_guide_ids) ? (t as any).secondary_guide_ids : [];
  if (secs.some((s: any) => String(s) === gid)) return true;

  const b = await Booking.findOne({
    tour_id: tid,
    status: { $ne: "cancelled" },
    ...tripStartDateMatchesExpr(tripDate),
  })
    .select("guide_id")
    .lean();
  if (!b) return false;
  const direct = String((b as any).guide_id ?? "");
  return Boolean(direct && direct === gid);
}

async function resolveGuideDocIdToUserId(guideDocId: string): Promise<string | null> {
  if (!mongoose.Types.ObjectId.isValid(guideDocId)) return null;
  const g = await Guide.findById(guideDocId).select("user_id").lean();
  const uid = (g as any)?.user_id;
  return uid ? String(uid) : null;
}

async function assertReplacementUser(userId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!mongoose.Types.ObjectId.isValid(userId)) return { ok: false, message: "ID HDV không hợp lệ" };
  const u: any = await User.findById(userId).select("role status").lean();
  if (!u) return { ok: false, message: "Không tìm thấy tài khoản HDV" };
  if (u.status === "inactive") return { ok: false, message: "Tài khoản HDV đang bị khóa" };
  const r = String(u.role || "");
  if (r !== "guide" && r !== "hdv") return { ok: false, message: "User được chọn không phải HDV" };
  return { ok: true };
}

/** Cập nhật phân công trip: mọi booking cùng tour + ngày + gán tour.primary nếu cần */
async function applyReplacementGuide(args: {
  tourId: string;
  tripDate: string;
  fromUserId: string;
  toUserId: string;
  adminName: string;
  note: string;
}) {
  const tid = new mongoose.Types.ObjectId(args.tourId);
  const bookings = await Booking.find({
    tour_id: tid,
    status: { $ne: "cancelled" },
    ...tripStartDateMatchesExpr(args.tripDate),
  })
    .select("_id guide_id")
    .lean();

  const now = new Date();
  const logEntry = {
    time: now,
    user: args.adminName,
    old: "Phân công HDV",
    new: "Thay HDV",
    note: args.note,
  };

  for (const b of bookings) {
    await Booking.updateOne(
      { _id: (b as any)._id },
      {
        $set: { guide_id: new mongoose.Types.ObjectId(args.toUserId) },
        $push: { logs: logEntry },
      }
    );
  }

  const tour: any = await Tour.findById(tid).select("primary_guide_id secondary_guide_ids").lean();
  if (!tour) return;

  const from = String(args.fromUserId);
  const to = new mongoose.Types.ObjectId(args.toUserId);
  const setPayload: Record<string, unknown> = {};
  const p = String(tour.primary_guide_id ?? "");
  if (p === from) setPayload.primary_guide_id = to;

  let secs = Array.isArray(tour.secondary_guide_ids)
    ? tour.secondary_guide_ids.map((x: any) => String(x))
    : [];
  if (secs.includes(from)) {
    secs = secs.map((id: string) => (id === from ? String(to) : id));
    const uniqIds = [...new Set(secs)] as string[];
    setPayload.secondary_guide_ids = uniqIds.map((id) => new mongoose.Types.ObjectId(id));
  }

  if (Object.keys(setPayload).length) {
    await Tour.updateOne({ _id: tid }, { $set: setPayload });
  }
}

export const createGuideLeaveRequest = async (req: AuthRequest, res: Response) => {
  try {
    const requesterId = String(req.user?._id || "");
    const tour_id = String(req.body?.tour_id || "").trim();
    const trip_date = normalizeTripDate(String(req.body?.trip_date || ""));
    const reason = String(req.body?.reason || "").trim();
    const proposedGuideDocId = req.body?.proposed_replacement_guide_id
      ? String(req.body.proposed_replacement_guide_id)
      : "";

    if (!mongoose.Types.ObjectId.isValid(tour_id)) {
      return res.status(400).json({ status: "fail", message: "tour_id không hợp lệ" });
    }
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(trip_date)) {
      return res.status(400).json({ status: "fail", message: "trip_date phải là YYYY-MM-DD" });
    }
    if (!reason) {
      return res.status(400).json({ status: "fail", message: "Vui lòng nhập lý do" });
    }

    const hasAccess = await guideHasTripAccess(requesterId, tour_id, trip_date);
    if (!hasAccess) {
      return res.status(400).json({ status: "fail", message: "Bạn không được phân công trip này" });
    }

    const dup = await GuideLeaveRequest.findOne({
      tour_id,
      trip_date,
      requester_user_id: requesterId,
      status: "pending",
    }).lean();
    if (dup) {
      return res.status(400).json({ status: "fail", message: "Bạn đã có yêu cầu Pending cho trip này" });
    }

    let proposed_replacement_user_id: mongoose.Types.ObjectId | undefined;
    if (proposedGuideDocId) {
      const uid = await resolveGuideDocIdToUserId(proposedGuideDocId);
      if (!uid) {
        return res.status(400).json({ status: "fail", message: "HDV đề xuất không hợp lệ" });
      }
      const chk = await assertReplacementUser(uid);
      if (!chk.ok) return res.status(400).json({ status: "fail", message: chk.message });
      if (uid === requesterId) {
        return res.status(400).json({ status: "fail", message: "Không thể đề xuất chính mình" });
      }
      proposed_replacement_user_id = new mongoose.Types.ObjectId(uid);
    }

    const doc = await GuideLeaveRequest.create({
      requester_user_id: requesterId,
      tour_id,
      trip_date,
      reason,
      proposed_replacement_user_id,
      status: "pending",
    });

    const populated = await GuideLeaveRequest.findById(doc._id)
      .populate("requester_user_id", "name email")
      .populate("tour_id", "name")
      .populate("proposed_replacement_user_id", "name email")
      .lean();

    res.status(201).json({ status: "success", data: populated });
  } catch (e: any) {
    res.status(500).json({ status: "error", message: e?.message || "Lỗi server" });
  }
};

export const getMyLeaveRequestForTrip = async (req: AuthRequest, res: Response) => {
  try {
    const requesterId = String(req.user?._id || "");
    const tour_id = String(req.query.tour_id || "");
    const trip_date = normalizeTripDate(String(req.query.trip_date || ""));
    if (!mongoose.Types.ObjectId.isValid(tour_id) || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(trip_date)) {
      return res.status(400).json({ status: "fail", message: "Thiếu hoặc sai tour_id / trip_date" });
    }

    const row = await GuideLeaveRequest.findOne({
      tour_id,
      trip_date,
      requester_user_id: requesterId,
      status: "pending",
    })
      .populate("requester_user_id", "name email")
      .populate("tour_id", "name")
      .populate("proposed_replacement_user_id", "name email")
      .lean();

    res.status(200).json({ status: "success", data: row || null });
  } catch (e: any) {
    res.status(500).json({ status: "error", message: e?.message || "Lỗi server" });
  }
};

export const countGuideLeaveRequestsAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const status = String(req.query.status || "pending").trim();
    const q: Record<string, unknown> = {};
    if (status && ["pending", "approved", "rejected"].includes(status)) q.status = status;
    const count = await GuideLeaveRequest.countDocuments(q);
    res.status(200).json({ status: "success", data: { count } });
  } catch (e: any) {
    res.status(500).json({ status: "error", message: e?.message || "Lỗi server" });
  }
};

export const listGuideLeaveRequestsAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const status = String(req.query.status || "").trim();
    const q: Record<string, unknown> = {};
    if (status && ["pending", "approved", "rejected"].includes(status)) q.status = status;

    const rows = await GuideLeaveRequest.find(q)
      .sort({ created_at: -1 })
      .limit(200)
      .populate("requester_user_id", "name email phone")
      .populate("tour_id", "name")
      .populate("proposed_replacement_user_id", "name email")
      .populate("resolved_replacement_user_id", "name email")
      .populate("processed_by_user_id", "name email")
      .lean();

    res.status(200).json({ status: "success", results: rows.length, data: rows });
  } catch (e: any) {
    res.status(500).json({ status: "error", message: e?.message || "Lỗi server" });
  }
};

export const approveGuideLeaveRequest = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id || "");
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: "fail", message: "ID không hợp lệ" });
    }
    const replacement_user_id = String(req.body?.replacement_user_id || "").trim();
    const admin_note = String(req.body?.admin_note || "").trim();

    const chk = await assertReplacementUser(replacement_user_id);
    if (!chk.ok) return res.status(400).json({ status: "fail", message: chk.message });

    const row: any = await GuideLeaveRequest.findById(id);
    if (!row) return res.status(404).json({ status: "fail", message: "Không tìm thấy yêu cầu" });
    if (row.status !== "pending") {
      return res.status(400).json({ status: "fail", message: "Yêu cầu không còn ở trạng thái Pending" });
    }

    const requester = String(row.requester_user_id);
    if (replacement_user_id === requester) {
      return res.status(400).json({ status: "fail", message: "HDV thay thế phải khác HDV đang báo nghỉ" });
    }

    const adminName = String((req.user as any)?.name || (req.user as any)?.email || "Admin");

    await applyReplacementGuide({
      tourId: String(row.tour_id),
      tripDate: String(row.trip_date),
      fromUserId: requester,
      toUserId: replacement_user_id,
      adminName,
      note: `Duyệt yêu cầu nghỉ/thay HDV${admin_note ? ` — ${admin_note}` : ""}`,
    });

    row.status = "approved";
    row.resolved_replacement_user_id = replacement_user_id;
    row.admin_note = admin_note || undefined;
    row.processed_at = new Date();
    row.processed_by_user_id = req.user?._id;
    await row.save();

    const populated = await GuideLeaveRequest.findById(row._id)
      .populate("requester_user_id", "name email")
      .populate("tour_id", "name")
      .populate("proposed_replacement_user_id", "name email")
      .populate("resolved_replacement_user_id", "name email")
      .lean();

    res.status(200).json({ status: "success", data: populated });
  } catch (e: any) {
    res.status(500).json({ status: "error", message: e?.message || "Lỗi server" });
  }
};

export const rejectGuideLeaveRequest = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id || "");
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: "fail", message: "ID không hợp lệ" });
    }
    const rejection_note = String(req.body?.rejection_note || "").trim();

    const row: any = await GuideLeaveRequest.findById(id);
    if (!row) return res.status(404).json({ status: "fail", message: "Không tìm thấy yêu cầu" });
    if (row.status !== "pending") {
      return res.status(400).json({ status: "fail", message: "Yêu cầu không còn ở trạng thái Pending" });
    }

    row.status = "rejected";
    row.rejection_note = rejection_note || undefined;
    row.processed_at = new Date();
    row.processed_by_user_id = req.user?._id;
    await row.save();

    const populated = await GuideLeaveRequest.findById(row._id)
      .populate("requester_user_id", "name email")
      .populate("tour_id", "name")
      .populate("processed_by_user_id", "name email")
      .lean();

    res.status(200).json({ status: "success", data: populated });
  } catch (e: any) {
    res.status(500).json({ status: "error", message: e?.message || "Lỗi server" });
  }
};
