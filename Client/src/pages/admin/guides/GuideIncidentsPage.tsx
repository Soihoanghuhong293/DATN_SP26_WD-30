import { useMemo, useState } from "react";
import {
  Button,
  Empty,
  Form,
  Input,
  Modal,
  Radio,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { CheckOutlined, CloseOutlined, ReloadOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import dayjs from "dayjs";
import AdminPageHeader from "../../../components/admin/AdminPageHeader";
import AdminListCard from "../../../components/admin/AdminListCard";
import { ADMIN_PENDING_HDV_LEAVE_COUNT_KEY } from "../../../components/layout/AdminSidebar";

const { Text } = Typography;
const { TextArea } = Input;

const API_V1 = (import.meta as any)?.env?.VITE_API_URL || "http://localhost:5000/api/v1";

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

type LeaveStatus = "pending" | "approved" | "rejected" | "";

type LeaveRow = {
  _id: string;
  trip_date: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at?: string;
  admin_note?: string;
  rejection_note?: string;
  requester_user_id?: { name?: string; email?: string };
  tour_id?: { name?: string };
  proposed_replacement_user_id?: { name?: string; email?: string };
  resolved_replacement_user_id?: { name?: string; email?: string };
};

export default function GuideIncidentsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<LeaveStatus>("pending");
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [activeRow, setActiveRow] = useState<LeaveRow | null>(null);
  const [approveForm] = Form.useForm();
  const [rejectForm] = Form.useForm();

  const { data: rows = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin-guide-leave-requests", statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      const res = await axios.get(`${API_V1}/guide-leave-requests`, { ...getAuthHeader(), params });
      return (res.data?.data || []) as LeaveRow[];
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["admin-users-for-hdv-replace"],
    queryFn: async () => {
      const res = await axios.get(`${API_V1}/users`, getAuthHeader());
      return (res.data?.data || []) as any[];
    },
    enabled: approveOpen,
  });

  const replacementUserOptions = useMemo(() => {
    return (users as any[])
      .filter((u) => (u.role === "guide" || u.role === "hdv") && u.status !== "inactive")
      .map((u) => ({
        value: String(u._id),
        label: `${u.name || "HDV"} · ${u.email || ""}`,
      }));
  }, [users]);

  const approveMutation = useMutation({
    mutationFn: async (payload: { id: string; replacement_user_id: string; admin_note?: string }) => {
      await axios.patch(
        `${API_V1}/guide-leave-requests/${payload.id}/approve`,
        { replacement_user_id: payload.replacement_user_id, admin_note: payload.admin_note || undefined },
        getAuthHeader()
      );
    },
    onSuccess: () => {
      message.success("Đã duyệt và phân công HDV mới cho các đơn trong trip.");
      queryClient.invalidateQueries({ queryKey: ["admin-guide-leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ADMIN_PENDING_HDV_LEAVE_COUNT_KEY });
      queryClient.invalidateQueries({ queryKey: ["hdv-leave-request-trip"] });
      queryClient.invalidateQueries({ queryKey: ["hdv-guide-me-bookings"] });
      setApproveOpen(false);
      setActiveRow(null);
      approveForm.resetFields();
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || "Duyệt thất bại.");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (payload: { id: string; rejection_note?: string }) => {
      await axios.patch(
        `${API_V1}/guide-leave-requests/${payload.id}/reject`,
        { rejection_note: payload.rejection_note || undefined },
        getAuthHeader()
      );
    },
    onSuccess: () => {
      message.success("Đã từ chối yêu cầu.");
      queryClient.invalidateQueries({ queryKey: ["admin-guide-leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ADMIN_PENDING_HDV_LEAVE_COUNT_KEY });
      queryClient.invalidateQueries({ queryKey: ["hdv-leave-request-trip"] });
      setRejectOpen(false);
      setActiveRow(null);
      rejectForm.resetFields();
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || "Từ chối thất bại.");
    },
  });

  const statusTag = (s: string) => {
    if (s === "pending") return <Tag color="gold">Pending</Tag>;
    if (s === "approved") return <Tag color="green">Đã duyệt</Tag>;
    if (s === "rejected") return <Tag color="red">Từ chối</Tag>;
    return <Tag>{s}</Tag>;
  };

  const columns: ColumnsType<LeaveRow> = [
    {
      title: "Thời gian",
      key: "created_at",
      width: 150,
      render: (_, r) => (
        <Text type="secondary">{r.created_at ? dayjs(r.created_at).format("DD/MM/YYYY HH:mm") : "—"}</Text>
      ),
    },
    {
      title: "Tour",
      key: "tour",
      width: 200,
      ellipsis: true,
      render: (_, r) => <Tooltip title={r.tour_id?.name}>{r.tour_id?.name || "—"}</Tooltip>,
    },
    {
      title: "Ngày trip",
      dataIndex: "trip_date",
      key: "trip_date",
      width: 110,
    },
    {
      title: "HDV báo nghỉ",
      key: "req",
      width: 200,
      ellipsis: true,
      render: (_, r) => {
        const u = r.requester_user_id;
        const line = u ? `${u.name || ""}${u.email ? ` (${u.email})` : ""}` : "—";
        return <Tooltip title={line}>{line}</Tooltip>;
      },
    },
    {
      title: "Lý do",
      dataIndex: "reason",
      key: "reason",
      ellipsis: true,
      render: (t: string) => <Tooltip title={t}>{t}</Tooltip>,
    },
    {
      title: "Đề xuất thay",
      key: "prop",
      width: 180,
      ellipsis: true,
      render: (_, r) => {
        const u = r.proposed_replacement_user_id;
        if (!u) return <Text type="secondary">—</Text>;
        const line = `${u.name || ""}${u.email ? ` (${u.email})` : ""}`;
        return <Tooltip title={line}>{line}</Tooltip>;
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (s: string) => statusTag(s),
    },
    {
      title: "Ghi chú xử lý",
      key: "notes",
      width: 160,
      ellipsis: true,
      render: (_, r) => {
        if (r.status === "rejected") return <Tooltip title={r.rejection_note}>{r.rejection_note || "—"}</Tooltip>;
        if (r.status === "approved") {
          const who = r.resolved_replacement_user_id;
          const whoLine = who ? `${who.name || ""}` : "";
          const tail = [whoLine && `HDV mới: ${whoLine}`, r.admin_note].filter(Boolean).join(" · ");
          return <Tooltip title={tail}>{tail || "—"}</Tooltip>;
        }
        return "—";
      },
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 200,
      fixed: "right",
      render: (_, r) =>
        r.status === "pending" ? (
          <Space>
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => {
                setActiveRow(r);
                approveForm.resetFields();
                setApproveOpen(true);
              }}
            >
              Duyệt
            </Button>
            <Button
              danger
              size="small"
              icon={<CloseOutlined />}
              onClick={() => {
                setActiveRow(r);
                rejectForm.resetFields();
                setRejectOpen(true);
              }}
            >
              Từ chối
            </Button>
          </Space>
        ) : null,
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Sự cố HDV"
        subtitle="Yêu cầu báo nghỉ / đề xuất thay HDV. Duyệt: chọn HDV mới (có thể khác đề xuất). Từ chối: kết thúc yêu cầu."
        extra={
          <Button icon={<ReloadOutlined />} loading={isFetching && !isLoading} onClick={() => refetch()}>
            Tải lại
          </Button>
        }
      />

      <AdminListCard>
        <Space style={{ marginBottom: 16 }} wrap>
          <Text>Lọc:</Text>
          <Radio.Group value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <Radio.Button value="">Tất cả</Radio.Button>
            <Radio.Button value="pending">Pending</Radio.Button>
            <Radio.Button value="approved">Đã duyệt</Radio.Button>
            <Radio.Button value="rejected">Từ chối</Radio.Button>
          </Radio.Group>
        </Space>

        <Table<LeaveRow>
          rowKey="_id"
          loading={isLoading}
          columns={columns}
          dataSource={rows}
          scroll={{ x: 1100 }}
          locale={{ emptyText: <Empty description="Không có yêu cầu" /> }}
        />
      </AdminListCard>

      <Modal
        title="Duyệt yêu cầu — phân công HDV mới"
        open={approveOpen}
        okText="Xác nhận duyệt"
        cancelText="Hủy"
        confirmLoading={approveMutation.isPending}
        onCancel={() => {
          setApproveOpen(false);
          setActiveRow(null);
          approveForm.resetFields();
        }}
        onOk={() => approveForm.submit()}
        destroyOnClose
        width={520}
      >
        <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
          Chọn tài khoản HDV sẽ nhận trip (có thể khác người HDV đề xuất). Hệ thống cập nhật phân công cho mọi đơn
          cùng tour và ngày khởi hành.
        </Text>
        <Form
          form={approveForm}
          layout="vertical"
          onFinish={(v) => {
            if (!activeRow) return;
            approveMutation.mutate({
              id: activeRow._id,
              replacement_user_id: v.replacement_user_id,
              admin_note: v.admin_note?.trim() || undefined,
            });
          }}
        >
          <Form.Item
            name="replacement_user_id"
            label="HDV thay thế (User)"
            rules={[{ required: true, message: "Chọn HDV mới" }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Chọn HDV..."
              options={replacementUserOptions}
            />
          </Form.Item>
          <Form.Item name="admin_note" label="Ghi chú (tuỳ chọn)">
            <TextArea rows={2} maxLength={500} showCount placeholder="Ghi chú nội bộ cho HDV / lịch sử đơn" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Từ chối yêu cầu"
        open={rejectOpen}
        okText="Xác nhận từ chối"
        cancelText="Hủy"
        confirmLoading={rejectMutation.isPending}
        onCancel={() => {
          setRejectOpen(false);
          setActiveRow(null);
          rejectForm.resetFields();
        }}
        onOk={() => rejectForm.submit()}
        destroyOnClose
        width={480}
      >
        <Form
          form={rejectForm}
          layout="vertical"
          onFinish={(v) => {
            if (!activeRow) return;
            rejectMutation.mutate({
              id: activeRow._id,
              rejection_note: v.rejection_note?.trim() || undefined,
            });
          }}
        >
          <Form.Item name="rejection_note" label="Lý do từ chối (tuỳ chọn)">
            <TextArea rows={3} maxLength={500} showCount placeholder="VD: Đã xếp người khác, không đủ nhân sự…" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
