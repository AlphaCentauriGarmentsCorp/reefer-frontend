import { Link } from "react-router-dom";

export default function GoalBanner() {
  return (
    <section 
      className="relative h-[500px] bg-cover bg-center"
      style={{
        backgroundImage: "url('https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1920&q=80')",
      }}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-white px-4">
        <h2 className="text-6xl md:text-8xl font-bold text-center leading-tight">
          See the goal
        </h2>
        <h2 className="text-6xl md:text-8xl font-bold text-center leading-tight my-3">
          and
        </h2>
        <h2 className="text-6xl md:text-8xl font-bold text-center leading-tight mb-10">
          chase the prize
        </h2>
        
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
