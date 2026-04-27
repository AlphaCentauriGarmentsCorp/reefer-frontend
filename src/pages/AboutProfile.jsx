import { MainLayout } from "../Layouts";
import { Link } from "react-router-dom";
import headerAbout from "../assets/images/Header-Aboutus.jpg";
import seeTheGoal from "../assets/images/See the goal.jpg";
import twoIsAlways from "../assets/images/two is always.jpg";
import reefer3 from "../assets/images/reefer3.jpg";
import reefer4 from "../assets/images/reefer4.jpg";
import reefer5 from "../assets/images/reefer5.jpg";

export default function AboutProfile() {
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
          style={{ backgroundImage: `url(${headerAbout})` }}
        >
          <div className="absolute inset-0 bg-black/50" />
          <h1 className="relative text-white text-5xl font-bold z-10" style={{ letterSpacing: '0.05em' }}>
            PROFILE
          </h1>
        </div>

        {/* BACKGROUND Section */}
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-5xl font-bold mb-12">BACKGROUND</h2>
            <div className="space-y-6 text-gray-700 leading-relaxed text-base">
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              </p>
              <p>
                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
              </p>
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
              </p>
            </div>

            {/* Team Photo */}
            <div className="mt-12">
              <img 
                src={reefer3} 
                alt="Team" 
                className="w-full object-cover"
              />
            </div>

            {/* OUR PURPOSE */}
            <div className="mt-20">
              <h2 className="text-5xl font-bold mb-12">OUR PURPOSE</h2>
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <h3 className="text-2xl font-bold mb-4 leading-tight">
                    To inspire self-expression through clothing and build a community where style, creativity, and individuality come together.
                  </h3>
                </div>
                <div>
                  <img 
                    src={reefer4} 
                    alt="Purpose" 
                    className="w-full object-cover"
                  />
                </div>
              </div>
            </div>

            {/* OUR MISSION */}
            <div className="mt-20">
              <h2 className="text-5xl font-bold mb-12">OUR MISSION</h2>
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <img 
                    src={reefer5} 
                    alt="Mission" 
                    className="w-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-4 leading-tight">
                    To create affordable, stylish, and comfortable streetwear that allows people to express themselves confidently in their everyday lives.
                  </h3>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
