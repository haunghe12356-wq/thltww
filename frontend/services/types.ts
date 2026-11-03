export type ApiResource<T> = T | { data: T };
export type ApiCollection<T> = T[] | { data?: T[] };

export type PaginationMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: PaginationMeta;
};

export type PaginationParams = {
  page?: number;
  per_page?: number;
  trashed?: number;
  brand_id?: number;
  category_id?: number;
  min_price?: number;
  max_price?: number;
  min_rating?: number;
  search?: string;
};
