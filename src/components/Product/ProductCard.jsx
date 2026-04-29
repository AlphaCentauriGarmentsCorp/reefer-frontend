import { Link } from "react-router-dom";
import { useState } from "react";

export default function ProductCard({ product, onQuickView, isQuickViewOpen }) {
  const [selectedSize, setSelectedSize] = useState("M");
  const [quantity, setQuantity] = useState(1);

  const handleAddToCart = () => {
    const existingCart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    const cartItem = {
      id: product.id,
      name: product.name,
      size: selectedSize,
      price: product.price,
      quantity: quantity,
      image: product.image
    };
    
    const existingItemIndex = existingCart.findIndex(
      item => item.id === product.id && item.size === selectedSize
    );
    
    if (existingItemIndex > -1) {
      existingCart[existingItemIndex].quantity += quantity;
    } else {
      existingCart.push(cartItem);
    }
    
    localStorage.setItem('cart', JSON.stringify(existingCart));
    alert('Added to cart!');
  };

  return (
    <div className="bg-white overflow-hidden transition-all duration-300">
      <div className="group">
        <Link 
          to={`/product/${product.id}`}
          className="block"
        >
          {/* Product Image Container */}
          <div className="relative aspect-square bg-white overflow-hidden flex items-center justify-center p-4">
            <img 
              src={product.image} 
              alt={product.name}
              className="w-full h-full object-contain"
              onError={(e) => {
                e.target.src = "https://via.placeholder.com/400x400/ffffff/9ca3af?text=REEFER";
              }}
            />
            
            {/* Orange Badge - Top Right */}
            {product.badge && (
              <div className="absolute top-3 right-3 z-10">
                <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1">
                  {product.badge}
                </span>
              </div>
            )}

            {/* Quick View Button - Small centered bar */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onQuickView(product);
              }}
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/90 opacity-0 group-hover:opacity-100 transition-opacity duration-300 px-8 py-3 z-10"
            >
              <span className="text-white text-sm font-bold tracking-widest whitespace-nowrap">QUICK VIEW</span>
            </button>
          </div>

          {/* Product Info */}
          <div className="p-4 text-center bg-white">
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
            
            {/* Price */}
            <div className="text-sm font-bold text-gray-700">
              ₱{product.price.toFixed(2)}
            </div>
          </div>
        </Link>
      </div>

      {/* Quick View Section removed from here - now at grid level */}
    </div>
  );
}
