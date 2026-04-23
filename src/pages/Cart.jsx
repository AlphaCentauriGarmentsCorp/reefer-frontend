import { useState } from "react";
import { Link } from "react-router-dom";
import { MainLayout } from "../Layouts";
import { FiX } from "react-icons/fi";

export default function Cart() {
  const [cartItems, setCartItems] = useState(() => {
    // Load cart from localStorage on initial render
    const savedCart = localStorage.getItem('cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });

  const updateQuantity = (id, newQuantity) => {
    if (newQuantity < 1) return;
    const updatedCart = cartItems.map(item => 
      item.id === id ? { ...item, quantity: newQuantity } : item
    );
    setCartItems(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
  };

  const removeItem = (id) => {
    const updatedCart = cartItems.filter(item => item.id !== id);
    setCartItems(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
  };

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <MainLayout>
      <div className="min-h-screen bg-white pt-32 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          {cartItems.length === 0 ? (
            /* Empty Cart State */
            <div className="text-center py-40">
              <h1 className="text-3xl font-bold mb-6" style={{ letterSpacing: '0.05em' }}>
                Your Shopping cart
              </h1>
              <p className="text-gray-500 mb-12 text-base" style={{ letterSpacing: '0.02em' }}>
                It appears that your cart is currently empty!
              </p>
              <Link 
                to="/"
                className="inline-block border border-gray-300 text-gray-600 px-10 py-3 hover:border-gray-500 hover:text-gray-800 transition text-sm"
                style={{ letterSpacing: '0.05em' }}
              >
                Continue shopping
              </Link>
            </div>
          ) : (
            <>
              {/* Header - Only show when cart has items */}
              <div className="text-center mb-16 border-b border-gray-200 pb-8">
                <h1 className="text-3xl font-bold mb-3" style={{ letterSpacing: '0.05em' }}>
                  Your Shopping Cart
                </h1>
                <p className="text-sm text-gray-500 uppercase" style={{ letterSpacing: '0.15em' }}>
                  TOTAL ITEMS {cartItems.length}
                </p>
              </div>

              {/* Cart Items */}
              <div className="space-y-8 mb-16">
                {cartItems.map((item) => (
                  <div key={item.id} className="border-b border-gray-200 pb-8">
                    <div className="flex items-center gap-8">
                      {/* Product Image */}
                      <img 
                        src={item.image} 
                        alt={item.name}
                        className="w-24 h-24 object-cover bg-gray-100 flex-shrink-0"
                      />

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-xl mb-1" style={{ letterSpacing: '0.02em' }}>
                          {item.name}
                        </h3>
                        <p className="text-sm text-gray-600 uppercase mb-1" style={{ letterSpacing: '0.05em' }}>
                          {item.size}
                        </p>
                        <p className="text-sm text-gray-500">₱{item.price.toFixed(2)}</p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center border border-gray-300 flex-shrink-0">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="px-5 py-2.5 hover:bg-gray-50 transition text-lg"
                        >
                          −
                        </button>
                        <span className="px-8 py-2.5 border-x border-gray-300 min-w-[70px] text-center font-medium">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="px-5 py-2.5 hover:bg-gray-50 transition text-lg"
                        >
                          +
                        </button>
                      </div>

                      {/* Price */}
                      <div className="text-right min-w-[120px] flex-shrink-0">
                        <p className="font-bold text-xl">₱{(item.price * item.quantity).toFixed(2)}</p>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-gray-400 hover:text-black transition p-2 flex-shrink-0"
                      >
                        <FiX size={28} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Subtotal and Checkout */}
              <div className="border-t-2 border-gray-300 pt-10">
                <div className="flex items-center justify-between mb-10">
                  <h3 className="text-2xl font-bold uppercase" style={{ letterSpacing: '0.05em' }}>
                    SUB TOTAL :
                  </h3>
                  <p className="text-3xl font-bold">₱{subtotal.toFixed(2)}</p>
                </div>

                <div className="flex gap-6">
                  <button className="flex-1 bg-black text-white py-4 hover:bg-gray-800 transition text-base font-semibold" style={{ letterSpacing: '0.05em' }}>
                    Checkout Now
                  </button>
                  <button className="flex-1 border-2 border-black text-black py-4 hover:bg-black hover:text-white transition text-base font-semibold" style={{ letterSpacing: '0.05em' }}>
                    Checkout Now
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
