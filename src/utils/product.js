// Maps the Laravel ProductResource onto the fields the mockup's product cards use.
export function toDropCard(p, i = 0) {
  return {
    slug: p.slug,
    name: p.name,
    priceFmt: p.price_formatted,
    price: p.price,
    blurb: p.blurb,
    tag: p.tag || "",
    num: String(i + 1).padStart(2, "0"),
    typeLabel: (p.type || "").toUpperCase(),
    audience: p.audience,
    type: p.type,
    sizes: p.sizes || [],
    material: p.material,
    fit_name: p.fit_name,
    fit_desc: p.fit_desc,
    // Null for everything without photography yet, which is most of the catalogue —
    // the card falls back to the placeholder copy below when it is.
    image: p.image || null,
    placeholder: p.placeholder || `Drop the ${p.name} shot`,
  };
}
