import { useState, useEffect } from 'react';
import { Form, Input, Button, message, Card, Select, DatePicker, InputNumber, Space, Divider, Spin, Empty } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { getGuide, updateGuide } from '../../../services/api';
import type { IGuide, IGuideUpdateRequest } from '../../../types/guide.types';
import dayjs from 'dayjs';

const GuideEdit = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    if (id) {
      fetchGuide();
    }
  }, [id]);

  const fetchGuide = async () => {
    try {
      setFetching(true);
      const response = await getGuide(id!);
      const guide = response.data.guide;

      form.setFieldsValue({
        name: guide.name,
        birtdate: dayjs(guide.birtdate),
        phone: guide.phone,
        email: guide.email,
        address: guide.address,
        identityCard: guide.identityCard,
        avatar: guide.avatar,
        experience_years: guide.experience.years,
        experience_specialization: guide.experience.specialization,
        experience_description: guide.experience.description,
        languages: guide.languages,
        certificate: guide.certificate.map((cert) => ({
          ...cert,
          issueDate: dayjs(cert.issueDate),
          expiryDate: cert.expiryDate ? dayjs(cert.expiryDate) : null,
        })),
        group_type: guide.group_type,
        health_status: guide.health_status,
      });
    } catch (error) {
      message.error('Lỗi khi tải thông tin HDV');
      console.error(error);
      navigate('/admin/guides');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      // Convert certificate dates to string format
      const certificateData = (values.certificate || []).map((cert: any) => ({
        name: cert.name,
        issueDate: cert.issueDate?.format ? cert.issueDate.format('YYYY-MM-DD') : cert.issueDate,
        expiryDate: cert.expiryDate?.format ? cert.expiryDate.format('YYYY-MM-DD') : cert.expiryDate,
        documentUrl: cert.documentUrl,
      }));

      const payload: IGuideUpdateRequest = {
        name: values.name,
        birtdate: values.birtdate.format('YYYY-MM-DD'),
        phone: values.phone,
        email: values.email,
        address: values.address,
        identityCard: values.identityCard,
        avatar: values.avatar,
        experience: {
          years: values.experience_years,
          specialization: values.experience_specialization,
          description: values.experience_description,
        },
        languages: values.languages,
        certificate: certificateData,
        group_type: values.group_type,
        health_status: values.health_status,
      };

      await updateGuide(id!, payload);
      message.success('Cập nhật HDV thành công');
      navigate('/admin/guides');
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Lỗi khi cập nhật HDV');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: 50 }} />;
  }

  return (
    <div>
      <h1>Chỉnh sửa Hướng dẫn viên</h1>

      <Card style={{ marginTop: 24 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          {/* Thông tin cơ bản */}
          <div style={{ marginBottom: 24 }}>
            <h2>Thông tin cơ bản</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              <Form.Item
                label="Họ tên"
                name="name"
                rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
              >
                <Input placeholder="Nhập họ tên" />
              </Form.Item>

              <Form.Item
                label="Ngày sinh"
                name="birtdate"
                rules={[{ required: true, message: 'Vui lòng chọn ngày sinh' }]}
              >
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>

              <Form.Item
                label="Số điện thoại"
                name="phone"
                rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }]}
              >
                <Input placeholder="Nhập số điện thoại" />
              </Form.Item>

              <Form.Item label="Email" name="email">
                <Input type="email" placeholder="Nhập email" />
              </Form.Item>

              <Form.Item label="CCCD/CMND" name="identityCard">
                <Input placeholder="Nhập CCCD/CMND" />
              </Form.Item>

              <Form.Item label="Địa chỉ" name="address">
                <Input placeholder="Nhập địa chỉ" />
              </Form.Item>

              <Form.Item label="Ảnh đại diện" name="avatar">
                <Input placeholder="Nhập URL ảnh" />
              </Form.Item>
            </div>
          </div>

          <Divider />

          {/* Thông tin chuyên môn */}
          <div style={{ marginBottom: 24 }}>
            <h2>Thông tin chuyên môn</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              <Form.Item
                label="Kinh nghiệm (năm)"
                name="experience_years"
                rules={[{ required: true, message: 'Vui lòng nhập số năm kinh nghiệm' }]}
              >
                <InputNumber min={0} placeholder="Nhập số năm" style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item label="Chuyên ngành" name="experience_specialization">
                <Input placeholder="VD: Lịch sử Việt Nam, Du lịch sinh thái..." />
              </Form.Item>

              <Form.Item label="Mô tả kinh nghiệm" name="experience_description">
                <Input.TextArea placeholder="Nhập mô tả chi tiết" rows={3} />
              </Form.Item>

              <Form.Item
                label="Ngôn ngữ"
                name="languages"
                rules={[{ required: true, message: 'Vui lòng chọn ít nhất một ngôn ngữ' }]}
              >
                <Select
                  mode="multiple"
                  placeholder="Chọn ngôn ngữ"
                  options={[
                    { label: 'Tiếng Việt', value: 'Vietnamese' },
                    { label: 'Tiếng Anh', value: 'English' },
                    { label: 'Tiếng Pháp', value: 'French' },
                    { label: 'Tiếng Trung', value: 'Chinese' },
                    { label: 'Tiếng Nhật', value: 'Japanese' },
                    { label: 'Tiếng Hàn', value: 'Korean' },
                    { label: 'Tiếng Đức', value: 'German' },
                    { label: 'Tiếng Tây Ban Nha', value: 'Spanish' },
                    { label: 'Tiếng Nga', value: 'Russian' },
                    { label: 'Tiếng Ý', value: 'Italian' },
                    { label: 'Tiếng Thái', value: 'Thai' },
                  ]}
                />
              </Form.Item>
            </div>
          </div>

          <Divider />

          {/* Chứng chỉ chuyên môn */}
          <div style={{ marginBottom: 24 }}>
            <h2>Chứng chỉ chuyên môn</h2>
            <Form.List name="certificate">
              {(fields, { add, remove }) => (
                <>
                  {fields.length === 0 ? (
                    <Empty description="Chưa thêm chứng chỉ nào" style={{ marginBottom: 16 }} />
                  ) : null}
                  {fields.map((field, index) => (
                    <Card
                      key={field.key}
                      size="small"
                      title={`Chứng chỉ ${index + 1}`}
                      extra={
                        <MinusCircleOutlined
                          onClick={() => remove(field.name)}
                          style={{ color: 'red', cursor: 'pointer' }}
                        />
                      }
                      style={{ marginBottom: 16 }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                        <Form.Item
                          label="Tên chứng chỉ"
                          name={[field.name, 'name']}
                          rules={[{ required: true }]}
                        >
                          <Input placeholder="VD: Chứng chỉ HDV du lịch" />
                        </Form.Item>

                        <Form.Item
                          label="Ngày cấp"
                          name={[field.name, 'issueDate']}
                          rules={[{ required: true }]}
                        >
                          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                        </Form.Item>

                        <Form.Item
                          label="Ngày hết hạn"
                          name={[field.name, 'expiryDate']}
                        >
                          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                        </Form.Item>

                        <Form.Item
                          label="URL tài liệu"
                          name={[field.name, 'documentUrl']}
                        >
                          <Input placeholder="Nhập URL tài liệu" />
                        </Form.Item>
                      </div>
                    </Card>
                  ))}
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    Thêm chứng chỉ
                  </Button>
                </>
              )}
            </Form.List>
          </div>

          <Divider />

          {/* Phân loại và tình trạng */}
          <div style={{ marginBottom: 24 }}>
            <h2>Phân loại và tình trạng</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              <Form.Item
                label="Loại hướng dẫn viên"
                name="group_type"
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    { label: 'Nội địa', value: 'domestic' },
                    { label: 'Quốc tế', value: 'international' },
                    { label: 'Chuyên tuyến', value: 'specialized_line' },
                    { label: 'Chuyên khách đoàn', value: 'group_specialist' },
                  ]}
                />
              </Form.Item>

              <Form.Item
                label="Tình trạng sức khoẻ"
                name="health_status"
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    { label: 'Bình thường', value: 'healthy' },
                    { label: 'Bệnh', value: 'sick' },
                    { label: 'Nghỉ phép', value: 'on_leave' },
                    { label: 'Đã nghỉ hưu', value: 'retired' },
                  ]}
                />
              </Form.Item>
            </div>
          </div>

          <Divider />

          {/* Button */}
          <Space>
            <Button type="primary" htmlType="submit" size="large" loading={loading}>
              Cập nhật
            </Button>
            <Button size="large" onClick={() => navigate('/admin/guides')}>
              Hủy
            </Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
};

export default GuideEdit;
