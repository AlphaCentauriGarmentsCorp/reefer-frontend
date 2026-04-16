const reviews = [
  {
    id: 1,
    text: "What our customers are saying",
    author: "NAME",
    role: "ROLE"
  },
  {
    id: 2,
    text: "What our customers are saying",
    author: "NAME",
    role: "ROLE"
  },
  {
    id: 3,
    text: "What our customers are saying",
    author: "NAME",
    role: "ROLE"
  }
];

export default function ReviewsSection() {
  return (
    <section className="py-20 px-4 bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm text-gray-400 mb-2">CUSTOMER FEEDBACK</p>
          <h2 className="text-4xl font-bold text-white">REVIEWS</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Large Quote Icon */}
          <div className="hidden md:flex items-start justify-center">
            <svg className="w-32 h-32 text-white opacity-20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/>
            </svg>
          </div>

          {/* Review Cards */}
          {reviews.map((review) => (
            <div 
              key={review.id}
              className="border border-gray-700 p-8 flex flex-col justify-between min-h-[300px]"
            >
              {/* Quote Icon */}
              <div className="mb-6">
                <svg className="w-12 h-12 text-white opacity-50" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/>
                </svg>
              </div>
              
              {/* Review Text */}
              <p className="text-white text-lg font-semibold mb-8 text-center">
                {review.text}
              </p>
              
              {/* Author Info */}
              <div className="text-center border-t border-gray-700 pt-4">
                <p className="text-white font-semibold text-sm">{review.author}</p>
                <p className="text-gray-400 text-xs">{review.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
