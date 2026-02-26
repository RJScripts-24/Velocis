import './LogoCarousel.css';

const logos = [
    {
        name: 'Unmind',
        svg: (
            <svg viewBox="0 0 120 40" fill="currentColor" className="h-8 w-auto px-4 text-gray-400 hover:text-gray-900 transition-colors">
                <text x="0" y="28" fontFamily="serif" fontSize="26" fontWeight="bold">Unmind</text>
            </svg>
        )
    },
    {
        name: 'Glovo',
        svg: (
            <svg viewBox="0 0 100 40" fill="currentColor" className="h-8 w-auto px-4 text-gray-400 hover:text-gray-900 transition-colors">
                <text x="0" y="28" fontFamily="sans-serif" fontSize="26" fontWeight="bold" letterSpacing="-1">Glovo</text>
                <circle cx="85" cy="12" r="4" fill="currentColor" />
            </svg>
        )
    },
    {
        name: 'texthelp',
        svg: (
            <svg viewBox="0 0 130 40" fill="currentColor" className="h-8 w-auto px-4 text-gray-400 hover:text-gray-900 transition-colors">
                <path d="M5 10 h15 v12 h-15 z" fill="currentColor" />
                <text x="25" y="26" fontFamily="sans-serif" fontSize="24" fontWeight="600" letterSpacing="-0.5">texthelp</text>
            </svg>
        )
    },
    {
        name: 'paddle',
        svg: (
            <svg viewBox="0 0 110 40" fill="currentColor" className="h-8 w-auto px-4 text-gray-400 hover:text-gray-900 transition-colors">
                <text x="0" y="28" fontFamily="sans-serif" fontSize="25" fontWeight="500">paddle</text>
            </svg>
        )
    },
    {
        name: 'Qonto',
        svg: (
            <svg viewBox="0 0 100 40" fill="currentColor" className="h-8 w-auto px-4 text-gray-400 hover:text-gray-900 transition-colors">
                <text x="0" y="28" fontFamily="sans-serif" fontSize="26" fontWeight="bold">Qonto</text>
            </svg>
        )
    }
];

export default function LogoCarousel() {
    // Duplicate the logos array to create a seamless infinite loop
    const carouselLogos = [...logos, ...logos, ...logos];

    return (
        <section className="w-full bg-white py-12 overflow-hidden border-b border-gray-200">
            <div className="max-w-[1200px] mx-auto px-4 mb-10 text-center reveal">
                <p className="text-[17px] font-semibold text-[#151515]">
                    Teams use Prismic's headless CMS and landing page builder to build and automate websites that convert.
                </p>
            </div>

            <div className="logo-carousel-container relative w-full flex overflow-hidden reveal delay-2">
                {/* Fade edges */}
                <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
                <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>

                {/* Track */}
                <div className="logo-carousel-track flex items-center min-w-max">
                    {carouselLogos.map((logo, index) => (
                        <div key={index} className="flex-none mx-5 transition-transform duration-300 hover:scale-105">
                            {logo.svg}
                        </div>
                    ))}
                </div>
            </div>
        </section >
    );
}
