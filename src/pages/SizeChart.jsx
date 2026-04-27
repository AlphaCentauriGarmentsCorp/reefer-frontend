import { MainLayout } from "../Layouts";

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
          <div className="max-w-6xl mx-auto space-y-16">
            
            {/* Regular Fit Tee */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="bg-gray-100 h-80 rounded-lg flex items-center justify-center">
                <p className="text-gray-400">Regular Fit Tee Diagram</p>
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-4">Updated Regular Fit Tee</h3>
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-2 text-left">Size</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Length</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Width</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">S</td>
                      <td className="border border-gray-300 px-4 py-2">28"</td>
                      <td className="border border-gray-300 px-4 py-2">20"</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">M</td>
                      <td className="border border-gray-300 px-4 py-2">29"</td>
                      <td className="border border-gray-300 px-4 py-2">22"</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">L</td>
                      <td className="border border-gray-300 px-4 py-2">30"</td>
                      <td className="border border-gray-300 px-4 py-2">24"</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">XL</td>
                      <td className="border border-gray-300 px-4 py-2">30.3"</td>
                      <td className="border border-gray-300 px-4 py-2">26"</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">XXL</td>
                      <td className="border border-gray-300 px-4 py-2">31"</td>
                      <td className="border border-gray-300 px-4 py-2">28"</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Box Fit Tee */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="bg-gray-100 h-80 rounded-lg flex items-center justify-center">
                <p className="text-gray-400">Box Fit Tee Diagram</p>
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-4">Updated Box Fit Tee</h3>
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-2 text-left">Size</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Length</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Width</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Shoulder</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Sleeve</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">S</td>
                      <td className="border border-gray-300 px-4 py-2">26.4"</td>
                      <td className="border border-gray-300 px-4 py-2">20"</td>
                      <td className="border border-gray-300 px-4 py-2">17.3"</td>
                      <td className="border border-gray-300 px-4 py-2">9"</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">M</td>
                      <td className="border border-gray-300 px-4 py-2">27.6"</td>
                      <td className="border border-gray-300 px-4 py-2">22"</td>
                      <td className="border border-gray-300 px-4 py-2">18.5"</td>
                      <td className="border border-gray-300 px-4 py-2">9.5"</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">L</td>
                      <td className="border border-gray-300 px-4 py-2">28.4"</td>
                      <td className="border border-gray-300 px-4 py-2">23"</td>
                      <td className="border border-gray-300 px-4 py-2">19.8"</td>
                      <td className="border border-gray-300 px-4 py-2">10"</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">XL</td>
                      <td className="border border-gray-300 px-4 py-2">29.5"</td>
                      <td className="border border-gray-300 px-4 py-2">27"</td>
                      <td className="border border-gray-300 px-4 py-2">20.5"</td>
                      <td className="border border-gray-300 px-4 py-2">10.5"</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Oversized Tee */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="bg-gray-100 h-80 rounded-lg flex items-center justify-center">
                <p className="text-gray-400">Oversized Tee Diagram</p>
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-4">Oversized Tee</h3>
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-2 text-left">Size</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">A</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">B</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">S</td>
                      <td className="border border-gray-300 px-4 py-2">28"</td>
                      <td className="border border-gray-300 px-4 py-2">20"</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">M</td>
                      <td className="border border-gray-300 px-4 py-2">29.5"</td>
                      <td className="border border-gray-300 px-4 py-2">23"</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">L</td>
                      <td className="border border-gray-300 px-4 py-2">31"</td>
                      <td className="border border-gray-300 px-4 py-2">24"</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">XL</td>
                      <td className="border border-gray-300 px-4 py-2">32.5"</td>
                      <td className="border border-gray-300 px-4 py-2">24"</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sweat Pants */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="bg-gray-100 h-80 rounded-lg flex items-center justify-center">
                <p className="text-gray-400">Sweat Pants Diagram</p>
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-4">DBTK Sweat Pants</h3>
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-2 text-left">Size</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Length</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Waist</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">S</td>
                      <td className="border border-gray-300 px-4 py-2">38"</td>
                      <td className="border border-gray-300 px-4 py-2">28"</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">M</td>
                      <td className="border border-gray-300 px-4 py-2">39"</td>
                      <td className="border border-gray-300 px-4 py-2">30"</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">L</td>
                      <td className="border border-gray-300 px-4 py-2">40"</td>
                      <td className="border border-gray-300 px-4 py-2">32"</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">XL</td>
                      <td className="border border-gray-300 px-4 py-2">41"</td>
                      <td className="border border-gray-300 px-4 py-2">34"</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      </div>
    </MainLayout>
  );
}
