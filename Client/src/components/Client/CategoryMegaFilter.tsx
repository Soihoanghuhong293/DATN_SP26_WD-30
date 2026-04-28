import React, { useMemo, useState } from 'react';
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

  const roots = useMemo(() => (Array.isArray(tree) ? tree : []).filter((n) => getCategoryId(n)), [tree]);

  const index = useMemo(() => buildCategoryIndex(roots), [roots]);

  const normalize = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

  const domesticRoot = useMemo(() => {
    const byName = roots.find((r) => normalize(r.name).includes('trong nuoc'));
    return byName || roots[0];
  }, [roots]);

  const findChildByName = (parent: ICategory | undefined, name: string) => {
    const children = Array.isArray(parent?.children) ? (parent!.children as ICategory[]) : [];
    const target = normalize(name);
    return children.find((c) => normalize(c.name) === target) || null;
  };

  const findDescendantByName = (root: ICategory | undefined, name: string) => {
    const target = normalize(name);
    const stack: ICategory[] = Array.isArray(root?.children) ? [...(root!.children as ICategory[])] : [];
    while (stack.length) {
      const cur = stack.shift()!;
      if (normalize(cur.name) === target) {
        return cur;
      }
      const children = Array.isArray(cur.children) ? (cur.children as ICategory[]) : [];
      if (children.length) stack.push(...children);
    }
    return null;
  };

  const regionColumns = useMemo(() => {
    const primary = domesticRoot;
    const mienBac = findChildByName(primary, 'Miền Bắc') ?? findDescendantByName(primary, 'Miền Bắc');
    const mienTrung = findChildByName(primary, 'Miền Trung') ?? findDescendantByName(primary, 'Miền Trung');
    const mienNam = findChildByName(primary, 'Miền Nam') ?? findDescendantByName(primary, 'Miền Nam');

    const fallbackRoot = primary;
    const mkPlace = (region: ICategory | null, placeName: string) => {
      const inRegion = region ? findDescendantByName(region, placeName) : null;
      const inDomestic = findDescendantByName(fallbackRoot, placeName);
      const picked = inRegion || inDomestic;
      const id = picked ? getCategoryId(picked) : null;
      return { name: placeName, id };
    };

    return [
      {
        title: 'MIỀN BẮC',
        regionId: mienBac ? getCategoryId(mienBac) : null,
        places: [
          mkPlace(mienBac, 'Hà Nội'),
          mkPlace(mienBac, 'Hạ Long'),
          mkPlace(mienBac, 'Sapa'),
          mkPlace(mienBac, 'Ninh Bình'),
          mkPlace(mienBac, 'Hà Giang'),
        ],
      },
      {
        title: 'MIỀN TRUNG',
        regionId: mienTrung ? getCategoryId(mienTrung) : null,
        places: [
          mkPlace(mienTrung, 'Đà Nẵng'),
          mkPlace(mienTrung, 'Hội An'),
          mkPlace(mienTrung, 'Huế'),
          mkPlace(mienTrung, 'Quy Nhơn'),
          mkPlace(mienTrung, 'Nha Trang'),
        ],
      },
      {
        title: 'MIỀN NAM',
        regionId: mienNam ? getCategoryId(mienNam) : null,
        places: [
          mkPlace(mienNam, 'TP. Hồ Chí Minh'),
          mkPlace(mienNam, 'Phú Quốc'),
          mkPlace(mienNam, 'Vũng Tàu'),
          mkPlace(mienNam, 'Cần Thơ'),
          mkPlace(mienNam, 'Côn Đảo'),
        ],
      },
    ];
  }, [domesticRoot]);

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
        <span className="category-mega-title">Trong nước</span>
        <button type="button" className="category-mega-close" aria-label="Đóng" onClick={() => setOpen(false)}>
          ×
        </button>
      </div>
      <div className="category-mega-body">
        <div className="category-mega-grid category-mega-grid--fixed-3">
          {regionColumns.map((col) => (
            <div key={col.title} className="category-mega-col">
              <div className="category-mega-col-head">{col.title}</div>
              <ul className="category-mega-list">
                {col.places.map((p) => (
                  <li key={p.name}>
                    <button
                      type="button"
                      className="category-mega-link"
                      disabled={!p.id}
                      onClick={() => (p.id ? selectAndClose(p.id) : undefined)}
                      title={!p.id ? 'Chưa có danh mục tương ứng' : p.name}
                    >
                      {p.name}
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="category-mega-viewall"
                disabled={!col.regionId}
                onClick={() => (col.regionId ? selectAndClose(col.regionId) : undefined)}
                title={!col.regionId ? 'Chưa có danh mục tương ứng' : 'Xem tất cả'}
              >
                Xem tất cả →
              </button>
            </div>
          ))}
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
