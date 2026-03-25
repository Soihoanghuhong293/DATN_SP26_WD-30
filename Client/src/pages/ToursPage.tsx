import React, { useState, useEffect } from 'react';
import { Spin, Empty, Pagination, Select, Input, Button, DatePicker } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { SearchOutlined } from '@ant-design/icons';
import { getTours } from '../services/api';
import { ITour } from '../types/tour.types';
import TourCard from '../components/Client/TourCard';
import './styles/ToursPage.css';

const normalizeGroupName = (name?: string) => {
  const n = String(name || '').trim();
  if (!n) return '';
  return n
    .replace(/\s*\(\s*\d{1,2}\/\d{1,2}\/\d{4}\s*\)\s*$/i, '')
    .replace(/\s*\(\s*copy\s*\)\s*$/i, '')
    .trim();
};

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
        // Tour instances được tách theo ngày khởi hành.
        // Ở trang khách hàng: gộp lại thành 1 sản phẩm tour, paginate phía client.
        const data = await getTours({
          page: 1,
          limit: 2000,
          status: statusFilter || undefined,
          search: debouncedSearch || undefined,
          ...mapBudgetToPriceRange(budgetFilter),
          departureDate: departureDate || undefined,
        });
        
        const instances = Array.isArray(data.data) ? (data.data as ITour[]) : [];

        // Group theo tên tour (tạo 1 card cho nhiều ngày khởi hành)
        const byName = new Map<string, ITour[]>();
        for (const t of instances) {
          const groupKey = normalizeGroupName(t.name);
          if (!groupKey) continue;
          const arr = byName.get(groupKey) || [];
          arr.push(t);
          byName.set(groupKey, arr);
        }

        const grouped: ITour[] = Array.from(byName.entries()).map(([groupKey, group]) => {
          // chọn instance có ngày khởi hành sớm nhất (nếu có) làm đại diện để link detail
          const sorted = [...group].sort((a: any, b: any) => {
            const aDate = String((a as any)?.departure_schedule?.[0]?.date || '').slice(0, 10);
            const bDate = String((b as any)?.departure_schedule?.[0]?.date || '').slice(0, 10);
            const av = aDate ? dayjs(aDate).valueOf() : Number.MAX_SAFE_INTEGER;
            const bv = bDate ? dayjs(bDate).valueOf() : Number.MAX_SAFE_INTEGER;
            return av - bv;
          });
          const rep = sorted[0] || group[0];
          // prefer ảnh nếu rep thiếu
          const anyWithImage = group.find((x) => Array.isArray(x.images) && x.images.length > 0);
          const images = (rep.images?.length ? rep.images : anyWithImage?.images) || [];

          return {
            ...rep,
            name: groupKey,
            images,
            // attach instance list for detail page (không dùng ở TourCard, nhưng hữu ích nếu cần)
            ...( { _instances: group } as any ),
          } as ITour;
        });

        // sort theo created_at mới nhất nếu có
        grouped.sort((a: any, b: any) => {
          const av = a.created_at ? dayjs(a.created_at).valueOf() : 0;
          const bv = b.created_at ? dayjs(b.created_at).valueOf() : 0;
          return bv - av;
        });

        setTotal(grouped.length);

        const startIdx = (currentPage - 1) * pageSize;
        const pageItems = grouped.slice(startIdx, startIdx + pageSize);
        setTours(pageItems);
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
      <div className="tours-page-header-accent" />

      <div className="tours-content">
        <div className="tours-filter-bar">
          <div className="tours-filter-row">
            <div className="filter-group">
              <label className="filter-label">Tìm kiếm</label>
              <Input
                placeholder="Nhập tên tour, địa điểm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                className="filter-input"
              />
            </div>
            <div className="filter-group">
              <label className="filter-label">Trạng thái</label>
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
                  { label: '6 tour', value: 6 },
                  { label: '12 tour', value: 12 },
                  { label: '24 tour', value: 24 },
                ]}
              />
            </div>
            <Button type="link" className="filter-reset-btn" onClick={handleResetFilters}>
              Đặt lại
            </Button>
          </div>

          <div className="tours-filter-row tours-filter-row-extra">
            <div className="filter-group filter-group-budget">
              <label className="filter-label">Ngân sách</label>
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
            <div className="filter-group filter-group-date">
              <label className="filter-label">Ngày đi</label>
              <DatePicker
                style={{ width: '100%', minWidth: 160 }}
                placeholder="Chọn ngày khởi hành"
                value={departureDate ? dayjs(departureDate) : null}
                onChange={(date: Dayjs | null) => {
                  if (!date) setDepartureDate('');
                  else setDepartureDate(date.format('YYYY-MM-DD'));
                }}
              />
            </div>
            <Button type="primary" className="filter-apply-btn" onClick={handleApplyFilters}>
              Áp dụng
            </Button>
          </div>
        </div>

        <div className="tours-main">
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