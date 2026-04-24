import { Alert, Typography } from 'antd';
import AdminListCard from '../../components/admin/AdminListCard';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

const { Paragraph } = Typography;

export default function BookingCancelledList() {
  return (
    <div>
      <AdminPageHeader
        title="Quản lý tour hủy"
        subtitle="Danh sách các đơn/tour đã bị hủy (đang tạo khung, chưa có nghiệp vụ)."
        breadcrumbItems={[
          { title: 'Admin', href: '/admin/dashboard' },
          { title: 'Quản lý đặt chỗ', href: '/admin/bookings' },
          { title: 'Quản lý tour hủy' },
        ]}
      />

      <AdminListCard>
        <Alert
          type="info"
          showIcon
          message="Chưa triển khai"
          description={
            <Paragraph style={{ marginBottom: 0 }}>
              Phần “Tour hủy” mới tạo route + menu. Khi bạn bảo mình làm tiếp, mình sẽ thêm filter danh sách theo trạng thái
              <b> cancelled</b> và các thao tác liên quan.
            </Paragraph>
          }
        />
      </AdminListCard>
    </div>
  );
}

