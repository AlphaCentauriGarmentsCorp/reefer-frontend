import { Link } from "react-router-dom";

export default function HeroSection() {
  return (
    <section className="relative h-screen w-full">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=1920&q=80')",
        }}
      >
        <div className="absolute inset-0 bg-black/40" />
      </div>
      
      {/* Content Overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-white px-4">
        <h1 className="text-7xl md:text-9xl font-bold tracking-wider mb-6" style={{ fontFamily: 'Impact, sans-serif', letterSpacing: '0.1em' }}>
          247 Hustle
        </h1>
        <p className="text-xl md:text-2xl mb-12 tracking-wide">
          NEVER STOP GRINDING
        </p>
        <Link 
          to="/shop"
          className="bg-transparent border-2 border-white hover:bg-white hover:text-black text-white font-bold px-12 py-4 transition duration-300 text-lg"
        >
          SHOP NOW
        </Link>
      </div>
    </section>
  );
}
