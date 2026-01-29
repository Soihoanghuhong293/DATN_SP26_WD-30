import { Card, Row, Col } from "antd";

const Dashboard = () => {
  return (
    <div>
      {/* Title */}
      <h1
        style={{
          fontSize: 24,
          fontWeight: 600,
          marginBottom: 24,
        }}
      >
        Tổng quan hệ thống
      </h1>

      {/* Stats */}
      <Row gutter={24}>
        <Col span={8}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
            }}
          >
            <div style={{ color: "#6b7280", marginBottom: 8 }}>
              Tổng Booking
            </div>
            <div style={{ fontSize: 28, fontWeight: 600 }}>120</div>
          </Card>
        </Col>

        <Col span={8}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
            }}
          >
            <div style={{ color: "#6b7280", marginBottom: 8 }}>
              Doanh thu
            </div>
            <div style={{ fontSize: 28, fontWeight: 600 }}>50tr</div>
          </Card>
        </Col>

        <Col span={8}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
            }}
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
