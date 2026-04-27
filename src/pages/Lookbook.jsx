import { MainLayout } from "../Layouts";

export default function Lookbook() {
  return (
    <MainLayout>
      <div className="min-h-screen bg-white">
        {/* Header with proper spacing */}
        <div className="pt-32 pb-16 px-4 text-center">
          <h1 className="text-6xl font-bold tracking-wide" style={{ letterSpacing: '0.05em' }}>
            Lookbook
          </h1>
        </div>

        {/* Lookbook Content Area */}
        <div className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            {/* Placeholder for lookbook content */}
            <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center">
              <p className="text-gray-500 text-lg">Lookbook content coming soon...</p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
