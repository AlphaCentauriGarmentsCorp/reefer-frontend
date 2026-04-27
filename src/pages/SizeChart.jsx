import { MainLayout } from "../Layouts";
import image106 from "../assets/images/image 106.png";
import image107 from "../assets/images/image 107.png";
import image108 from "../assets/images/image 108.png";
import image109 from "../assets/images/image 109.png";

export default function SizeChart() {
  return (
    <MainLayout>
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="pt-32 pb-12 px-4 text-center">
          <h1 className="text-5xl font-bold tracking-wide" style={{ letterSpacing: '0.05em' }}>
            Size Chart
          </h1>
        </div>

        {/* Content */}
        <div className="py-12 px-4">
          <div className="max-w-4xl mx-auto space-y-12">
            
            {/* Image 106 */}
            <div className="w-full">
              <img 
                src={image106} 
                alt="Size Chart 1" 
                className="w-full h-auto object-contain"
              />
            </div>

            {/* Image 107 */}
            <div className="w-full">
              <img 
                src={image107} 
                alt="Size Chart 2" 
                className="w-full h-auto object-contain"
              />
            </div>

            {/* Image 108 */}
            <div className="w-full">
              <img 
                src={image108} 
                alt="Size Chart 3" 
                className="w-full h-auto object-contain"
              />
            </div>

            {/* Image 109 */}
            <div className="w-full">
              <img 
                src={image109} 
                alt="Size Chart 4" 
                className="w-full h-auto object-contain"
              />
            </div>

          </div>
        </div>
      </div>
    </MainLayout>
  );
}
