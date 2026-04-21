import ProductCard from "../../components/Product/ProductCard";

const collections = [
  {
    id: 5,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 365.00,
    image: "https://via.placeholder.com/400x400/1a1a1a/ffffff?text=LIFE+TO+BE",
    badge: "Bestseller"
  },
  {
    id: 6,
    name: "Wilderness Cream",
    type: "Boxy type Hoodie",
    price: 825,
    image: "https://via.placeholder.com/400x400/d4c5a0/333333?text=Wilderness+Cream",
    badge: "Bestseller"
  },
  {
    id: 7,
    name: "KALI (SUBLI)",
    type: "Short",
    price: 255,
    image: "https://via.placeholder.com/400x400/ff6b9d/ffffff?text=KALI+SUBLI",
    badge: "Bestseller"
  },
  {
    id: 8,
    name: "VERDANT MOSS - HOBO",
    type: "Shoulder bag",
    price: 199,
    image: "https://via.placeholder.com/400x400/8b9474/ffffff?text=VERDANT+MOSS",
    badge: "Bestseller"
  }
];

export default function ProductCollections() {
  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-5xl font-bold text-center mb-16 tracking-tight">
          Product Collections
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {collections.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
