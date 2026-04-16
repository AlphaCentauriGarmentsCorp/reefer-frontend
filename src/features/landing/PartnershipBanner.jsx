import { Link } from "react-router-dom";

export default function PartnershipBanner() {
  return (
    <section 
      className="relative h-[500px] bg-cover bg-center"
      style={{
        backgroundImage: "url('https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=1920&q=80')",
      }}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-white px-4">
        <div className="text-center mb-10">
          <h2 className="text-6xl md:text-8xl font-bold leading-tight">
            Two is always
          </h2>
          <h2 className="text-6xl md:text-8xl font-bold leading-tight my-2">
            better
          </h2>
          <h2 className="text-6xl md:text-8xl font-bold leading-tight">
            than one
          </h2>
        </div>
        
        <Link 
          to="/shop"
          className="border-2 border-white text-white font-bold px-10 py-3 hover:bg-white hover:text-black transition duration-300 text-base tracking-wider"
        >
          SHOP NOW
        </Link>
      </div>
    </section>
  );
}
