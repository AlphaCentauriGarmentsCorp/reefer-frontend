import { MainLayout } from "../Layouts";
import { Link } from "react-router-dom";
import headerAbout from "../assets/images/Header-Aboutus.jpg";
import seeTheGoal from "../assets/images/See the goal.jpg";
import twoIsAlways from "../assets/images/two is always.jpg";
import reefer1 from "../assets/images/reefer1.jpg";
import reefer3 from "../assets/images/reefer3.jpg";
import reefer4 from "../assets/images/reefer4.jpg";
import reefer5 from "../assets/images/reefer5.jpg";
import reefer6 from "../assets/images/reefer6.jpg";
import reefer7 from "../assets/images/reefer7.jpg";

export default function AboutVideos() {
  const videoThumbnails = [reefer1, reefer3, reefer4, reefer5, reefer6, reefer7];

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
          className="relative h-80 bg-cover bg-center flex flex-col items-start justify-center px-12"
          style={{ backgroundImage: `url(${seeTheGoal})` }}
        >
          <div className="absolute inset-0 bg-black/50" />
          <h1 className="relative text-white text-5xl font-bold z-10 mb-2" style={{ letterSpacing: '0.05em' }}>
            Videos
          </h1>
          <p className="relative text-white text-lg z-10">reels</p>
        </div>

        {/* VIDEOS Section */}
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-5xl font-bold mb-12">VIDEOS</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              {videoThumbnails.map((thumbnail, index) => (
                <div key={index} className="relative aspect-video bg-gray-900 overflow-hidden group cursor-pointer">
                  <img 
                    src={thumbnail}
                    alt={`Video ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition">
                    <div className="w-20 h-20 bg-white/90 rounded-full flex items-center justify-center">
                      <svg className="w-10 h-10 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* MORE Link */}
            <div className="text-center">
              <Link to="/about" className="text-2xl font-bold border-b-2 border-black pb-1 hover:text-gray-600 transition">
                MORE
              </Link>
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
