import { Link } from "react-router-dom";

export default function ProductCard({ product }) {
  return (
    <Link 
      to={`/product/${product.id}`}
      className="group bg-white overflow-hidden hover:shadow-lg transition-all duration-300 block"
    >
      {/* Product Image Container - Clean White Background */}
      <div className="relative aspect-square bg-white overflow-hidden flex items-center justify-center p-4">
        <img 
          src={product.image} 
          alt={product.name}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            e.target.src = "https://via.placeholder.com/400x400/ffffff/9ca3af?text=REEFER";
          }}
        />
        
        {/* Orange Badge - Top Right */}
        {product.badge && (
          <div className="absolute top-3 right-3">
            <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1">
              {product.badge}
            </span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4 text-center bg-white border-t border-gray-100">
        {/* REEFER Brand */}
        <div className="text-orange-500 font-bold text-xs tracking-wider mb-2">
          REEFER
        </div>
        
        {/* Product Name */}
        <h3 className="font-bold text-base uppercase mb-1 tracking-wide">
          {product.name}
        </h3>
        
        {/* Product Type */}
        <p className="text-xs text-gray-500 mb-3 capitalize">
          {product.type}
        </p>
        
        {/* Price Button */}
        <button className="bg-black text-white text-sm font-bold px-8 py-2.5 rounded-full hover:bg-gray-800 transition-colors duration-300 w-auto">
          ₱{product.price.toFixed(2)}
        </button>
      </div>
    </Link>
  );
}
