import { MainLayout } from "../Layouts";
import ProductCard from "../components/Product/ProductCard";
import reefer6 from "../assets/images/reefer6.jpg";

const saleProducts = [
  {
    id: 1,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 369.60,
    originalPrice: 650.00,
    image: reefer6,
    badge: "Sale"
  },
  {
    id: 2,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 369.60,
    originalPrice: 650.00,
    image: reefer6,
    badge: "Sale"
  },
  {
    id: 3,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 369.60,
    originalPrice: 650.00,
    image: reefer6,
    badge: ""
  },
  {
    id: 4,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 369.60,
    originalPrice: 650.00,
    image: reefer6,
    badge: ""
  },
  {
    id: 5,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 369.60,
    originalPrice: 650.00,
    image: reefer6,
    badge: ""
  },
  {
    id: 6,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 369.60,
    originalPrice: 650.00,
    image: reefer6,
    badge: ""
  },
  {
    id: 7,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 369.60,
    originalPrice: 650.00,
    image: reefer6,
    badge: ""
  },
  {
    id: 8,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 369.60,
    originalPrice: 650.00,
    image: reefer6,
    badge: ""
  },
  {
    id: 9,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 369.60,
    originalPrice: 650.00,
    image: reefer6,
    badge: ""
  },
  {
    id: 10,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 369.60,
    originalPrice: 650.00,
    image: reefer6,
    badge: ""
  },
  {
    id: 11,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 369.60,
    originalPrice: 650.00,
    image: reefer6,
    badge: ""
  },
  {
    id: 12,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 369.60,
    originalPrice: 650.00,
    image: reefer6,
    badge: ""
  },
  {
    id: 13,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 369.60,
    originalPrice: 650.00,
    image: reefer6,
    badge: ""
  },
  {
    id: 14,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 369.60,
    originalPrice: 650.00,
    image: reefer6,
    badge: ""
  },
  {
    id: 15,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 369.60,
    originalPrice: 650.00,
    image: reefer6,
    badge: ""
  },
  {
    id: 16,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 369.60,
    originalPrice: 650.00,
    image: reefer6,
    badge: ""
  }
];

export default function Sale() {
  return (
    <MainLayout>
      <div className="min-h-screen bg-white pt-24 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold mb-4" style={{ letterSpacing: '0.05em' }}>
              SALE
            </h1>
            <p className="text-gray-600 text-sm mb-6" style={{ letterSpacing: '0.02em' }}>
              A lineup of everyday pieces—made to fit your routine, your style, and wherever the day takes you.
            </p>
            
            {/* Sort Dropdown */}
            <div className="flex justify-end mb-6">
              <select className="border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:border-gray-500">
                <option>Best Selling</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
                <option>Newest</option>
              </select>
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {saleProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
