import { MainLayout } from "../Layouts";
import { Link } from "react-router-dom";
import headerAbout from "../assets/images/Header-Aboutus.jpg";
import seeTheGoal from "../assets/images/See the goal.jpg";
import twoIsAlways from "../assets/images/two is always.jpg";
import reefer8 from "../assets/images/reefer8.jpg";

export default function AboutContact() {
  return (
    <MainLayout>
      <div className="bg-white">
        {/* Three Card Section - Small at top */}
        <div className="pt-20 pb-4 px-4 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-3 gap-4">
              <Link to="/about/profile" className="relative aspect-[4/3] bg-cover bg-center rounded" style={{ backgroundImage: `url(${headerAbout})` }}>
                <div className="absolute inset-0 bg-black/30" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-sm font-bold border border-white px-4 py-1">ABOUT</span>
                </div>
              </Link>
              <Link to="/about/videos" className="relative aspect-[4/3] bg-cover bg-center rounded" style={{ backgroundImage: `url(${seeTheGoal})` }}>
                <div className="absolute inset-0 bg-black/30" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-sm font-bold border border-white px-4 py-1">VIDEOS</span>
                </div>
              </Link>
              <Link to="/about/contact" className="relative aspect-[4/3] bg-cover bg-center rounded" style={{ backgroundImage: `url(${twoIsAlways})` }}>
                <div className="absolute inset-0 bg-black/30" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-sm font-bold border border-white px-4 py-1">CONTACT</span>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Hero Banner */}
        <div 
          className="relative h-80 bg-cover bg-center flex items-center justify-start px-12"
          style={{ backgroundImage: `url(${twoIsAlways})` }}
        >
          <div className="absolute inset-0 bg-black/40" />
          <h1 className="relative text-white text-5xl font-bold z-10" style={{ letterSpacing: '0.05em' }}>
            Contact
          </h1>
        </div>

        {/* CONTACT Section */}
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-5xl font-bold mb-6">Contact us</h2>
            <p className="text-gray-600 mb-12 text-lg">
              "Your style is personal, and so is our service. Whether you need help with an order or just want to know more, we're always here to connect with you."
            </p>

            <div className="grid md:grid-cols-2 gap-16">
              {/* Left - Contact Info */}
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-bold mb-3">Email</h3>
                  <p className="text-gray-600 text-sm mb-3 leading-relaxed">
                    If you need support or want to know more about our products, feel free to reach out. We're here to help!
                  </p>
                  <a href="mailto:sales@alphacentauri.ph" className="text-blue-600 hover:underline font-medium">
                    sales@alphacentauri.ph
                  </a>
                </div>

                <div>
                  <h3 className="text-xl font-bold mb-3">Phone</h3>
                  <p className="text-gray-600 text-sm mb-3 leading-relaxed">
                    Have a question or need immediate help? Give us a call and we'll be happy to assist you.
                  </p>
                  <a href="tel:+639614427409" className="text-blue-600 hover:underline font-medium">
                    +63 961 442 7409
                  </a>
                </div>

                <div>
                  <h3 className="text-xl font-bold mb-3">Business Hours:</h3>
                  <ul className="text-gray-600 text-sm space-y-1">
                    <li>• Monday to Friday: 8 am to 5 pm</li>
                    <li>• Closed on Holiday Season</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-bold mb-3">Company location</h3>
                  <p className="text-gray-600 text-sm">
                    123 Mahoe Jansio Ave, Diliman, Quezon City, Metro Manila
                  </p>
                </div>
              </div>

              {/* Right - Contact Form */}
              <div>
                <form className="space-y-4">
                  <input
                    type="email"
                    placeholder="Enter your Email"
                    className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-500 text-sm"
                  />
                  <textarea
                    placeholder="If you have any questions or need any Assistant"
                    rows="8"
                    className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-500 text-sm resize-none"
                  />
                  <button
                    type="submit"
                    className="w-full bg-black text-white py-3 font-semibold hover:bg-gray-800 transition text-sm"
                  >
                    Send Message
                  </button>
                </form>
              </div>
            </div>

            {/* Map */}
            <div className="mt-16">
              <img 
                src={reefer8} 
                alt="Location Map" 
                className="w-full object-cover"
              />
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
