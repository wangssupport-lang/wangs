export function getBrandsFromProducts(...collections) {
  const brands = new Map();

  collections
    .flatMap((collection) => {
      if (Array.isArray(collection)) return collection;
      return collection?.results || [];
    })
    .forEach((product) => {
      const manufacturer = product.manufacturer;
      if (!manufacturer?.business_name) return;

      const name = manufacturer.business_name;
      const existingBrand = brands.get(name);
      brands.set(name, {
        name,
        location: manufacturer.location_district || '',
        imageUrl: existingBrand?.imageUrl || product.primary_image_url || '',
      });
    });

  return [...brands.values()].sort((a, b) => a.name.localeCompare(b.name));
}
