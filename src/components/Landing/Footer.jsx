import { Link } from "react-router-dom";
import { FaFacebook, FaInstagram, FaTiktok } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="bg-black text-white py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-8">
          {/* Brand */}
          <div>
            <div className="text-orange-500 text-2xl font-bold mb-2">REEFER</div>
            <p className="text-sm text-gray-400">
              Quezon City - Philippines
            </p>
          </div>

          {/* Contact Us */}
          <div>
            <h3 className="font-bold mb-4 text-sm">CONTACT US</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>📍 123 QUEZON AVENUE ST</li>
              <li>✉️ REEFER@EMAIL.DOMAIN @EMAIL</li>
              <li>📞 +63 912 3456</li>
            </ul>
          </div>

          {/* Customer Care */}
          <div>
            <h3 className="font-bold mb-4 text-sm">CUSTOMER CARE</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/faqs" className="hover:text-orange-500 transition">FAQS</Link></li>
              <li><Link to="/shipping" className="hover:text-orange-500 transition">SHIPPING</Link></li>
              <li><Link to="/order-status" className="hover:text-orange-500 transition">ORDER STATUS</Link></li>
              <li><Link to="/return-exchange" className="hover:text-orange-500 transition">RETURN AND EXCHANGE</Link></li>
            </ul>
          </div>

          {/* Follow Us */}
          <div>
            <h3 className="font-bold mb-4 text-sm">FOLLOW US</h3>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 border border-gray-600 flex items-center justify-center hover:border-orange-500 hover:text-orange-500 transition">
                <FaFacebook size={20} />
              </a>
              <a href="#" className="w-10 h-10 border border-gray-600 flex items-center justify-center hover:border-orange-500 hover:text-orange-500 transition">
                <FaInstagram size={20} />
              </a>
              <a href="#" className="w-10 h-10 border border-gray-600 flex items-center justify-center hover:border-orange-500 hover:text-orange-500 transition">
                <FaTiktok size={20} />
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 pt-6 text-center text-xs text-gray-500">
          <p>© 2002-2025 Reefer. All rights reserved.</p>
          <div className="mt-2">
            <Link to="/privacy" className="hover:text-orange-500 transition">Privacy Policy</Link>
            <span className="mx-2">•</span>
            <Link to="/terms" className="hover:text-orange-500 transition">Terms and Conditions</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
