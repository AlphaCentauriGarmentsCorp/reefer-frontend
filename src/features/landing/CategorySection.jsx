import { Link } from "react-router-dom";
import reefer3 from "../../assets/images/reefer3.jpg";
import reefer4 from "../../assets/images/reefer4.jpg";
import reefer5 from "../../assets/images/reefer5.jpg";
import reefer7 from "../../assets/images/reefer7.jpg";

export default function CategorySection() {
  return (
    <section className="py-12 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[500px]">
          {/* Left Side - All Collections */}
          <Link 
            to="/collections" 
            className="relative group overflow-hidden rounded-lg bg-cover bg-center"
            style={{ backgroundImage: `url(${reefer3})` }}
          >
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-all duration-300" />
            <div className="absolute bottom-6 left-6 text-white">
              <h3 className="text-3xl font-bold mb-2">All Collections</h3>
              <p className="text-lg opacity-90">View Products</p>
            </div>
          </Link>

          {/* Right Side - Grid */}
          <div className="grid grid-cols-1 gap-4">
            {/* Top Right - Accessories */}
            <Link 
              to="/accessories" 
              className="relative group overflow-hidden rounded-lg bg-cover bg-center h-[240px]"
              style={{ backgroundImage: `url(${reefer4})` }}
            >
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-all duration-300" />
              <div className="absolute bottom-4 left-4 text-white">
                <h3 className="text-2xl font-bold mb-1">Accessories</h3>
                <p className="text-sm opacity-90">New Products</p>
              </div>
            </Link>

            {/* Bottom Grid */}
            <div className="grid grid-cols-2 gap-4 h-[240px]">
              {/* Hoodies */}
              <Link 
                to="/hoodies" 
                className="relative group overflow-hidden rounded-lg bg-cover bg-center"
                style={{ backgroundImage: `url(${reefer5})` }}
              >
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-all duration-300" />
                <div className="absolute bottom-3 left-3 text-white">
                  <h3 className="text-lg font-bold mb-1">Hoodies</h3>
                </div>
              </Link>

              {/* T-Shirt */}
              <Link 
                to="/t-shirts" 
                className="relative group overflow-hidden rounded-lg bg-cover bg-center"
                style={{ backgroundImage: `url(${reefer7})` }}
              >
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-all duration-300" />
                <div className="absolute bottom-3 left-3 text-white">
                  <h3 className="text-lg font-bold mb-1">T-Shirt</h3>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}