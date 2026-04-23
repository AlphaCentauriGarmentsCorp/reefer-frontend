import { Link } from "react-router-dom";
import reefer8 from "../../assets/images/reefer8.jpg";

export default function PartnershipBanner() {
  return (
    <section 
      className="relative h-[550px] md:h-[600px] bg-cover bg-center"
      style={{
        backgroundImage: `url(${reefer8})`,
      }}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-white px-4">
        <div className="text-center mb-10">
          <h2 className="text-6xl md:text-8xl font-black leading-tight" style={{ fontWeight: 900 }}>
            Two is always
          </h2>
          <h2 className="text-6xl md:text-8xl font-black leading-tight my-2" style={{ fontWeight: 900 }}>
            better
          </h2>
          <h2 className="text-6xl md:text-8xl font-black leading-tight" style={{ fontWeight: 900 }}>
            than one
          </h2>
        </div>
        
        {/* Diamond Navigation Dots */}
        <div className="flex space-x-3 mb-8">
          <div className="w-3 h-3 bg-white transform rotate-45"></div>
          <div className="w-3 h-3 bg-white/50 transform rotate-45"></div>
          <div className="w-3 h-3 bg-white/50 transform rotate-45"></div>
          <div className="w-3 h-3 bg-white/50 transform rotate-45"></div>
          <div className="w-3 h-3 bg-white/50 transform rotate-45"></div>
          <div className="w-3 h-3 bg-white/50 transform rotate-45"></div>
        </div>
        
        <Link 
          to="/shop"
          className="border-3 border-white text-white font-black px-12 py-4 hover:bg-white hover:text-black transition duration-300 text-lg tracking-wider"
          style={{ fontWeight: 900, borderWidth: '3px' }}
        >
          SHOP NOW
        </Link>
      </div>
    </section>
  );
}
