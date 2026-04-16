import { Link } from "react-router-dom";
import { FiShoppingCart, FiMenu } from "react-icons/fi";
import { useState } from "react";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <span className="text-2xl font-bold text-orange-500">REEFER</span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-sm font-semibold text-gray-900 hover:text-orange-500 transition">
              HOME
            </Link>
            <Link to="/shop" className="text-sm font-semibold text-gray-900 hover:text-orange-500 transition">
              SHOP
            </Link>
            <Link to="/about" className="text-sm font-semibold text-gray-900 hover:text-orange-500 transition">
              ABOUT
            </Link>
          </div>

          {/* Right Side - Cart & Coins */}
          <div className="flex items-center space-x-6">
            <button className="text-orange-500 text-sm font-bold hidden md:block">
              ฿ 0 COINS
            </button>
            <Link to="/cart" className="relative">
              <FiShoppingCart className="w-6 h-6 text-gray-900" />
              <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                0
              </span>
            </Link>
            
            {/* Mobile menu button */}
            <button 
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <FiMenu className="w-6 h-6 text-gray-900" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="px-4 py-4 space-y-3">
            <Link to="/" className="block text-sm font-semibold text-gray-900 hover:text-orange-500">
              HOME
            </Link>
            <Link to="/shop" className="block text-sm font-semibold text-gray-900 hover:text-orange-500">
              SHOP
            </Link>
            <Link to="/about" className="block text-sm font-semibold text-gray-900 hover:text-orange-500">
              ABOUT
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
