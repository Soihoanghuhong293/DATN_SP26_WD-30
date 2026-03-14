import { Card, Row, Col } from "antd";

const Dashboard = () => {
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8, color: "#1f2937" }}>
        Tổng quan
      </h1>
      <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 24 }}>
        Thống kê tổng quan hệ thống
      </p>

      <Row gutter={24}>
        <Col xs={24} sm={12} lg={8}>
          <Card
            bordered={false}
            style={{ borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
          >
            <div style={{ color: "#6b7280", marginBottom: 8 }}>
              Tổng Booking
            </div>
            <div style={{ fontSize: 28, fontWeight: 600 }}>120</div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card
            bordered={false}
            style={{ borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
          >
            <div style={{ color: "#6b7280", marginBottom: 8 }}>
              Doanh thu
            </div>
            <div style={{ fontSize: 28, fontWeight: 600 }}>50tr</div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card
            bordered={false}
            style={{ borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
          >
            <div style={{ color: "#6b7280", marginBottom: 8 }}>
              Khách mới
            </div>
            <div style={{ fontSize: 28, fontWeight: 600 }}>15</div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
