import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { App, Button, Card, Descriptions, Divider, Empty, Space, Spin, Table, Tag, Tooltip, Typography, Tabs } from "antd";
import { ArrowLeftOutlined, ReloadOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;
const API = (import.meta.env?.VITE_API_URL as string | undefined) || "http://localhost:5000/api/v1";

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token") || localStorage.getItem("admin_token") || ""}`,
});

export default function HdvTripAssignmentPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { id, date } = useParams<{ id: string; date: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [tripStatus, setTripStatus] = useState<string>('');
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);

  const refresh = async () => {
    if (!id || !date) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API}/tours/${id}/trips/${date}/assignment`, { headers: getAuthHeaders() });
      setData(res.data?.data || null);
      try {
        const st = await axios.get(`${API}/tours/${id}/trips/${date}/status`, { headers: getAuthHeaders() });
        setTripStatus(String(st.data?.data?.status || ''));
      } catch {
        setTripStatus('');
      }
    } catch (e: any) {
      message.error(e?.response?.data?.message || "Không tải được lệnh điều động.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, date]);

  const passengerRows = useMemo(() => {
    const ps = Array.isArray(data?.passengers) ? data.passengers : [];
    return ps.map((p: any, idx: number) => ({
      key: String(p?._id || idx),
      stt: idx + 1,
      full_name: p?.full_name || "",
      phone: p?.phone || "",
      is_leader: Boolean(p?.is_leader),
      vehicle_plate: p?.seat?.plate || "",
      vehicle_label: p?.seat?.vehicle_label || "",
      seat_code: p?.seat?.seat_code || "",
    }));
  }, [data]);

  const passengersByVehicle = useMemo(() => {
    const m = new Map<string, any[]>();
    passengerRows.forEach((p: any) => {
      const key = p.vehicle_plate ? `plate:${p.vehicle_plate}` : "unassigned";
      const arr = m.get(key) || [];
      arr.push(p);
      m.set(key, arr);
    });
    for (const [k, arr] of m.entries()) {
      arr.sort((a, b) => {
        if (Number(b.is_leader) !== Number(a.is_leader)) return Number(b.is_leader) - Number(a.is_leader);
        return String(a.full_name).localeCompare(String(b.full_name));
      });
      m.set(k, arr);
    }
    return m;
  }, [passengerRows]);

  const allocationIncomplete = useMemo(() => {
    const ps = Array.isArray(data?.passengers) ? data.passengers : [];
    if (ps.length === 0) return false;
    return ps.some((p: any) => !p?.seat || !p?.room);
  }, [data]);

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <Spin />
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: 24 }}>
        <Empty description="Không có dữ liệu lệnh điều động." />
        <div style={{ marginTop: 12 }}>
          <Button onClick={() => navigate(-1)}>Quay lại</Button>
        </div>
      </div>
    );
  }

  const trip = data?.trip || {};
  const guide = data?.guide || null;
  const vehicles = Array.isArray(data?.vehicles) ? data.vehicles : [];
  const hotels = Array.isArray(data?.hotels) ? data.hotels : [];
  const roomingList: any[] = Array.isArray(data?.rooming_list) ? data.rooming_list : [];
  const unpaidBookingCount = Number((data as any)?.unpaid_booking_count || 0);
  const stUpper = String(tripStatus || '').toUpperCase();
  const canStart =
    stUpper === "OPENING" && unpaidBookingCount <= 0 && !allocationIncomplete;
  const canEnd = stUpper === 'CLOSED';

  const startTrip = async () => {
    if (!id || !date) return;
    setStarting(true);
    try {
      await axios.post(`${API}/tours/${id}/trips/${date}/start`, {}, { headers: getAuthHeaders() });
      message.success('Đã bắt đầu chuyến đi');
      await refresh();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Không bắt đầu được');
    } finally {
      setStarting(false);
    }
  };

  const endTrip = async () => {
    if (!id || !date) return;
    setEnding(true);
    try {
      await axios.post(`${API}/tours/${id}/trips/${date}/end`, {}, { headers: getAuthHeaders() });
      message.success('Đã kết thúc chuyến đi');
      await refresh();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Không kết thúc được');
    } finally {
      setEnding(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <Space direction="vertical" size={14} style={{ width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <Title level={3} style={{ marginBottom: 0 }}>
              Lệnh điều động
            </Title>
            <Text type="secondary">
              {trip?.tour_name || "Tour"} • Ngày: <Text code>{trip?.trip_date || date}</Text>
            </Text>
          </div>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
              Quay lại
            </Button>
            <Button icon={<ReloadOutlined />} onClick={refresh}>
              Tải lại
            </Button>
            <Tooltip
              title={
                stUpper !== 'OPENING'
                  ? 'Chỉ được bắt đầu khi trạng thái là Mở bán (OPENING).'
                  : unpaidBookingCount > 0
                    ? `Không thể bắt đầu vì còn ${unpaidBookingCount} booking chưa thanh toán đủ.`
                    : allocationIncomplete
                      ? 'Mọi khách phải được xếp ghế xe và phòng khách sạn (đủ chỗ) trước khi bắt đầu chuyến.'
                      : undefined
              }
            >
              <Button type="primary" loading={starting} disabled={!canStart} onClick={startTrip}>
                Bắt đầu
              </Button>
            </Tooltip>
            <Button danger loading={ending} disabled={!canEnd} onClick={endTrip}>
              Kết thúc
            </Button>
          </Space>
        </div>

        <Card style={{ borderRadius: 12 }}>
          <Descriptions bordered column={1} size="small" styles={{ label: { width: 220, fontWeight: 700 } }}>
            <Descriptions.Item label="Hướng dẫn viên">
              {guide?.name ? (
                <Space direction="vertical" size={2}>
                  <Text strong>{guide.name}</Text>
                  <Text type="secondary">SĐT: {guide.phone || "—"}</Text>
                </Space>
              ) : (
                <Text type="secondary">Chưa cập nhật</Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Xe">
              {vehicles.length ? (
                <Space direction="vertical" size={2}>
                  {vehicles.map((v: any) => (
                    <div key={String(v?._id || v?.plate)}>
                      <Text strong>{v.vehicle_label || "Ô tô"}</Text>{" "}
                      <Text type="secondary">• Biển số: {v.plate || "—"}</Text>
                    </div>
                  ))}
                </Space>
              ) : (
                <Text type="secondary">Chưa cập nhật</Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Khách sạn">
              {hotels.length ? (
                <Space direction="vertical" size={2}>
                  {hotels.map((h: any) => (
                    <div key={String(h?.hotel_id || h?.name)}>
                      <Text strong>{h?.name || "—"}</Text>{" "}
                      <Text type="secondary">• Địa chỉ: {h?.address || "—"}</Text>
                    </div>
                  ))}
                </Space>
              ) : (
                <Text type="secondary">Chưa cập nhật</Text>
              )}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card style={{ borderRadius: 12 }} title="Rooming list (Phát chìa khóa)">
          {roomingList.length === 0 ? (
            <Empty description="Chưa có rooming." />
          ) : (
            <Space direction="vertical" size={10} style={{ width: "100%" }}>
              {roomingList.map((r: any) => {
                const occ = Array.isArray(r?.occupants) ? r.occupants : [];
                const title = `Phòng ${r?.room_number || "—"} (${r?.hotel_name || "Khách sạn"})`;
                return (
                  <Card
                    key={String(r?.trip_room_id)}
                    size="small"
                    style={{ borderRadius: 12, border: "1px solid #eef2f7" }}
                    title={<Text strong>{title}</Text>}
                  >
                    {occ.length === 0 ? (
                      <Text type="secondary">Chưa xếp khách vào phòng này.</Text>
                    ) : (
                      <Space wrap>
                        {occ.map((p: any) => (
                          <Tag key={String(p?._id)} color={p?.is_leader ? "purple" : "blue"}>
                            {p?.full_name || "—"}
                          </Tag>
                        ))}
                      </Space>
                    )}
                  </Card>
                );
              })}
            </Space>
          )}
        </Card>

        <Card style={{ borderRadius: 12 }} title="Danh sách khách (Điểm danh lên xe)">
          <Divider style={{ marginTop: 0 }} />
          <Tabs
            items={[
              ...vehicles.map((v: any) => {
                const key = v?.plate ? `plate:${v.plate}` : `v:${String(v?._id || "")}`;
                const rows = passengersByVehicle.get(key) || [];
                const label = `${v?.vehicle_label || "Xe"}${v?.plate ? ` (${v.plate})` : ""}`;
                return {
                  key,
                  label,
                  children: (
                    <Table
                      size="small"
                      pagination={{ pageSize: 12 }}
                      dataSource={rows}
                      columns={[
                        { title: "#", dataIndex: "stt", width: 60 },
                        {
                          title: "Họ tên",
                          dataIndex: "full_name",
                          render: (t: string, r: any) => (
                            <Space>
                              <Text strong>{t}</Text>
                              {r?.is_leader ? <Tag color="purple">Trưởng đoàn</Tag> : null}
                            </Space>
                          ),
                        },
                        { title: "SĐT", dataIndex: "phone", width: 140 },
                        { title: "Xe", render: () => <Text type="secondary">{v?.plate || "—"}</Text>, width: 140 },
                        { title: "Ghế", dataIndex: "seat_code", width: 100, render: (x: any) => x || <Text type="secondary">—</Text> },
                      ]}
                    />
                  ),
                };
              }),
              {
                key: "unassigned",
                label: `Chưa xếp xe (${(passengersByVehicle.get("unassigned") || []).length})`,
                children: (
                  <Table
                    size="small"
                    pagination={{ pageSize: 12 }}
                    dataSource={passengersByVehicle.get("unassigned") || []}
                    columns={[
                      { title: "#", dataIndex: "stt", width: 60 },
                      {
                        title: "Họ tên",
                        dataIndex: "full_name",
                        render: (t: string, r: any) => (
                          <Space>
                            <Text strong>{t}</Text>
                            {r?.is_leader ? <Tag color="purple">Trưởng đoàn</Tag> : null}
                          </Space>
                        ),
                      },
                      { title: "SĐT", dataIndex: "phone", width: 140 },
                      { title: "Xe", render: () => <Text type="secondary">Chưa xếp</Text>, width: 140 },
                      { title: "Ghế", render: () => <Text type="secondary">—</Text>, width: 100 },
                    ]}
                  />
                ),
              },
            ]}
          />
        </Card>
      </Space>
    </div>
  );
}

