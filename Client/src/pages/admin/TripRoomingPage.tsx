import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import {
  App,
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Form,
  InputNumber,
  List,
  Modal,
  Row,
  Select,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import { ArrowLeftOutlined, HomeOutlined, ReloadOutlined, PlusOutlined, DownloadOutlined } from "@ant-design/icons";
import { DndContext, DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import * as XLSX from "xlsx";

const { Title, Text } = Typography;
const API = "http://localhost:5000/api/v1";

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token") || localStorage.getItem("admin_token") || ""}`,
});

function DraggablePassenger(props: { passenger: any }) {
  const id = `p:${String(props.passenger?._id || "")}`;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.6 : 1,
    cursor: "grab",
    border: "1px solid rgba(15,23,42,0.10)",
    borderRadius: 10,
    padding: "10px 12px",
    background: "#fff",
    boxShadow: isDragging ? "0 12px 32px rgba(15,23,42,0.18)" : "0 6px 18px rgba(15,23,42,0.06)",
  };
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <Text strong>{props.passenger?.full_name || "—"}</Text>
        <Tag color={props.passenger?.role === "leader" ? "purple" : "blue"} style={{ margin: 0 }}>
          {props.passenger?.role === "leader" ? "Trưởng đoàn" : "Khách"}
        </Tag>
      </div>
      <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>{props.passenger?.phone || ""}</div>
    </div>
  );
}

function DroppableRoom(props: {
  room: any;
  occupants: any[];
  onRemove: (passengerId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `r:${String(props.room?._id || "")}` });
  const cap = Math.max(1, Number(props.room?.capacity || 1));
  const filled = props.occupants.length;
  const full = filled >= cap;

  return (
    <div
      ref={setNodeRef}
      style={{
        borderRadius: 14,
        border: `1px solid ${isOver ? "rgba(37,99,235,0.55)" : "rgba(15,23,42,0.10)"}`,
        background: isOver ? "rgba(37,99,235,0.06)" : "#fff",
        padding: 12,
        boxShadow: isOver ? "0 8px 18px rgba(37,99,235,0.10)" : "0 6px 16px rgba(15,23,42,0.05)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
        <div style={{ minWidth: 0 }}>
          <Text strong style={{ display: "block" }} ellipsis>
            {props.room?.hotel_name || "Khách sạn"} • Phòng {props.room?.room_number || "—"}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Sức chứa: {cap} • Đang ở: {filled}
          </Text>
        </div>
        <Tag color={full ? "red" : filled > 0 ? "green" : "default"} style={{ margin: 0 }}>
          {full ? "Đầy" : filled > 0 ? "Có khách" : "Trống"}
        </Tag>
      </div>

      {props.occupants.length === 0 ? (
        <Text type="secondary" style={{ marginTop: 10, fontSize: 12 }}>
          Kéo khách vào phòng
        </Text>
      ) : (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          {props.occupants.map((p) => (
            <div
              key={String(p?._id)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                border: "1px solid rgba(15,23,42,0.08)",
                borderRadius: 10,
                padding: "8px 10px",
                background: "#fff",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <Text style={{ display: "block" }} ellipsis>
                  {p?.full_name || "—"}
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {p?.role === "leader" ? "Trưởng đoàn" : "Khách"}
                </Text>
              </div>
              <Button size="small" danger onClick={() => props.onRemove(String(p?._id))}>
                Gỡ
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TripRoomingPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { id, date } = useParams<{ id: string; date: string }>();

  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<any>(null);
  const [roomsCatalog, setRoomsCatalog] = useState<any[]>([]);
  const [hotelsCatalog, setHotelsCatalog] = useState<any[]>([]);
  const [hotelFilter, setHotelFilter] = useState<string | "all">("all");

  const [addRoomOpen, setAddRoomOpen] = useState(false);
  const [addRoomForm] = Form.useForm();
  const [addHotelRoomsOpen, setAddHotelRoomsOpen] = useState(false);
  const [addHotelRoomsForm] = Form.useForm();

  const refresh = async () => {
    if (!id || !date) return;
    setLoading(true);
    try {
      const [roomingRes, roomsRes, hotelsRes] = await Promise.all([
        axios.get(`${API}/tours/${id}/trips/${date}/rooming`, { headers: getAuthHeaders() }),
        axios.get(`${API}/rooms`, { headers: getAuthHeaders() }),
        axios.get(`${API}/hotels`, { headers: getAuthHeaders() }),
      ]);
      setState(roomingRes.data?.data);
      const rooms = roomsRes.data?.data?.rooms ?? roomsRes.data?.data ?? [];
      setRoomsCatalog(Array.isArray(rooms) ? rooms : []);
      const hotels = hotelsRes.data?.data?.hotels ?? hotelsRes.data?.data ?? [];
      setHotelsCatalog(Array.isArray(hotels) ? hotels : []);
    } catch (e: any) {
      message.error(e?.response?.data?.message || "Không tải được dữ liệu xếp phòng.");
      setState(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, date]);

  const rooms = Array.isArray(state?.rooms) ? state.rooms : [];
  const passengers = Array.isArray(state?.passengers) ? state.passengers : [];
  const unassigned = Array.isArray(state?.unassigned) ? state.unassigned : [];
  const allocations = Array.isArray(state?.allocations) ? state.allocations : [];

  const passengersById = useMemo(() => {
    const m = new Map<string, any>();
    passengers.forEach((p: any) => m.set(String(p?._id), p));
    return m;
  }, [passengers]);

  const occupantsByRoomId = useMemo(() => {
    const m = new Map<string, any[]>();
    allocations.forEach((a: any) => {
      const rid = String(a?.trip_room_id || "");
      const pid = String(a?.passenger_id || "");
      const p = passengersById.get(pid);
      if (!rid || !p) return;
      const arr = m.get(rid) || [];
      arr.push(p);
      m.set(rid, arr);
    });
    return m;
  }, [allocations, passengersById]);

  const handleDragEnd = async (evt: DragEndEvent) => {
    const overId = evt.over?.id ? String(evt.over.id) : "";
    const activeId = evt.active?.id ? String(evt.active.id) : "";
    if (!overId || !activeId) return;
    if (!overId.startsWith("r:") || !activeId.startsWith("p:")) return;

    const tripRoomId = overId.slice(2);
    const passengerId = activeId.slice(2);
    if (!id || !date) return;
    try {
      await axios.post(
        `${API}/tours/${id}/trips/${date}/rooming/assign`,
        { trip_room_id: tripRoomId, passenger_id: passengerId },
        { headers: getAuthHeaders() }
      );
      await refresh();
    } catch (e: any) {
      message.error(e?.response?.data?.message || "Gán phòng thất bại.");
    }
  };

  const removeRooming = async (passengerId: string) => {
    if (!id || !date) return;
    try {
      await axios.delete(`${API}/tours/${id}/trips/${date}/rooming/unassign/${passengerId}`, { headers: getAuthHeaders() });
      await refresh();
    } catch (e: any) {
      message.error(e?.response?.data?.message || "Gỡ phòng thất bại.");
    }
  };

  const addRoom = async () => {
    if (!id || !date) return;
    const values = await addRoomForm.validateFields();
    try {
      await axios.post(
        `${API}/tours/${id}/trips/${date}/trip-rooms`,
        { room_id: values.room_id, capacity: values.capacity },
        { headers: getAuthHeaders() }
      );
      setAddRoomOpen(false);
      addRoomForm.resetFields();
      await refresh();
    } catch (e: any) {
      message.error(e?.response?.data?.message || "Thêm phòng vào trip thất bại.");
    }
  };

  const bulkAddByHotel = async () => {
    if (!id || !date) return;
    const values = await addHotelRoomsForm.validateFields();
    try {
      await axios.post(
        `${API}/tours/${id}/trips/${date}/trip-rooms/bulk-by-hotel`,
        { hotel_id: values.hotel_id },
        { headers: getAuthHeaders() }
      );
      message.success("Đã thêm phòng theo khách sạn vào trip");
      setAddHotelRoomsOpen(false);
      addHotelRoomsForm.resetFields();
      await refresh();
    } catch (e: any) {
      message.error(e?.response?.data?.message || "Thêm phòng theo khách sạn thất bại.");
    }
  };

  const header = (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
      <Space>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          Quay lại
        </Button>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Xếp phòng (Trip)
          </Title>
          <Text type="secondary">
            Trip: <Text code>{id}</Text> • Ngày: <Text code>{date}</Text>
          </Text>
        </div>
      </Space>
      <Space wrap>
        <Button icon={<ReloadOutlined />} onClick={refresh} loading={loading}>
          Tải lại
        </Button>
        <Button
          icon={<DownloadOutlined />}
          onClick={() => {
            const rows: any[] = [];
            rooms.forEach((r: any) => {
              const occ = occupantsByRoomId.get(String(r?._id)) || [];
              if (occ.length === 0) {
                rows.push({
                  "Khách sạn": r?.hotel_name || "",
                  "Phòng": r?.room_number || "",
                  "Sức chứa": r?.capacity || 0,
                  "Hành khách": "",
                  "Vai trò": "",
                  "SĐT": "",
                });
              } else {
                occ.forEach((p: any) => {
                  rows.push({
                    "Khách sạn": r?.hotel_name || "",
                    "Phòng": r?.room_number || "",
                    "Sức chứa": r?.capacity || 0,
                    "Hành khách": p?.full_name || "",
                    "Vai trò": p?.role === "leader" ? "Trưởng đoàn" : "Khách",
                    "SĐT": p?.phone || "",
                  });
                });
              }
            });
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Rooming");
            XLSX.writeFile(wb, `Rooming_${date || ""}.xlsx`);
          }}
          disabled={rooms.length === 0}
        >
          Xuất rooming list
        </Button>
        <Button icon={<HomeOutlined />} onClick={() => setAddHotelRoomsOpen(true)}>
          Thêm theo khách sạn
        </Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddRoomOpen(true)}>
          Thêm phòng vào trip
        </Button>
      </Space>
    </div>
  );

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        {header}
        <Divider />
        <Skeleton active />
      </div>
    );
  }

  if (!state) {
    return (
      <div style={{ padding: 24 }}>
        {header}
        <Divider />
        <Empty description="Không có dữ liệu." />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      {header}
      <Divider />

      <DndContext onDragEnd={handleDragEnd}>
        <Row gutter={16}>
          <Col xs={24} lg={7}>
            <Card
              title={
                <Space>
                  <HomeOutlined />
                  <span>Khách chưa có phòng</span>
                  <Tag color="blue">{unassigned.length}</Tag>
                </Space>
              }
              bordered
              style={{ borderRadius: 16 }}
            >
              {unassigned.length === 0 ? (
                <Empty description="Tất cả khách đã được xếp phòng." image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <List
                  dataSource={unassigned}
                  split={false}
                  renderItem={(p) => (
                    <List.Item style={{ paddingInline: 0 }}>
                      <DraggablePassenger passenger={p} />
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Col>

          <Col xs={24} lg={17}>
            <Card
              title={
                <Space wrap>
                  <HomeOutlined />
                  <span>Danh sách phòng</span>
                  <Tag color="default">{rooms.length}</Tag>
                  <Select
                    size="small"
                    style={{ minWidth: 260 }}
                    value={hotelFilter}
                    onChange={(v) => setHotelFilter(v)}
                    options={[
                      { value: "all", label: "Tất cả khách sạn" },
                      ...(Array.isArray(hotelsCatalog) ? hotelsCatalog : []).map((h: any) => ({
                        value: String(h?._id),
                        label: h?.name || "Khách sạn",
                      })),
                    ]}
                  />
                </Space>
              }
              bordered
              style={{ borderRadius: 16 }}
            >
              {rooms.length === 0 ? (
                <Empty
                  description={
                    <span>
                      Trip chưa có phòng. Bấm <b>“Thêm phòng vào trip”</b> để thêm phòng từ nhà cung cấp.
                    </span>
                  }
                />
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                  {rooms
                    .filter((r: any) => {
                      if (hotelFilter === "all") return true;
                      return String(r?.hotel_id || "") === String(hotelFilter);
                    })
                    .map((r: any) => (
                    <DroppableRoom
                      key={String(r?._id)}
                      room={r}
                      occupants={occupantsByRoomId.get(String(r?._id)) || []}
                      onRemove={removeRooming}
                    />
                  ))}
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </DndContext>

      <Modal
        title="Thêm phòng theo khách sạn"
        open={addHotelRoomsOpen}
        onCancel={() => setAddHotelRoomsOpen(false)}
        onOk={bulkAddByHotel}
      >
        <Form form={addHotelRoomsForm} layout="vertical">
          <Form.Item name="hotel_id" label="Chọn khách sạn" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Chọn khách sạn"
              options={(Array.isArray(hotelsCatalog) ? hotelsCatalog : []).map((h: any) => ({
                value: String(h?._id),
                label: h?.name || "Khách sạn",
              }))}
            />
          </Form.Item>
        </Form>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Hệ thống sẽ thêm <b>tất cả phòng active</b> của khách sạn này vào trip (bỏ qua phòng đã tồn tại).
        </Text>
      </Modal>

      <Modal title="Thêm phòng vào trip" open={addRoomOpen} onCancel={() => setAddRoomOpen(false)} onOk={addRoom}>
        <Form form={addRoomForm} layout="vertical">
          <Form.Item name="room_id" label="Chọn phòng (từ nhà cung cấp)" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Chọn phòng"
              onChange={(val) => {
                const r = (Array.isArray(roomsCatalog) ? roomsCatalog : []).find((x: any) => String(x?._id) === String(val));
                const maxOcc = Number(r?.max_occupancy || 0);
                if (Number.isFinite(maxOcc) && maxOcc > 0) addRoomForm.setFieldsValue({ capacity: maxOcc });
              }}
              options={(Array.isArray(roomsCatalog) ? roomsCatalog : []).map((r: any) => ({
                value: String(r?._id),
                label: `${r?.hotel_id?.name || "Hotel"} • phòng ${r?.room_number || ""} • occ ${r?.max_occupancy || 0}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="capacity" label="Sức chứa (<= max_occupancy)" initialValue={2} rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Gợi ý: để demo nhanh, chọn phòng và để capacity bằng max occupancy.
        </Text>
      </Modal>
    </div>
  );
}

