import { Link } from "react-router-dom";

export default function ProductCard({ product }) {
  return (
    <Link 
      to={`/product/${product.id}`}
      className="group bg-white overflow-hidden hover:shadow-lg transition-all duration-300 block"
    >
      {/* Product Image Container */}
      <div className="relative aspect-square bg-gray-100 flex items-center justify-center p-8 border border-gray-200">
        <img 
          src={product.image} 
          alt={product.name}
          className="w-full h-full object-contain"
          onError={(e) => {
            e.target.src = "https://via.placeholder.com/400x400/f3f4f6/9ca3af?text=REEFER";
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
      <div className="p-5 text-center bg-white border-x border-b border-gray-200">
        {/* REEFER Brand */}
        <div className="text-orange-500 font-bold text-xs tracking-wider mb-2">
          REEFER
        </div>
        
        {/* Product Name */}
        <h3 className="font-bold text-base uppercase mb-1 tracking-wide">
          {product.name}
        </h3>
        
        {/* Product Type */}
        <p className="text-xs text-gray-500 mb-4 capitalize">
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
