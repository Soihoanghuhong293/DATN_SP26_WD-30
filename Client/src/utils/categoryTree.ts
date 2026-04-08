import type { ICategory } from '../types/tour.types';

export type CategoryOption = {
  value: string;
  label: string;
  level: number;
  path: string;
};

export const getCategoryId = (c: Pick<ICategory, 'id' | '_id'>): string => String(c.id || c._id || '');

/** category_id có thể là string hoặc object sau khi populate từ API tour. */
export function getTourCategoryId(tour: { category_id?: unknown }): string | null {
  const raw: unknown = tour?.category_id;
  if (raw == null || raw === '') return null;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  if (typeof raw === 'object') {
    const o = raw as { id?: string; _id?: string };
    const id = String(o.id || o._id || '').trim();
    return id || null;
  }
  return null;
}

export function flattenCategoryTree(
  nodes: ICategory[],
  opts: { separator?: string; indentUnit?: string; includePath?: boolean } = {}
): CategoryOption[] {
  const { separator = ' > ', indentUnit = '— ', includePath = false } = opts;
  const out: CategoryOption[] = [];

  const walk = (items: ICategory[], level: number, parentPath: string) => {
    for (const n of items) {
      const value = getCategoryId(n);
      if (!value) continue;

      const path = parentPath ? `${parentPath}${separator}${n.name}` : n.name;
      const prefix = level > 0 ? indentUnit.repeat(level) : '';
      const label = includePath ? path : `${prefix}${n.name}`;
      out.push({ value, label, level, path });

      const children = Array.isArray(n.children) ? n.children : [];
      if (children.length) walk(children, level + 1, path);
    }
  };

  walk(nodes, 0, '');
  return out;
}

export function buildCategoryIndex(tree: ICategory[]) {
  const byId = new Map<string, ICategory>();
  const parentById = new Map<string, string | null>();
  const levelById = new Map<string, number>();
  const pathById = new Map<string, string>();

  const walk = (nodes: ICategory[], parentId: string | null, level: number, parentPath: string) => {
    for (const n of nodes) {
      const id = getCategoryId(n);
      if (!id) continue;
      byId.set(id, n);
      parentById.set(id, parentId);
      levelById.set(id, level);
      const path = parentPath ? `${parentPath} > ${n.name}` : n.name;
      pathById.set(id, path);
      const children = Array.isArray(n.children) ? n.children : [];
      if (children.length) walk(children, id, level + 1, path);
    }
  };

  walk(tree, null, 0, '');
  return { byId, parentById, levelById, pathById };
}

export function collectDescendantIds(tree: ICategory[], rootId: string): Set<string> {
  const ids = new Set<string>();

  const walk = (nodes: ICategory[]) => {
    for (const n of nodes) {
      const id = getCategoryId(n);
      if (!id) continue;
      if (ids.has(id)) continue;
      ids.add(id);
      const children = Array.isArray(n.children) ? n.children : [];
      if (children.length) walk(children);
    }
  };

  const findAndCollect = (nodes: ICategory[]) => {
    for (const n of nodes) {
      const id = getCategoryId(n);
      if (id === rootId) {
        walk([n]);
        return true;
      }
      const children = Array.isArray(n.children) ? n.children : [];
      if (children.length && findAndCollect(children)) return true;
    }
    return false;
  };

  findAndCollect(tree);
  return ids;
}

