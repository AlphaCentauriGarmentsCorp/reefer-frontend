import { LandingLayout } from "../Layouts";

export default function HowToOrder() {
  return (
    <LandingLayout>
      <div className="min-h-screen bg-white py-20 px-4" style={{ color: '#000000' }}>
        <div className="max-w-4xl mx-auto">
          {/* Page Title */}
          <div className="text-center mb-16">
            <h1 className="text-6xl md:text-7xl font-bold text-orange-500 mb-8 italic">
              How to Order
            </h1>
          </div>

          {/* Content Section */}
          <div className="space-y-8">
            {/* Online Shop Section */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-6" style={{ color: '#000000' }}>
                ONLINE SHOP (www.reeferclothing.com)
              </h2>
              
              <h3 className="text-lg font-semibold mb-4" style={{ color: '#000000' }}>
                Instructions:
              </h3>
              
              <ul className="space-y-4 leading-relaxed" style={{ color: '#000000' }}>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-black rounded-full mt-2 mr-4 flex-shrink-0"></span>
                  Go to the SHOP section to browse all the products available at our online store
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-black rounded-full mt-2 mr-4 flex-shrink-0"></span>
                  ADD TO CART the product/s that you wish to buy
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-black rounded-full mt-2 mr-4 flex-shrink-0"></span>
                  If you are satisfied with your order/s and wish to check out, just click the shopping bag icon and proceed to CHECKOUT
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-black rounded-full mt-2 mr-4 flex-shrink-0"></span>
                  Input your email address and the necessary information needed in the SHIPPING ADDRESS section
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-black rounded-full mt-2 mr-4 flex-shrink-0"></span>
                  Proceed to CONTINUE TO SHIPPING
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-black rounded-full mt-2 mr-4 flex-shrink-0"></span>
                  For payment, you have two options: you can pay using your credit/debit card or GCASH
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-black rounded-full mt-2 mr-4 flex-shrink-0"></span>
                  Click COMPLETE ORDER once you choose your mode of payment
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-black rounded-full mt-2 mr-4 flex-shrink-0"></span>
                  Please take note of your order number
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-black rounded-full mt-2 mr-4 flex-shrink-0"></span>
                  You will receive updates regarding your order/s through email
                </li>
              </ul>
              
              <p className="mt-6 leading-relaxed" style={{ color: '#000000' }}>
                If you have more questions or concerns, please don't hesitate to contact our Reefer Customer
              </p>
            </div>
          </div>
        </div>
      </div>
    </LandingLayout>
  );
}