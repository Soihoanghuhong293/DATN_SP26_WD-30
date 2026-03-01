import React, { useState, useEffect } from 'react';
import { Spin, Empty, Pagination, Select, Input, Button } from 'antd';
import { SearchOutlined, FilterOutlined } from '@ant-design/icons';
import { getTours } from '../services/api';
import { ITour } from '../types/tour.types';
import TourCard from '../components/Client/TourCard';
import './styles/ToursPage.css';

const ToursPage = () => {
  const [tours, setTours] = useState<ITour[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch tours
  useEffect(() => {
    const fetchTours = async () => {
      try {
        setLoading(true);
        const data = await getTours({
          page: currentPage,
          limit: pageSize,
          status: statusFilter || undefined,
          search: debouncedSearch || undefined,
        });
        
        // Handle the response structure
        if (data.data && Array.isArray(data.data)) {
          // If data.data is an array (tours list)
          setTours(data.data);
        } else if (data.data && typeof data.data === 'object' && 'tours' in data.data) {
          // If data.data has tours property
          setTours(Array.isArray(data.data.tours) ? data.data.tours : []);
        } else {
          setTours([]);
        }
        
        setTotal(data.total || data.results || 0);
      } catch (error) {
        console.error('Error fetching tours:', error);
        setTours([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTours();
  }, [currentPage, pageSize, statusFilter, debouncedSearch]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setCurrentPage(1);
  };

  return (
    <div className="tours-page">
      <div className="tours-page-header">
        <h1 className="tours-page-title">Khám Phá Tours</h1>
        <p className="tours-page-subtitle">Tìm kiếm những chuyến du lịch tuyệt vời nhất</p>
      </div>

      <div className="tours-filter-section">
        <div className="tours-filter-container">
          <div className="filter-group">
            <label className="filter-label">
              <SearchOutlined /> Tìm kiếm
            </label>
            <Input
              placeholder="Nhập tên tour, địa điểm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">
              <FilterOutlined /> Trạng thái
            </label>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              className="filter-select"
              options={[
                { label: 'Tất cả', value: '' },
                { label: 'Đang hoạt động', value: 'active' },
                { label: 'Nháp', value: 'draft' },
                { label: 'Inactive', value: 'inactive' },
              ]}
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">Số lượng</label>
            <Select
              value={pageSize}
              onChange={setPageSize}
              className="filter-select"
              options={[
                { label: '6 tours', value: 6 },
                { label: '12 tours', value: 12 },
                { label: '24 tours', value: 24 },
              ]}
            />
          </div>

          <Button
            type="text"
            className="filter-reset-btn"
            onClick={handleResetFilters}
          >
            Đặt lại
          </Button>
        </div>
      </div>

      <Spin spinning={loading} tip="Đang tải..." size="large">
        {tours.length === 0 && !loading ? (
          <Empty
            description="Không có tours nào"
            style={{ marginTop: '50px' }}
          />
        ) : (
          <>
            <div className="tours-grid">
              {tours.map((tour) => (
                <TourCard key={tour.id} tour={tour} />
              ))}
            </div>

            {total > 0 && (
              <div className="tours-pagination-container">
                <Pagination
                  current={currentPage}
                  pageSize={pageSize}
                  total={total}
                  onChange={setCurrentPage}
                  onShowSizeChange={(page, size) => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}
                  showSizeChanger
                  showTotal={(total) => `Tổng cộng ${total} tours`}
                  className="tours-pagination"
                />
              </div>
            )}
          </>
        )}
      </Spin>
    </div>
  );
};

export default ToursPage;
