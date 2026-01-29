import { Card, Row, Col, Statistic } from "antd";

const Dashboard = () => {
  return (
    <>
      <h2 style={{ marginBottom: 24 }}>Tốnadg quan hệ thống</h2>

      <Row gutter={24}>
        <Col span={8}>
          <Card>
            <Statistic title="Tổng Booking" value={120} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="Doanh thu" value={50} suffix="tr" />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="Khách mới" value={15} />
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default Dashboard;
