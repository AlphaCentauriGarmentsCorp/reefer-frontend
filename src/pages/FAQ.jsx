import { MainLayout } from "../Layouts";
import { useState } from "react";
import { HiQuestionMarkCircle, HiCreditCard, HiShieldCheck, HiUserCircle } from "react-icons/hi";
import headerFaq from "../assets/images/Header-Faq.jpg";

const faqData = {
  general: [
    { q: "What is Reefer Clothing?", a: "Reefer is a streetwear brand based in Quezon City, Philippines, offering unique and stylish apparel." },
    { q: "Where is Reefer Clothing located?", a: "We are located in Quezon City, Metro Manila, Philippines." },
    { q: "What products do you offer?", a: "We offer t-shirts, hoodies, shorts, accessories, and more streetwear items." },
    { q: "Who can wear Reefer Clothing?", a: "Our clothing is designed for anyone who loves streetwear and wants to express their individuality." },
    { q: "How do I choose the right size?", a: "Please refer to our Size Chart page for detailed measurements." }
  ],
  payment: [
    { q: "What payment methods do you accept?", a: "We accept credit cards, debit cards, GCash, PayMaya, and bank transfers." },
    { q: "Are my payment transactions protected?", a: "Yes, all transactions are encrypted and secure." },
    { q: "Will I receive confirmation after placing an order?", a: "Yes, you will receive an email confirmation immediately after your order is placed." },
    { q: "Can I change or update my payment method after ordering?", a: "Please contact our customer service team for assistance with payment changes." },
    { q: "Are there additional charges I should be aware of?", a: "Shipping fees may apply depending on your location. All charges are shown at checkout." }
  ],
  safety: [
    { q: "Is my personal information safe with Reefer?", a: "Yes, we use industry-standard security measures to protect your data." },
    { q: "Are your payment methods safe to use?", a: "All payment methods are processed through secure, encrypted channels." },
    { q: "Will my personal data be shared with third parties?", a: "We do not share your personal information with third parties without your consent." },
    { q: "Is your website protected from security threats?", a: "Yes, our website uses SSL encryption and regular security updates." },
    { q: "How do you protect my account from unauthorized access?", a: "We use password encryption and recommend enabling two-factor authentication." }
  ],
  account: [
    { q: "How do I create an account?", a: "Click on the profile icon and select 'Sign Up' to create your account." },
    { q: "How can I update my personal information?", a: "Log in to your account and go to Profile Settings to update your information." },
    { q: "What should I do if I forget my password?", a: "Click 'Forgot Password' on the login page and follow the instructions." },
    { q: "How will I stay updated on my orders?", a: "You will receive email notifications for order confirmations, shipping updates, and delivery." },
    { q: "Can I manage or cancel my orders through my account?", a: "Yes, you can view and manage your orders in the Orders section of your account." }
  ]
};

export default function FAQ() {
  const [activeCategory, setActiveCategory] = useState(null);
  const [openQuestion, setOpenQuestion] = useState(null);

  const categories = [
    { id: 'general', name: 'General Question', icon: <HiQuestionMarkCircle /> },
    { id: 'payment', name: 'Payment & Billing', icon: <HiCreditCard /> },
    { id: 'safety', name: 'Safety & Security', icon: <HiShieldCheck /> },
    { id: 'account', name: 'Account & Update', icon: <HiUserCircle /> }
  ];

  const toggleQuestion = (index) => {
    setOpenQuestion(openQuestion === index ? null : index);
  };

  return (
    <MainLayout>
      <div className="bg-white">
        {/* Hero Section */}
        <div 
          className="relative h-[500px] bg-cover bg-center"
          style={{ backgroundImage: `url(${headerFaq})` }}
        >
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute bottom-32 left-8 md:left-16">
            <h1 className="text-white text-5xl md:text-7xl font-bold tracking-wide">
              FAQ
            </h1>
          </div>
        </div>

        {/* Category Cards - Overlapping Hero */}
        <div className="relative -mt-24 px-4 mb-20 bg-white">
          <div className="max-w-6xl mx-auto pt-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`text-white p-8 rounded-2xl transition-all duration-300 shadow-[0_8px_24px_rgba(0,0,0,0.15)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.25)] ${
                    activeCategory === cat.id ? 'border-2 border-reefer-orange' : 'border-2 border-transparent'
                  }`}
                  style={{ backgroundColor: '#616161' }}
                >
                  <div className="text-5xl mb-4 text-white flex justify-center items-center">{cat.icon}</div>
                  <h3 className={`font-semibold text-base text-center ${activeCategory === cat.id ? 'text-reefer-orange' : 'text-white'}`}>
                    {cat.name}
                  </h3>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Customer Service Section */}
        <div className="px-4 mb-12 mt-16">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Customer Service</h2>
            <p className="text-gray-600 text-sm md:text-base leading-relaxed">
              Everything you need to know about our products<br />
              and how they work. Can't find an answer? Chat with<br />
              our team,<br />
              anytime—we're here to help!
            </p>
          </div>
        </div>

        {/* FAQ Accordion */}
        {activeCategory && (
          <div className="px-4 pb-16">
            <div className="max-w-3xl mx-auto">
              <div className="space-y-2">
                {faqData[activeCategory].map((faq, index) => (
                <div
                  key={index}
                  className="bg-[#3a3a3a] text-white rounded-lg overflow-hidden transition-all border-l-4 border-reefer-orange"
                >
                  <button
                    onClick={() => toggleQuestion(index)}
                    className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-[#4a4a4a] transition text-left"
                  >
                    <span className="font-medium text-sm pr-4">{faq.q}</span>
                    <span className="text-xl flex-shrink-0 font-light">
                      {openQuestion === index ? '−' : '+'}
                    </span>
                  </button>
                  {openQuestion === index && (
                    <div className="px-5 pb-3.5 pt-1 text-gray-300 text-xs leading-relaxed">
                      {faq.a}
                    </div>
                  )}
                </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
