import { Link, useLocation } from "react-router-dom";
import { FiShoppingCart, FiMenu, FiSearch } from "react-icons/fi";
import { useState, useEffect } from "react";
import reeferLogoWhite from "../assets/images/REEFER_LOGO_WHITE.webp";
import reeferFullname from "../assets/images/REEFER-fullnamem.png";
import profileImage from "../assets/images/1.jpg";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  
  // Pages with hero/header images that should have transparent navbar at top
  const pagesWithHeader = ['/', '/about', '/faq'];
  const hasHeader = pagesWithHeader.includes(location.pathname);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Pages with header: transparent when at top, white when scrolled
  // Other pages: always white
  const navBgClass = hasHeader 
    ? (isScrolled ? 'bg-white shadow-md' : 'bg-transparent')
    : 'bg-white shadow-md';

  const getNavLinkClass = (path) => {
    const isActive = location.pathname === path;
    const baseClass = `text-sm font-semibold transition`;
    
    // Pages with header at top: white text, otherwise black text
    const textColor = (hasHeader && !isScrolled) ? 'text-white' : 'text-black';
    const activeClass = isActive ? 'text-reefer-orange border-b-2 border-reefer-orange' : `${textColor} hover:text-reefer-orange`;
    return `${baseClass} ${activeClass}`;
  };

  const iconColor = (hasHeader && !isScrolled) ? 'text-white' : 'text-black';
  const logoSrc = (hasHeader && !isScrolled) ? reeferLogoWhite : reeferFullname;

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navBgClass}`}>
      <div className="w-full px-6 lg:px-12">
        <div className="flex items-center h-16">
          {/* Left - Logo (far left) */}
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center">
              <img 
                src={logoSrc} 
                alt="Reefer Logo" 
                className="h-7 w-auto" 
              />
            </Link>
          </div>

          {/* Center - Navigation Links (spread across middle) */}
          <div className="hidden md:flex items-center justify-center flex-1 px-12">
            <div className="flex items-center justify-between w-full max-w-4xl">
              <Link to="/" className={getNavLinkClass('/')}>
                Home
              </Link>
              <Link to="/branch" className={getNavLinkClass('/branch')}>
                Branch
              </Link>
              <Link to="/shop" className={getNavLinkClass('/shop')}>
                Shop
              </Link>
              <Link to="/lookbook" className={getNavLinkClass('/lookbook')}>
                Lookbook
              </Link>
              <Link to="/faq" className={getNavLinkClass('/faq')}>
                FAQ
              </Link>
              <Link to="/how-to-order" className={getNavLinkClass('/how-to-order')}>
                How to Order
              </Link>
              <Link to="/size-chart" className={getNavLinkClass('/size-chart')}>
                Size Chart
              </Link>
              <Link to="/about" className={getNavLinkClass('/about')}>
                About
              </Link>
            </div>
          </div>

          {/* Right Side - Icons (far right) */}
          <div className="flex-shrink-0">
            <div className="flex items-center space-x-4">
              {/* Search Icon */}
              <button className="hidden md:block">
                <FiSearch className={`w-5 h-5 ${iconColor} hover:text-reefer-orange transition`} />
              </button>
              
              {/* Cart */}
              <Link to="/cart" className="relative">
                <FiShoppingCart className={`w-5 h-5 ${iconColor} hover:text-reefer-orange transition`} />
              </Link>
              
              {/* Profile Button with Image */}
              <Link to="/profile" className="relative">
                <img 
                  src={profileImage} 
                  alt="Profile" 
                  className="w-8 h-8 rounded-full object-cover border-2 border-transparent hover:border-reefer-orange transition"
                />
              </Link>
              
              {/* Mobile menu button */}
              <button 
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <FiMenu className={`w-6 h-6 ${iconColor}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className={`md:hidden border-t ${(hasHeader && !isScrolled) ? 'bg-black/90 border-gray-800' : 'bg-white border-gray-200'}`}>
          <div className="px-4 py-4 space-y-3">
            <Link 
              to="/" 
              className={`block text-sm font-semibold ${location.pathname === '/' ? 'text-reefer-orange' : (hasHeader && !isScrolled) ? 'text-white' : 'text-black'} hover:text-reefer-orange`}
            >
              Home
            </Link>
            <Link 
              to="/branch" 
              className={`block text-sm font-semibold ${location.pathname === '/branch' ? 'text-reefer-orange' : (hasHeader && !isScrolled) ? 'text-white' : 'text-black'} hover:text-reefer-orange`}
            >
              Branch
            </Link>
            <Link 
              to="/shop" 
              className={`block text-sm font-semibold ${location.pathname === '/shop' ? 'text-reefer-orange' : (hasHeader && !isScrolled) ? 'text-white' : 'text-black'} hover:text-reefer-orange`}
            >
              Shop
            </Link>
            <Link 
              to="/lookbook" 
              className={`block text-sm font-semibold ${location.pathname === '/lookbook' ? 'text-reefer-orange' : (hasHeader && !isScrolled) ? 'text-white' : 'text-black'} hover:text-reefer-orange`}
            >
              Lookbook
            </Link>
            <Link 
              to="/faq" 
              className={`block text-sm font-semibold ${location.pathname === '/faq' ? 'text-reefer-orange' : (hasHeader && !isScrolled) ? 'text-white' : 'text-black'} hover:text-reefer-orange`}
            >
              FAQ
            </Link>
            <Link 
              to="/how-to-order" 
              className={`block text-sm font-semibold ${location.pathname === '/how-to-order' ? 'text-reefer-orange' : (hasHeader && !isScrolled) ? 'text-white' : 'text-black'} hover:text-reefer-orange`}
            >
              How to Order
            </Link>
            <Link 
              to="/size-chart" 
              className={`block text-sm font-semibold ${location.pathname === '/size-chart' ? 'text-reefer-orange' : (hasHeader && !isScrolled) ? 'text-white' : 'text-black'} hover:text-reefer-orange`}
            >
              Size Chart
            </Link>
            <Link 
              to="/about" 
              className={`block text-sm font-semibold ${location.pathname === '/about' ? 'text-reefer-orange' : (hasHeader && !isScrolled) ? 'text-white' : 'text-black'} hover:text-reefer-orange`}
            >
              About
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
