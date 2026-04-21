import { Link } from "react-router-dom";
import reefer1Background from "../../assets/images/reefer1.jpg";

export default function HeroSection() {
  return (
    <section className="relative h-screen w-full">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-no-repeat"
        style={{
          backgroundImage: `url(${reefer1Background})`,
          backgroundPosition: '50% 30%',
        }}
      >
        <div className="absolute inset-0 bg-black/60" />
      </div>
      
      {/* Content Overlay - Removed all text content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-white px-4">
        {/* Just background visible - no content */}
      </div>
    </section>
  );
}
