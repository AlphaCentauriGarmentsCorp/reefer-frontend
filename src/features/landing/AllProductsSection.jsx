import ProductCard from "../../components/Product/ProductCard";
import reefer6 from "../../assets/images/reefer6.jpg";

const allProducts = [
  {
    id: 1,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 365.00,
    image: reefer6,
    badge: null
  },
  {
    id: 2,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 365.00,
    image: reefer6,
    badge: null
  },
  {
    id: 3,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 365.00,
    image: reefer6,
    badge: null
  },
  {
    id: 4,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 365.00,
    image: reefer6,
    badge: null
  },
  {
    id: 5,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 365.00,
    image: reefer6,
    badge: null
  },
  {
    id: 6,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 365.00,
    image: reefer6,
    badge: null
  },
  {
    id: 7,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 365.00,
    image: reefer6,
    badge: null
  },
  {
    id: 8,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 365.00,
    image: reefer6,
    badge: null
  },
  {
    id: 9,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 365.00,
    image: reefer6,
    badge: null
  },
  {
    id: 10,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 365.00,
    image: reefer6,
    badge: null
  },
  {
    id: 11,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 365.00,
    image: reefer6,
    badge: null
  },
  {
    id: 12,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 365.00,
    image: reefer6,
    badge: null
  }
];

export default function AllProductsSection() {
  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-5xl font-bold text-center mb-16 tracking-tight">
          All Products
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {allProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* Load More Button */}
        <div className="text-center mb-8">
          <button className="bg-black text-white px-8 py-3 font-semibold hover:bg-gray-800 transition">
            Load More
          </button>
        </div>

        {/* Shop All Collections Button */}
        <div className="text-center">
          <button className="border-2 border-gray-300 text-gray-700 px-8 py-3 font-semibold hover:border-gray-500 hover:text-gray-900 transition flex items-center mx-auto">
            SHOP ALL Collections
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}