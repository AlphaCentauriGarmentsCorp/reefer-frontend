import { useState } from "react";
import { Link } from "react-router-dom";
import { MainLayout } from "../Layouts";
import { FiTrash2 } from "react-icons/fi";

export default function Cart() {
  const [cartItems, setCartItems] = useState([
    {
      id: 1,
      name: "LIFE TO BE",
      size: "MEDIUM",
      price: 369.60,
      quantity: 1,
      image: "https://via.placeholder.com/80x80/1a1a1a/ffffff?text=LIFE+TO+BE"
    }
  ]);

  const deliveryFee = 50;

  const updateQuantity = (id, newQuantity) => {
    if (newQuantity < 1) return;
    setCartItems(cartItems.map(item => 
      item.id === id ? { ...item, quantity: newQuantity } : item
    ));
  };

  const removeItem = (id) => {
    setCartItems(cartItems.filter(item => item.id !== id));
  };

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = subtotal + deliveryFee;

  return (
    <MainLayout>
      <div className="pt-20 pb-16 px-4 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-8">
            {/* Header */}
            <div className="text-center mb-8 border-b pb-6">
              <h1 className="text-3xl font-bold mb-2">Your Shopping Cart</h1>
              <p className="text-gray-600">TOTAL ITEMS: {cartItems.length}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left - Cart Items */}
              <div className="lg:col-span-2">
                {cartItems.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-6xl mb-4">🛒</div>
                    <h2 className="text-2xl font-bold mb-2">Your Cart is empty</h2>
                    <p className="text-gray-600 mb-6">Your collection begins here!</p>
                    <Link 
                      to="/"
                      className="inline-block bg-black text-white px-8 py-3 rounded-lg hover:bg-gray-800 transition"
                    >
                      Continue Shopping
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 border-b pb-4">
                        {/* Product Image */}
                        <img 
                          src={item.image} 
                          alt={item.name}
                          className="w-20 h-20 object-cover rounded"
                        />

                        {/* Product Info */}
                        <div className="flex-1">
                          <h3 className="font-bold text-lg">{item.name}</h3>
                          <p className="text-sm text-gray-600">{item.size}</p>
                          <p className="text-orange-500 font-bold">₱{item.price.toFixed(2)}</p>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2 border rounded">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="px-3 py-1 hover:bg-gray-100"
                          >
                            −
                          </button>
                          <span className="px-4 py-1 border-x">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="px-3 py-1 hover:bg-gray-100"
                          >
                            +
                          </button>
                        </div>

                        {/* Item Total */}
                        <div className="text-right">
                          <p className="font-bold">₱{(item.price * item.quantity).toFixed(2)}</p>
                        </div>

                        {/* Remove Button */}
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-red-500 hover:text-red-700 p-2"
                        >
                          <FiTrash2 size={20} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right - Order Summary */}
              <div className="lg:col-span-1">
                <div className="bg-gray-50 p-6 rounded-lg sticky top-24">
                  <h2 className="text-2xl font-bold mb-6">Order Summary</h2>

                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-semibold">₱{subtotal.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-600">Estimated Delivery & Handling</span>
                      <span className="font-semibold">{deliveryFee} PHP</span>
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex justify-between text-xl font-bold">
                        <span>Total</span>
                        <span>₱{total.toFixed(2)} PESOS</span>
                      </div>
                    </div>
                  </div>

                  <button 
                    disabled={cartItems.length === 0}
                    className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Checkout Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
