import { Empty } from 'antd';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminListCard from '../../components/admin/AdminListCard';

export default function GuideReviewManagement() {
  return (
    <>
      <AdminPageHeader
        title="Quản lý đánh giá"
        subtitle="Xem và quản lý đánh giá của khách hàng về hướng dẫn viên."
      />
      <AdminListCard>
        <Empty description="Trang đang được chuẩn bị. Bạn có thể mô tả tiếp các yêu cầu chi tiết." />
      </AdminListCard>
    </>
  );
}
