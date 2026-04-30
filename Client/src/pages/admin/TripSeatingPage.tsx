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
import { ArrowLeftOutlined, CarOutlined, ReloadOutlined, SettingOutlined, DownloadOutlined } from "@ant-design/icons";
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
        <Text strong style={{ lineHeight: 1.2 }}>
          {props.passenger?.full_name || "—"}
        </Text>
        <Tag color={props.passenger?.is_leader ? "purple" : "blue"} style={{ margin: 0 }}>
          {props.passenger?.is_leader ? "Trưởng đoàn" : "Khách"}
        </Tag>
      </div>
      <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
        <Text type="secondary">{props.passenger?.phone || ""}</Text>
      </div>
    </div>
  );
}

function DroppableSeat(props: {
  seatCode: string;
  occupant?: any;
  onRemove?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `s:${props.seatCode}` });

  const base: React.CSSProperties = {
    borderRadius: 12,
    border: `1px solid ${isOver ? "rgba(37,99,235,0.55)" : "rgba(15,23,42,0.10)"}`,
    background: isOver ? "rgba(37,99,235,0.06)" : "#fff",
    padding: 10,
    minHeight: 76,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    boxShadow: isOver ? "0 8px 18px rgba(37,99,235,0.10)" : "0 6px 16px rgba(15,23,42,0.05)",
  };

  return (
    <div ref={setNodeRef} style={base}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <Text strong>Ghế {props.seatCode}</Text>
        <Tag color={props.occupant ? "green" : "default"} style={{ margin: 0 }}>
          {props.occupant ? "Đã gán" : "Trống"}
        </Tag>
      </div>
      {props.occupant ? (
        <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <div style={{ minWidth: 0 }}>
            <Text style={{ display: "block" }} ellipsis>
              {props.occupant?.full_name}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
              {props.occupant?.is_leader ? "Trưởng đoàn" : "Khách"}
            </Text>
          </div>
          <Button size="small" danger onClick={props.onRemove}>
            Gỡ
          </Button>
        </div>
      ) : (
        <Text type="secondary" style={{ marginTop: 10, fontSize: 12 }}>
          Kéo khách vào ghế
        </Text>
      )}
    </div>
  );
}

export default function TripSeatingPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { id, date } = useParams<{ id: string; date: string }>();

  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<any>(null);
  const [activeVehicleId, setActiveVehicleId] = useState<string>("");

  const [vehiclesCatalog, setVehiclesCatalog] = useState<any[]>([]);
  const [addVehicleOpen, setAddVehicleOpen] = useState(false);
  const [addVehicleForm] = Form.useForm();
  const selectedVehicleCap = useMemo(() => {
    const vid = addVehicleForm.getFieldValue("vehicle_id");
    const v = (Array.isArray(vehiclesCatalog) ? vehiclesCatalog : []).find((x: any) => String(x?._id) === String(vid));
    const cap = Number(v?.capacity || 0);
    return Number.isFinite(cap) && cap > 0 ? cap : undefined;
  }, [vehiclesCatalog, addVehicleOpen, addVehicleForm]);

  const refresh = async () => {
    if (!id || !date) return;
    setLoading(true);
    try {
      const [seatingRes, catalogRes] = await Promise.all([
        axios.get(`${API}/tours/${id}/trips/${date}/seating`, { headers: getAuthHeaders() }),
        axios.get(`${API}/vehicles`, { headers: getAuthHeaders() }),
      ]);
      const payload = seatingRes.data?.data;
      setState(payload);
      const vehiclesData =
        catalogRes.data?.data?.vehicles ??
        catalogRes.data?.data ??
        [];
      setVehiclesCatalog(Array.isArray(vehiclesData) ? vehiclesData : []);

      const vehicles = Array.isArray(payload?.vehicles) ? payload.vehicles : [];
      if (vehicles.length > 0 && !activeVehicleId) {
        setActiveVehicleId(String(vehicles[0]._id));
      }
    } catch (e: any) {
      message.error(e?.response?.data?.message || "Không tải được dữ liệu điều hành xe.");
      setState(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [id, date]);

  const vehicles = Array.isArray(state?.vehicles) ? state.vehicles : [];
  const allocations = Array.isArray(state?.allocations) ? state.allocations : [];
  const passengers = Array.isArray(state?.passengers) ? state.passengers : [];
  const unseated = Array.isArray(state?.unseated) ? state.unseated : [];

  const passengersById = useMemo(() => {
    const m = new Map<string, any>();
    passengers.forEach((p: any) => m.set(String(p?._id), p));
    return m;
  }, [passengers]);

  const seatsForActiveVehicle = useMemo(() => {
    const v = vehicles.find((x: any) => String(x?._id) === String(activeVehicleId)) || vehicles[0];
    const seatCount = Math.max(1, Number(v?.seat_count || 45));
    const occupantBySeat = new Map<string, any>();
    allocations
      .filter((a: any) => String(a?.trip_vehicle_id) === String(v?._id))
      .forEach((a: any) => {
        const p = passengersById.get(String(a?.passenger_id));
        occupantBySeat.set(String(a?.seat_code), p || null);
      });
    return { vehicle: v, seatCount, occupantBySeat };
  }, [activeVehicleId, allocations, passengersById, vehicles]);

  const seatLayout = useMemo(() => {
    const total = Math.max(1, Number(seatsForActiveVehicle.seatCount || 45));
    const cells: Array<{ kind: "seat" | "aisle"; code?: string }> = [];
    const fullRowSeats = 4;
    const lastRowSeats = 5;
    const fullRows = Math.floor(total / fullRowSeats);
    const rem = total % fullRowSeats;

    const pushRow = (rowNo: number, letters: string[]) => {
      // 5 columns: A B aisle C D (or E when last row has 5)
      const left = letters.slice(0, 2);
      const right = letters.slice(2);
      for (const l of left) cells.push({ kind: "seat", code: `${rowNo}${l}` });
      cells.push({ kind: "aisle" });
      for (const l of right) cells.push({ kind: "seat", code: `${rowNo}${l}` });
      // pad to 5 columns
      while (cells.length % 5 !== 0) cells.push({ kind: "aisle" });
    };

    const rowsForFour = fullRows;
    let used = 0;
    for (let r = 1; r <= rowsForFour; r += 1) {
      if (used + fullRowSeats > total) break;
      pushRow(r, ["A", "B", "C", "D"]);
      used += fullRowSeats;
    }

    if (used < total) {
      const rowNo = rowsForFour + 1;
      const remaining = total - used;
      if (remaining >= lastRowSeats) {
        pushRow(rowNo, ["A", "B", "C", "D", "E"]);
        used += lastRowSeats;
      } else {
        // partial last row: fill left then right then extra
        const letters = ["A", "B", "C", "D", "E"].slice(0, remaining);
        pushRow(rowNo, letters);
        used += remaining;
      }
    }

    const seatCells = cells.filter((c) => c.kind === "seat");
    if (seatCells.length === 0) {
      return Array.from({ length: total }, (_, i) => ({ kind: "seat" as const, code: String(i + 1) }));
    }
    return cells;
  }, [seatsForActiveVehicle.seatCount]);

  const exportSeatingExcel = () => {
    const v = seatsForActiveVehicle.vehicle;
    if (!v) return message.warning("Chưa có xe để xuất.");
    const tvId = String(v?._id || "");
    const rows: any[] = [];
    seatLayout
      .filter((c) => c.kind === "seat" && c.code)
      .forEach((c: any) => {
        const seatCode = String(c.code);
        const occ = seatsForActiveVehicle.occupantBySeat.get(seatCode);
        rows.push({
          "Xe": v?.plate || "Xe",
          "TripVehicleId": tvId,
          "Ghế": seatCode,
          "Hành khách": occ?.full_name || "",
          "Vai trò": occ?.is_leader ? "Trưởng đoàn" : occ ? "Khách" : "",
          "SĐT": occ?.phone || "",
          "BookingId": occ?.booking_id || "",
        });
      });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Seating");
    const fileName = `Seating_${date || ""}_${v?.plate || "XE"}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const handleDragEnd = async (evt: DragEndEvent) => {
    const overId = evt.over?.id ? String(evt.over.id) : "";
    const activeId = evt.active?.id ? String(evt.active.id) : "";
    if (!overId || !activeId) return;
    if (!overId.startsWith("s:") || !activeId.startsWith("p:")) return;

    const seatCode = overId.slice(2);
    const passengerId = activeId.slice(2);
    const tvId = String(seatsForActiveVehicle.vehicle?._id || "");
    if (!id || !date || !tvId) return;

    try {
      await axios.post(
        `${API}/tours/${id}/trips/${date}/seating/assign`,
        { trip_vehicle_id: tvId, passenger_id: passengerId, seat_code: seatCode },
        { headers: getAuthHeaders() }
      );
      await refresh();
    } catch (e: any) {
      message.error(e?.response?.data?.message || "Gán ghế thất bại.");
    }
  };

  const removeSeat = async (passengerId: string) => {
    if (!id || !date) return;
    try {
      await axios.delete(`${API}/tours/${id}/trips/${date}/seating/unassign/${passengerId}`, { headers: getAuthHeaders() });
      await refresh();
    } catch (e: any) {
      message.error(e?.response?.data?.message || "Gỡ ghế thất bại.");
    }
  };

  const addVehicle = async () => {
    if (!id || !date) return;
    const values = await addVehicleForm.validateFields();
    try {
      await axios.post(
        `${API}/tours/${id}/trips/${date}/trip-vehicles`,
        { vehicle_id: values.vehicle_id, seat_count: values.seat_count },
        { headers: getAuthHeaders() }
      );
      setAddVehicleOpen(false);
      addVehicleForm.resetFields();
      await refresh();
    } catch (e: any) {
      message.error(e?.response?.data?.message || "Thêm xe vào trip thất bại.");
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
            Điều hành xe (Trip)
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
        <Button icon={<DownloadOutlined />} onClick={exportSeatingExcel} disabled={vehicles.length === 0}>
          Xuất danh sách ghế
        </Button>
        <Button type="primary" icon={<CarOutlined />} onClick={() => setAddVehicleOpen(true)}>
          Thêm xe vào trip
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
                  <SettingOutlined />
                  <span>Khách chưa có ghế</span>
                  <Tag color="blue">{unseated.length}</Tag>
                </Space>
              }
              bordered
              style={{ borderRadius: 16 }}
            >
              {unseated.length === 0 ? (
                <Empty description="Tất cả khách đã có ghế." image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <List
                  dataSource={unseated}
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
                  <CarOutlined />
                  <span>Sơ đồ ghế</span>
                  <Select
                    value={activeVehicleId || (vehicles[0]?._id ? String(vehicles[0]._id) : undefined)}
                    style={{ minWidth: 320 }}
                    onChange={(v) => setActiveVehicleId(String(v))}
                    options={vehicles.map((v: any) => ({
                      value: String(v._id),
                      label: `${v?.plate || "Xe"} • ${v?.seat_count || 0} chỗ`,
                    }))}
                    placeholder="Chọn xe"
                  />
                </Space>
              }
              bordered
              style={{ borderRadius: 16 }}
            >
              {vehicles.length === 0 ? (
                <Empty
                  description={
                    <span>
                      Trip chưa có xe. Bấm <b>“Thêm xe vào trip”</b> để tạo xe (demo 1 xe).
                    </span>
                  }
                />
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                    gap: 12,
                  }}
                >
                  {seatLayout.map((cell, idx) => {
                    if (cell.kind === "aisle") {
                      return <div key={`aisle-${idx}`} style={{ opacity: 0.25, borderRadius: 12, background: "transparent" }} />;
                    }
                    const code = String(cell.code || "");
                    return (
                      <DroppableSeat
                        key={code || `seat-${idx}`}
                        seatCode={code}
                        occupant={seatsForActiveVehicle.occupantBySeat.get(code)}
                        onRemove={() => {
                          const occ = seatsForActiveVehicle.occupantBySeat.get(code);
                          if (occ?._id) removeSeat(String(occ._id));
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </DndContext>

      <Modal
        title="Thêm xe vào trip"
        open={addVehicleOpen}
        onCancel={() => setAddVehicleOpen(false)}
        onOk={addVehicle}
      >
        <Form form={addVehicleForm} layout="vertical">
          <Form.Item name="vehicle_id" label="Chọn xe (từ nhà cung cấp)" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Chọn xe"
              onChange={(val) => {
                const v = (Array.isArray(vehiclesCatalog) ? vehiclesCatalog : []).find((x: any) => String(x?._id) === String(val));
                const cap = Number(v?.capacity || 0);
                if (Number.isFinite(cap) && cap > 0) {
                  addVehicleForm.setFieldsValue({ seat_count: cap });
                }
              }}
              options={(Array.isArray(vehiclesCatalog) ? vehiclesCatalog : []).map((v: any) => ({
                value: String(v?._id),
                label: `${v?.plate || "Xe"} • cap ${v?.capacity || 0}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="seat_count" label="Số ghế (demo)" initialValue={45} rules={[{ required: true }]}>
            <InputNumber min={1} max={selectedVehicleCap} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Gợi ý: để demo nhanh, bạn chọn 1 xe và để 45 ghế.
        </Text>
      </Modal>
    </div>
  );
}

