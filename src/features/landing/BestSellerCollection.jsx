import ProductCard from "../../components/Product/ProductCard";
import reefer6 from "../../assets/images/reefer6.jpg";
import reefer7 from "../../assets/images/reefer7.jpg";
import reefer8 from "../../assets/images/reefer8.jpg";
import reefer5 from "../../assets/images/reefer5.jpg";

const bestSellers = [
  {
    id: 1,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 365.00,
    image: reefer6,
    badge: "Bestseller"
  },
  {
    id: 2,
    name: "THE PRAYER",
    type: "Shirt",
    price: 365.00,
    image: reefer7,
    badge: "Bestseller"
  },
  {
    id: 3,
    name: "PROFESSOR",
    type: "Shirt",
    price: 307.12,
    image: reefer8,
    badge: "Bestseller"
  },
  {
    id: 4,
    name: "HIGH TOP",
    type: "Shirt",
    price: 307.12,
    image: reefer5,
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
