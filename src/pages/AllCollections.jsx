import { MainLayout } from "../Layouts";
import ProductCard from "../components/Product/ProductCard";
import reefer5 from "../assets/images/reefer5.jpg";
import reefer6 from "../assets/images/reefer6.jpg";

const allProducts = [
  {
    id: 1,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 369.60,
    image: reefer6,
    badge: ""
  },
  {
    id: 2,
    name: "Chill Season",
    type: "Sando Shirt",
    price: 369.60,
    image: reefer6,
    badge: ""
  },
  {
    id: 3,
    name: "TITTLE",
    type: "Bag",
    price: 369.60,
    image: reefer6,
    badge: ""
  },
  {
    id: 4,
    name: "TITTLE",
    type: "Hoodie",
    price: 369.60,
    image: reefer6,
    badge: ""
  },
  {
    id: 5,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 369.60,
    image: reefer6,
    badge: ""
  },
  {
    id: 6,
    name: "TITTLE",
    type: "Hoodie",
    price: 369.60,
    image: reefer6,
    badge: ""
  },
  {
    id: 7,
    name: "Chill Season",
    type: "Sando Shirt",
    price: 369.60,
    image: reefer6,
    badge: ""
  },
  {
    id: 8,
    name: "TITTLE",
    type: "Bag",
    price: 369.60,
    image: reefer6,
    badge: ""
  },
  {
    id: 9,
    name: "Chill Season",
    type: "Sando Shirt",
    price: 369.60,
    image: reefer6,
    badge: ""
  },
  {
    id: 10,
    name: "TITTLE",
    type: "Bag",
    price: 369.60,
    image: reefer6,
    badge: ""
  },
  {
    id: 11,
    name: "TITTLE",
    type: "Hoodie",
    price: 369.60,
    image: reefer6,
    badge: ""
  },
  {
    id: 12,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 369.60,
    image: reefer6,
    badge: ""
  }
];

export default function AllCollections() {
  return (
    <MainLayout>
      <div className="min-h-screen bg-white">
        {/* Hero Banner */}
        <div 
          className="relative h-96 bg-cover bg-center flex items-center justify-center"
          style={{ 
            backgroundImage: `url(${reefer5})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center center'
          }}
        >
          {/* Dark Overlay */}
          <div className="absolute inset-0 bg-black/40" />
          
          {/* Title */}
          <h1 
            className="relative text-white text-6xl font-bold z-10"
            style={{ 
              letterSpacing: '0.05em',
              textShadow: '2px 2px 8px rgba(0,0,0,0.5)'
            }}
          >
            All Collections
          </h1>
        </div>

        {/* Products Section */}
        <div className="py-16 px-4">
          <div className="max-w-7xl mx-auto">
            {/* Products Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
              {allProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Load More Button */}
            <div className="text-center">
              <button className="bg-black text-white px-12 py-3 hover:bg-gray-800 transition text-sm font-semibold" style={{ letterSpacing: '0.05em' }}>
                Load More
              </button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
