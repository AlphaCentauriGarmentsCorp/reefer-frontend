import ProductCard from "../../components/Product/ProductCard";

const bestSellers = [
  {
    id: 1,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 365.00,
    image: "https://via.placeholder.com/400x400/1a1a1a/ffffff?text=LIFE+TO+BE",
    badge: "Bestseller"
  },
  {
    id: 2,
    name: "THE PRAYER",
    type: "Shirt",
    price: 365.00,
    image: "https://via.placeholder.com/400x400/2a2a2a/ffffff?text=THE+PRAYER",
    badge: "Bestseller"
  },
  {
    id: 3,
    name: "PROFESSOR",
    type: "Shirt",
    price: 307.12,
    image: "https://via.placeholder.com/400x400/f5f5f5/666666?text=PROFESSOR",
    badge: "Bestseller"
  },
  {
    id: 4,
    name: "HIGH TOP",
    type: "Shirt",
    price: 307.12,
    image: "https://via.placeholder.com/400x400/e5e5e5/666666?text=HIGH+TOP",
    badge: "Bestseller"
  }
];

export default function BestSellerCollection() {
  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-5xl font-bold text-center mb-3 tracking-tight">
          Best Seller Collection
        </h2>
        <p className="text-center text-gray-400 text-sm tracking-widest mb-16">
          SHOP OUR BEST SELLER
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {bestSellers.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
