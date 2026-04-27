import { MainLayout } from "../Layouts";
import { Link } from "react-router-dom";
import allCollection from "../assets/images/all collection.jpg";
import tshirtCollections from "../assets/images/T-shirt Collections.jpg";
import summerVibes from "../assets/images/Summer-vibes.jpg";
import reefer3 from "../assets/images/reefer3.jpg";
import reefer4 from "../assets/images/reefer4.jpg";
import reefer5 from "../assets/images/reefer5.jpg";
import reefer6 from "../assets/images/reefer6.jpg";
import reefer7 from "../assets/images/reefer7.jpg";
import reefer8 from "../assets/images/reefer8.jpg";

const categories = [
  {
    id: 1,
    name: "All Collections",
    image: allCollection,
    link: "/shop/all"
  },
  {
    id: 2,
    name: "T-shirt",
    image: tshirtCollections,
    link: "/shop/t-shirt"
  },
  {
    id: 3,
    name: "Sale",
    image: reefer8,
    link: "/shop/sale"
  },
  {
    id: 4,
    name: "Jogging pants",
    image: reefer7,
    link: "/shop/jogging-pants"
  },
  {
    id: 5,
    name: "Summer Vibes",
    image: summerVibes,
    link: "/shop/summer-vibes"
  },
  {
    id: 6,
    name: "ReeferMini",
    image: reefer6,
    link: "/shop/reefermini"
  },
  {
    id: 7,
    name: "Hoodie",
    image: reefer8,
    link: "/shop/hoodie"
  },
  {
    id: 8,
    name: "Collaborations",
    image: reefer3,
    link: "/shop/collaborations"
  },
  {
    id: 9,
    name: "ReeferMini",
    image: reefer5,
    link: "/shop/reefermini"
  },
  {
    id: 10,
    name: "Wallet",
    image: reefer4,
    link: "/shop/wallet"
  },
  {
    id: 11,
    name: "Accessories",
    image: reefer4,
    link: "/shop/accessories"
  },
  {
    id: 12,
    name: "Sticker",
    image: reefer7,
    link: "/shop/sticker"
  }
];

export default function Shop() {
  return (
    <MainLayout>
      <div className="min-h-screen bg-white pt-24 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Page Title */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold" style={{ letterSpacing: '0.05em' }}>
              SHOP
            </h1>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={category.link}
                className="group relative overflow-hidden bg-gray-100 aspect-[4/3] hover:shadow-lg transition-all duration-300"
              >
                {/* Category Image */}
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Overlay - transparent by default, dark on hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300" />

                {/* Text shadow overlay for readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

                {/* Category Info */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <h3 
                    className="text-2xl font-bold mb-2 drop-shadow-lg" 
                    style={{ 
                      letterSpacing: '0.05em',
                      textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
                    }}
                  >
                    {category.name}
                  </h3>
                  <p 
                    className="text-sm underline drop-shadow-md" 
                    style={{ 
                      letterSpacing: '0.05em',
                      textShadow: '1px 1px 3px rgba(0,0,0,0.5)'
                    }}
                  >
                    View Products
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {/* Load More Button */}
          <div className="text-center">
            <Link 
              to="/shop/all"
              className="bg-black text-white px-12 py-3 hover:bg-gray-800 transition text-sm font-semibold inline-block"
              style={{ letterSpacing: '0.05em' }}
            >
              Load More
            </Link>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
