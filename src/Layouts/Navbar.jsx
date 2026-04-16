import { Link } from "react-router-dom";
import { FiShoppingCart, FiMenu, FiUser, FiSearch } from "react-icons/fi";
import { useState } from "react";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left - Shop Links */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/" className="text-sm font-semibold text-gray-900 hover:text-orange-500 transition">
              Shop
            </Link>
            <Link to="/" className="text-sm font-semibold text-gray-900 hover:text-orange-500 transition">
              SALE
            </Link>
            <Link to="/" className="text-sm font-semibold text-gray-900 hover:text-orange-500 transition">
              MORE
            </Link>
          </div>

          {/* Center - Logo */}
          <Link to="/" className="flex items-center absolute left-1/2 transform -translate-x-1/2">
            <span className="text-2xl font-bold text-orange-500">REEFER</span>
          </Link>

          {/* Right Side - Search, Cart & Profile */}
          <div className="flex items-center space-x-4 ml-auto">
            {/* Search Icon */}
            <button className="hidden md:block">
              <FiSearch className="w-5 h-5 text-gray-900 hover:text-orange-500 transition" />
            </button>
            
            {/* Cart */}
            <Link to="/" className="relative">
              <FiShoppingCart className="w-5 h-5 text-gray-900 hover:text-orange-500 transition" />
            </Link>
            
            {/* Profile Button */}
            <Link 
              to="/profile" 
              className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center hover:bg-orange-600 transition"
            >
              <FiUser className="w-5 h-5 text-white" />
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
              Shop
            </Link>
            <Link to="/" className="block text-sm font-semibold text-gray-900 hover:text-orange-500">
              SALE
            </Link>
            <Link to="/" className="block text-sm font-semibold text-gray-900 hover:text-orange-500">
              MORE
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
