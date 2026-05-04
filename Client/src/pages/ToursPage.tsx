import React, { useState, useEffect } from 'react';
import { Spin, Empty, Pagination, Select, Input, Button, DatePicker } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { SearchOutlined } from '@ant-design/icons';
import { getTours, getCategoryTree } from '../services/api';
import type { ICategory, ITour } from '../types/tour.types';
import TourCard from '../components/Client/TourCard';
import CategoryMegaFilter from '../components/Client/CategoryMegaFilter';
import { collectDescendantIds, getTourCategoryId } from '../utils/categoryTree';
import { groupTourInstances } from '../utils/groupTourInstances';
import './styles/ToursPage.css';

const ToursPage = () => {
  const [tours, setTours] = useState<ITour[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [budgetFilter, setBudgetFilter] = useState<string>(''); // dưới 5tr, 5-10tr...
  const [departureDate, setDepartureDate] = useState<string>('');
  const [categoryTree, setCategoryTree] = useState<ICategory[]>([]);
  const [categoryTreeLoading, setCategoryTreeLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadTree = async () => {
      try {
        setCategoryTreeLoading(true);
        const res = await getCategoryTree({ status: 'active' });
        const list = res.data?.categories;
        if (!cancelled) setCategoryTree(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error('Error loading categories:', e);
        if (!cancelled) setCategoryTree([]);
      } finally {
        if (!cancelled) setCategoryTreeLoading(false);
      }
    };
    loadTree();
    return () => {
      cancelled = true;
    };
  }, []);

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
          search: debouncedSearch || undefined,
          ...mapBudgetToPriceRange(budgetFilter),
          departureDate: departureDate || undefined,
        });
        
        const instances = Array.isArray(data.data) ? (data.data as ITour[]) : [];
        const grouped = groupTourInstances(instances);

        let filtered = grouped;
        if (categoryFilter && categoryTree.length) {
          const allowed = collectDescendantIds(categoryTree, categoryFilter);
          filtered = grouped.filter((t) => {
            const cid = getTourCategoryId(t);
            return !!cid && allowed.has(cid);
          });
        }

        setTotal(filtered.length);

        const startIdx = (currentPage - 1) * pageSize;
        const pageItems = filtered.slice(startIdx, startIdx + pageSize);
        setTours(pageItems);
      } catch (error) {
        console.error('Error fetching tours:', error);
        setTours([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTours();
  }, [currentPage, pageSize, debouncedSearch, budgetFilter, departureDate, categoryFilter, categoryTree]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setBudgetFilter('');
    setDepartureDate('');
    setCategoryFilter(null);
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
            <div className="filter-group filter-group-destination">
              <label className="filter-label">Điểm đến</label>
              <CategoryMegaFilter
                tree={categoryTree}
                loading={categoryTreeLoading}
                value={categoryFilter}
                onChange={(id) => {
                  setCategoryFilter(id);
                  setCurrentPage(1);
                }}
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