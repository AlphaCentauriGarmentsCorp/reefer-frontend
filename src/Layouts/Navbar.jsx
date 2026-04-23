import { Link } from "react-router-dom";
import { FiShoppingCart, FiMenu, FiUser, FiSearch } from "react-icons/fi";
import { useState, useEffect } from "react";
import reefer2Logo from "../assets/images/reefer2.png";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDarkBackground, setIsDarkBackground] = useState(true);

  useEffect(() => {
    const controlNavbar = () => {
      if (typeof window !== 'undefined') {
        const scrollY = window.scrollY;

        // Control background and text color
        // Past hero section (around 800px) = white navbar with black text
        if (scrollY > 800) {
          setIsDarkBackground(false); // White navbar, black text
        } else {
          setIsDarkBackground(true); // Transparent navbar, white text
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', controlNavbar);
      return () => {
        window.removeEventListener('scroll', controlNavbar);
      };
    }
  }, []);

  const navbarBg = isDarkBackground ? 'bg-transparent' : 'bg-white shadow-sm';
  const textColor = isDarkBackground ? 'text-white' : 'text-black';
  const hoverColor = 'hover:text-orange-500';
  const mobileMenuBg = isDarkBackground ? 'bg-black/80' : 'bg-white';
  const mobileMenuText = isDarkBackground ? 'text-white' : 'text-black';

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 ${navbarBg} transition-all duration-300`}>
      <div className="w-full px-6 lg:px-12">
        <div className="flex items-center h-16">
          {/* Left - Logo (far left) */}
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center">
              <img src={reefer2Logo} alt="Reefer Logo" className="h-10 w-auto" />
            </Link>
          </div>

          {/* Center - Navigation Links (spread across middle) */}
          <div className="hidden md:flex items-center justify-center flex-1 px-12">
            <div className="flex items-center justify-between w-full max-w-4xl">
              <Link to="/" className={`text-sm font-semibold ${textColor} ${hoverColor} transition`}>
                Home
              </Link>
              <Link to="/branch" className={`text-sm font-semibold ${textColor} ${hoverColor} transition`}>
                Branch
              </Link>
              <Link to="/shop" className={`text-sm font-semibold ${textColor} ${hoverColor} transition`}>
                Shop
              </Link>
              <Link to="/lookbook" className={`text-sm font-semibold ${textColor} ${hoverColor} transition`}>
                Lookbook
              </Link>
              <Link to="/faq" className={`text-sm font-semibold ${textColor} ${hoverColor} transition`}>
                FAQ
              </Link>
              <Link to="/how-to-order" className={`text-sm font-semibold ${textColor} ${hoverColor} transition`}>
                How to Order
              </Link>
              <Link to="/size-chart" className={`text-sm font-semibold ${textColor} ${hoverColor} transition`}>
                Size Chart
              </Link>
              <Link to="/about" className={`text-sm font-semibold ${textColor} ${hoverColor} transition`}>
                About
              </Link>
            </div>
          </div>

          {/* Right Side - Icons (far right) */}
          <div className="flex-shrink-0">
            <div className="flex items-center space-x-4">
              {/* Search Icon */}
              <button className="hidden md:block">
                <FiSearch className={`w-5 h-5 ${textColor} ${hoverColor} transition`} />
              </button>
              
              {/* Cart */}
              <Link to="/" className="relative">
                <FiShoppingCart className={`w-5 h-5 ${textColor} ${hoverColor} transition`} />
              </Link>
              
              {/* Profile Button */}
              <Link 
                to="/profile" 
                className="relative"
              >
                <FiUser className={`w-5 h-5 ${textColor} ${hoverColor} transition`} />
              </Link>
              
              {/* Mobile menu button */}
              <button 
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <FiMenu className={`w-6 h-6 ${textColor}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className={`md:hidden ${mobileMenuBg} border-t`}>
          <div className="px-4 py-4 space-y-3">
            <Link to="/" className={`block text-sm font-semibold ${mobileMenuText} hover:text-orange-500`}>
              Home
            </Link>
            <Link to="/branch" className={`block text-sm font-semibold ${mobileMenuText} hover:text-orange-500`}>
              Branch
            </Link>
            <Link to="/shop" className={`block text-sm font-semibold ${mobileMenuText} hover:text-orange-500`}>
              Shop
            </Link>
            <Link to="/lookbook" className={`block text-sm font-semibold ${mobileMenuText} hover:text-orange-500`}>
              Lookbook
            </Link>
            <Link to="/faq" className={`block text-sm font-semibold ${mobileMenuText} hover:text-orange-500`}>
              FAQ
            </Link>
            <Link to="/how-to-order" className={`block text-sm font-semibold ${mobileMenuText} hover:text-orange-500`}>
              How to Order
            </Link>
            <Link to="/size-chart" className={`block text-sm font-semibold ${mobileMenuText} hover:text-orange-500`}>
              Size Chart
            </Link>
            <Link to="/about" className={`block text-sm font-semibold ${mobileMenuText} hover:text-orange-500`}>
              About
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
