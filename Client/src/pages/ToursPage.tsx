import React, { useState, useEffect } from 'react';
import { Spin, Empty, Pagination, Select, Input, Button, DatePicker } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
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
  const [budgetFilter, setBudgetFilter] = useState<string>(''); // dưới 5tr, 5-10tr...
  const [departureDate, setDepartureDate] = useState<string>('');

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
          ...mapBudgetToPriceRange(budgetFilter),
          departureDate: departureDate || undefined,
        });
        
        // Server returns `data` as an array of tours
        setTours(Array.isArray(data.data) ? data.data : []);
        
        setTotal(data.total || data.results || 0);
      } catch (error) {
        console.error('Error fetching tours:', error);
        setTours([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTours();
  }, [currentPage, pageSize, statusFilter, debouncedSearch, budgetFilter, departureDate]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setBudgetFilter('');
    setDepartureDate('');
    setCurrentPage(1);
  };

  const handleApplyFilters = () => {
    // Các filter đã tự động áp dụng qua useEffect; chỉ đảm bảo đang ở trang 1
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  };

  const mapBudgetToPriceRange = (budget: string) => {
    switch (budget) {
      case 'under-5':
        return { minPrice: 0, maxPrice: 5000000 };
      case '5-10':
        return { minPrice: 5000000, maxPrice: 10000000 };
      case '10-20':
        return { minPrice: 10000000, maxPrice: 20000000 };
      case 'over-20':
        return { minPrice: 20000000 };
      default:
        return {};
    }
  };

  return (
    <div className="tours-page">
      <div className="tours-page-header">
        <h1 className="tours-page-title">Khám Phá Tours</h1>
        <p className="tours-page-subtitle">Tìm kiếm những chuyến du lịch tuyệt vời nhất</p>
      </div>

      <div className="tours-layout">
        <div className="tours-sidebar">
          <div className="tours-sidebar-card">
            <h3 className="sidebar-title">Bộ lọc tìm kiếm</h3>

            <div className="sidebar-section">
              <div className="sidebar-section-label">Ngân sách</div>
              <div className="budget-buttons">
                <button
                  className={`budget-btn ${budgetFilter === 'under-5' ? 'active' : ''}`}
                  onClick={() => setBudgetFilter(budgetFilter === 'under-5' ? '' : 'under-5')}
                >
                  Dưới 5 triệu
                </button>
                <button
                  className={`budget-btn ${budgetFilter === '5-10' ? 'active' : ''}`}
                  onClick={() => setBudgetFilter(budgetFilter === '5-10' ? '' : '5-10')}
                >
                  Từ 5 - 10 triệu
                </button>
                <button
                  className={`budget-btn ${budgetFilter === '10-20' ? 'active' : ''}`}
                  onClick={() => setBudgetFilter(budgetFilter === '10-20' ? '' : '10-20')}
                >
                  Từ 10 - 20 triệu
                </button>
                <button
                  className={`budget-btn ${budgetFilter === 'over-20' ? 'active' : ''}`}
                  onClick={() => setBudgetFilter(budgetFilter === 'over-20' ? '' : 'over-20')}
                >
                  Trên 20 triệu
                </button>
              </div>
            </div>

            <div className="sidebar-section">
              <div className="sidebar-section-label">Ngày đi</div>
              <DatePicker
                style={{ width: '100%' }}
                placeholder="Chọn ngày khởi hành"
                value={departureDate ? dayjs(departureDate) : null}
                onChange={(date: Dayjs | null) => {
                  if (!date) {
                    setDepartureDate('');
                    return;
                  }
                  setDepartureDate(date.format('YYYY-MM-DD'));
                }}
              />
            </div>

            <Button
              type="primary"
              className="sidebar-apply-btn"
              onClick={handleApplyFilters}
            >
              Áp dụng
            </Button>

            <Button
              type="text"
              className="sidebar-reset-link"
              onClick={handleResetFilters}
            >
              Xóa tất cả
            </Button>
          </div>
        </div>

        <div className="tours-main">
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
                        // Reference `page` to avoid TS unused warning.
                        void page;
                        setPageSize(size);
                        setCurrentPage(1);
                      }}
                      showSizeChanger
                      showTotal={(t) => `Tổng cộng ${t} tours`}
                      className="tours-pagination"
                    />
                  </div>
                )}
              </>
            )}
          </Spin>
        </div>
      </div>
    </div>
  );
};

export default ToursPage;
