import { Link } from "react-router-dom";
import { FaFacebook, FaInstagram, FaTiktok } from "react-icons/fa";
import reefer2Logo from "../assets/images/reefer2.png";

export default function Footer() {
  return (
    <footer className="bg-black text-white py-8 px-8 lg:px-16">
      <div className="w-full max-w-screen-2xl mx-auto">
        {/* Main Footer Content */}
        <div className="flex items-center justify-between">
          {/* Left - Brand Logo */}
          <div className="flex-shrink-0">
            <img src={reefer2Logo} alt="Reefer Logo" className="h-12 w-auto mb-2" />
            <p className="text-xs text-gray-400">
              Quezon City - Philippines
            </p>
          </div>

          {/* Center - Navigation Links */}
          <div className="hidden lg:flex items-center justify-center flex-1 mx-16">
            <div className="flex items-center space-x-8">
              <Link to="/" className="text-sm text-gray-300 hover:text-orange-500 transition">
                Home
              </Link>
              <Link to="/branch" className="text-sm text-gray-300 hover:text-orange-500 transition">
                Branch
              </Link>
              <Link to="/shop" className="text-sm text-gray-300 hover:text-orange-500 transition">
                Shop
              </Link>
              <Link to="/lookbook" className="text-sm text-gray-300 hover:text-orange-500 transition">
                Lookbook
              </Link>
              <Link to="/faq" className="text-sm text-gray-300 hover:text-orange-500 transition">
                FAQ
              </Link>
              <Link to="/how-to-order" className="text-sm text-gray-300 hover:text-orange-500 transition">
                How to Order
              </Link>
              <Link to="/size-chart" className="text-sm text-gray-300 hover:text-orange-500 transition">
                Size Chart
              </Link>
              <Link to="/about" className="text-sm text-gray-300 hover:text-orange-500 transition">
                About
              </Link>
            </div>
          </div>

          {/* Right - Follow Us */}
          <div className="flex-shrink-0 text-right">
            <div className="border border-gray-500 inline-block px-4 py-2 mb-3">
              <h3 className="font-bold text-xs text-white">FOLLOW US</h3>
            </div>
            <div className="flex gap-2 justify-end">
              <a href="#" className="w-8 h-8 border border-gray-500 flex items-center justify-center hover:border-orange-500 hover:text-orange-500 transition">
                <FaFacebook size={14} />
              </a>
              <a href="#" className="w-8 h-8 border border-gray-500 flex items-center justify-center hover:border-orange-500 hover:text-orange-500 transition">
                <FaInstagram size={14} />
              </a>
              <a href="#" className="w-8 h-8 border border-gray-500 flex items-center justify-center hover:border-orange-500 hover:text-orange-500 transition">
                <FaTiktok size={14} />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom - Legal Links */}
        <div className="flex items-center justify-center space-x-8 pt-6 mt-6 border-t border-gray-800">
          <Link to="/privacy-policy" className="text-xs text-gray-400 hover:text-orange-500 transition underline">
            Privacy Policy
          </Link>
          <Link to="/terms-conditions" className="text-xs text-gray-400 hover:text-orange-500 transition underline">
            Terms & Conditions
          </Link>
        </div>

        {/* Mobile Navigation - Hidden on desktop */}
        <div className="lg:hidden mt-6 pt-6 border-t border-gray-700">
          <div className="grid grid-cols-2 gap-3 text-center mb-4">
            <Link to="/" className="text-xs text-gray-300 hover:text-orange-500 transition">Home</Link>
            <Link to="/branch" className="text-xs text-gray-300 hover:text-orange-500 transition">Branch</Link>
            <Link to="/shop" className="text-xs text-gray-300 hover:text-orange-500 transition">Shop</Link>
            <Link to="/lookbook" className="text-xs text-gray-300 hover:text-orange-500 transition">Lookbook</Link>
            <Link to="/faq" className="text-xs text-gray-300 hover:text-orange-500 transition">FAQ</Link>
            <Link to="/how-to-order" className="text-xs text-gray-300 hover:text-orange-500 transition">How to Order</Link>
            <Link to="/size-chart" className="text-xs text-gray-300 hover:text-orange-500 transition">Size Chart</Link>
            <Link to="/about" className="text-xs text-gray-300 hover:text-orange-500 transition">About</Link>
          </div>
          <div className="text-center">
            <div className="border border-gray-500 inline-block px-3 py-1 mb-2">
              <h3 className="font-bold text-xs text-white">FOLLOW US</h3>
            </div>
            <div className="flex gap-2 justify-center">
              <a href="#" className="w-6 h-6 border border-gray-500 flex items-center justify-center hover:border-orange-500 hover:text-orange-500 transition">
                <FaFacebook size={12} />
              </a>
              <a href="#" className="w-6 h-6 border border-gray-500 flex items-center justify-center hover:border-orange-500 hover:text-orange-500 transition">
                <FaInstagram size={12} />
              </a>
              <a href="#" className="w-6 h-6 border border-gray-500 flex items-center justify-center hover:border-orange-500 hover:text-orange-500 transition">
                <FaTiktok size={12} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
