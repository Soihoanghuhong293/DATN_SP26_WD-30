import React, { useEffect, useMemo, useState } from 'react';
import { Popover, Button, Spin } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import type { ICategory } from '../../types/tour.types';
import { buildCategoryIndex, getCategoryId } from '../../utils/categoryTree';
import './CategoryMegaFilter.css';

type Props = {
  tree: ICategory[];
  loading?: boolean;
  value: string | null;
  onChange: (categoryId: string | null) => void;
};

const CategoryMegaFilter: React.FC<Props> = ({ tree, loading, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [primaryId, setPrimaryId] = useState<string | null>(null);

  const roots = useMemo(() => (Array.isArray(tree) ? tree : []).filter((n) => getCategoryId(n)), [tree]);

  const index = useMemo(() => buildCategoryIndex(roots), [roots]);

  useEffect(() => {
    if (!roots.length) {
      setPrimaryId(null);
      return;
    }
    setPrimaryId((prev) => {
      if (prev && roots.some((r) => getCategoryId(r) === prev)) return prev;
      return getCategoryId(roots[0]);
    });
  }, [roots]);

  const selectedPrimary = useMemo(
    () => roots.find((r) => getCategoryId(r) === primaryId) || roots[0],
    [roots, primaryId]
  );

  const columns = useMemo(() => {
    const children = selectedPrimary?.children;
    return Array.isArray(children) ? children.filter((c) => getCategoryId(c)) : [];
  }, [selectedPrimary]);

  const selectAndClose = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  /** Chuỗi từ gốc ảo "Điểm đến" (id null = xoá lọc) tới danh mục đang chọn. */
  const breadcrumbChain = useMemo(() => {
    if (!value || !index.byId.has(value)) return [];
    const chain: { id: string | null; name: string }[] = [];
    let cur: string | null = value;
    while (cur) {
      const cat = index.byId.get(cur);
      if (!cat) break;
      chain.unshift({ id: cur, name: cat.name });
      cur = index.parentById.get(cur) ?? null;
    }
    return [{ id: null, name: 'Điểm đến' }, ...chain];
  }, [value, index]);

  if (loading) {
    return (
      <div className="category-mega-filter-trigger-wrap">
        <Spin size="small" />
      </div>
    );
  }

  if (!roots.length) {
    return null;
  }

  const content = (
    <div className="category-mega">
      <div className="category-mega-head">
        <span className="category-mega-title">Chọn điểm đến</span>
        <button type="button" className="category-mega-close" aria-label="Đóng" onClick={() => setOpen(false)}>
          ×
        </button>
      </div>
      <div className="category-mega-body">
        <aside className="category-mega-sidebar">
          {roots.map((r) => {
            const id = getCategoryId(r);
            const active = id === getCategoryId(selectedPrimary);
            return (
              <button
                key={id}
                type="button"
                className={`category-mega-sidebar-item ${active ? 'active' : ''}`}
                onClick={() => setPrimaryId(id)}
              >
                {r.name}
              </button>
            );
          })}
        </aside>
        <div className="category-mega-grid">
          {columns.length === 0 ? (
            <p className="category-mega-empty">Chưa có danh mục con cho nhóm này.</p>
          ) : (
            columns.map((col) => {
              const colId = getCategoryId(col);
              const tertiary = Array.isArray(col.children) ? col.children.filter((c) => getCategoryId(c)) : [];
              return (
                <div key={colId} className="category-mega-col">
                  <div className="category-mega-col-head">{col.name}</div>
                  <ul className="category-mega-list">
                    {tertiary.length === 0 ? (
                      <li>
                        <button type="button" className="category-mega-link" onClick={() => selectAndClose(colId)}>
                          {col.name}
                        </button>
                      </li>
                    ) : (
                      tertiary.map((item) => {
                        const tid = getCategoryId(item);
                        return (
                          <li key={tid}>
                            <button type="button" className="category-mega-link" onClick={() => selectAndClose(tid)}>
                              {item.name}
                            </button>
                          </li>
                        );
                      })
                    )}
                  </ul>
                  <button type="button" className="category-mega-viewall" onClick={() => selectAndClose(colId)}>
                    Xem tất cả →
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  const triggerLabel = value ? 'Chọn lại điểm đến' : 'Điểm đến';

  return (
    <div className="category-mega-filter-wrap">
      <div className="category-mega-toolbar">
        {breadcrumbChain.length > 0 ? (
          <nav className="category-mega-breadcrumb-outside" aria-label="Lọc theo điểm đến">
            {breadcrumbChain.map((item, i) => {
              const isActive = i === breadcrumbChain.length - 1;
              return (
                <React.Fragment key={item.id ?? 'root'}>
                  {i > 0 ? (
                    <span className="category-mega-breadcrumb-sep-out" aria-hidden>
                      {' / '}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    className={`category-mega-crumb-btn${isActive ? ' category-mega-crumb-btn--active' : ''}`}
                    aria-current={isActive ? 'location' : undefined}
                    onClick={() => onChange(item.id)}
                  >
                    {item.name}
                  </button>
                </React.Fragment>
              );
            })}
          </nav>
        ) : null}
        <Popover
          open={open}
          onOpenChange={setOpen}
          placement="bottomLeft"
          trigger="click"
          arrow={false}
          overlayClassName="category-mega-popover"
          content={content}
        >
          <Button
            className={value ? 'category-mega-trigger category-mega-trigger--compact' : 'category-mega-trigger'}
            aria-label={triggerLabel}
            title={triggerLabel}
          >
            {!value ? (
              <>
                <span>Điểm đến</span>
                <DownOutlined className="category-mega-chevron" />
              </>
            ) : (
              <DownOutlined className="category-mega-chevron" />
            )}
          </Button>
        </Popover>
      </div>
    </div>
  );
};

export default CategoryMegaFilter;