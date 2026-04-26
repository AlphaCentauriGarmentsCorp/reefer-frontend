import { MainLayout } from "../Layouts";
import { useState } from "react";
import { FiHelpCircle, FiCreditCard, FiShield, FiUser } from "react-icons/fi";
import reefer1 from "../assets/images/reefer1.jpg";

const faqCategories = [
  {
    id: 1,
    name: "General Question",
    icon: FiHelpCircle
  },
  {
    id: 2,
    name: "Payment & Billing",
    icon: FiCreditCard
  },
  {
    id: 3,
    name: "Safety & Security",
    icon: FiShield
  },
  {
    id: 4,
    name: "Account & Update",
    icon: FiUser
  }
];

export default function FAQ() {
  const [activeCategory, setActiveCategory] = useState(1);

  return (
    <MainLayout>
      <div className="min-h-screen bg-white">
        {/* Hero Banner with Overlapping Buttons */}
        <div className="relative">
          {/* Hero Banner */}
          <div 
            className="relative h-80 bg-cover bg-center flex items-end justify-start pb-8"
            style={{ 
              backgroundImage: `url(${reefer1})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center center'
            }}
          >
            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-black/30" />
            
            {/* Title */}
            <h1 
              className="relative text-white text-6xl font-bold z-10 ml-12"
              style={{ 
                letterSpacing: '0.05em',
                textShadow: '2px 2px 8px rgba(0,0,0,0.5)'
              }}
            >
              FAQ
            </h1>
          </div>

          {/* Category Buttons - Overlapping */}
          <div className="relative px-4 -mt-16 z-20 mb-8">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {faqCategories.map((category) => {
                  const IconComponent = category.icon;
                  const isActive = activeCategory === category.id;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setActiveCategory(category.id)}
                      className={`p-6 rounded-xl transition-all duration-300 flex flex-col items-center justify-center space-y-3 backdrop-blur-sm ${
                        isActive
                          ? 'bg-gray-800 text-white border-2 border-lime-400 shadow-lg'
                          : 'bg-gray-700/90 text-gray-300 border-2 border-transparent hover:bg-gray-800'
                      }`}
                    >
                      <IconComponent className="w-8 h-8" />
                      <span className="text-sm font-semibold text-center">
                        {category.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Customer Service Section */}
        <div className="py-20 px-4 bg-white">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-5xl font-bold mb-8" style={{ letterSpacing: '0.05em' }}>
              Customer Service
            </h2>
            <p className="text-gray-600 text-base leading-relaxed mb-8">
              Everything you need to know about our products<br />
              and how they work. Can't find an answer? Chat with<br />
              our team.<br />
              anytime—we're here to help!
            </p>
            <button className="bg-black text-white px-12 py-3 hover:bg-gray-800 transition text-sm font-semibold" style={{ letterSpacing: '0.05em' }}>
              Chat With Us
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
