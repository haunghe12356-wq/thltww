import { getAdminBrands } from "./brandService";
import { getAdminCategories } from "./categoryService";

export async function getAdminReferenceData(token: string) {
  const [categoriesResponse, brandsResponse] = await Promise.all([
    getAdminCategories(token, { per_page: 100 }),
    getAdminBrands(token, { per_page: 100 }),
  ]);

  return {
    categories: categoriesResponse.data.data,
    brands: brandsResponse.data.data,
  };
}
