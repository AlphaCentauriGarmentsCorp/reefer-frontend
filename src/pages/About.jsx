import { MainLayout } from "../Layouts";
import { Link } from "react-router-dom";
import headerAbout from "../assets/images/Header-Aboutus.jpg";
import seeTheGoal from "../assets/images/See the goal.jpg";
import twoIsAlways from "../assets/images/two is always.jpg";

export default function About() {
  return (
    <MainLayout>
      <div className="bg-white min-h-screen">
        {/* Hero Section with Header Image - No Text */}
        <div 
          className="relative h-[500px] bg-cover bg-center"
          style={{ backgroundImage: `url(${headerAbout})` }}
        >
          <div className="absolute inset-0 bg-black/20" />
        </div>

        {/* Three Card Section - Overlapping Hero */}
        <div className="relative -mt-24 px-4 pb-12 bg-gray-50">
          <div className="max-w-6xl mx-auto pt-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              {/* ABOUT Card */}
              <Link 
                to="/about/profile"
                className="relative group overflow-hidden aspect-[4/3] bg-cover bg-center rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.4)] transition-shadow duration-300"
                style={{ backgroundImage: `url(${headerAbout})` }}
              >
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-xl font-bold border-2 border-white px-8 py-2">
                    ABOUT
                  </span>
                </div>
              </Link>

              {/* VIDEOS Card */}
              <Link 
                to="/about/videos"
                className="relative group overflow-hidden aspect-[4/3] bg-cover bg-center rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.4)] transition-shadow duration-300"
                style={{ backgroundImage: `url(${seeTheGoal})` }}
              >
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-xl font-bold border-2 border-white px-8 py-2">
                    VIDEOS
                  </span>
                </div>
              </Link>

              {/* CONTACT Card */}
              <Link 
                to="/about/contact"
                className="relative group overflow-hidden aspect-[4/3] bg-cover bg-center rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.4)] transition-shadow duration-300"
                style={{ backgroundImage: `url(${twoIsAlways})` }}
              >
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-xl font-bold border-2 border-white px-8 py-2">
                    CONTACT
                  </span>
                </div>
              </Link>
            </div>

            {/* MORE Heading */}
            <div className="text-center pb-8">
              <h1 className="text-6xl font-bold" style={{ letterSpacing: '0.05em' }}>
                MORE
              </h1>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
