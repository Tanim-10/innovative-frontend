import { Link } from 'react-router-dom';
import { Zap, MonitorPlay, Settings, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SEO from '@/components/SEO';

const offerings = [
  {
    icon: Zap,
    title: 'E-Shop for Components',
    description: 'Explore a vast catalog of high-quality electrical and electronic components for your projects.',
    path: '/eshop',
    hoverColor: 'hover:border-green-500',
  },
  {
    icon: MonitorPlay,
    title: 'Robotics Courses & Tutorials',
    description: 'Learn robotics from the ground up with our comprehensive video courses and step-by-step guides.',
    path: '/robotics-courses',
    hoverColor: 'hover:border-primary',
  },
  {
    icon: Settings,
    title: 'Project Kits & Consultation',
    description: 'Get everything you need in one kit. We also offer expert consultation for your custom projects.',
    path: '/project-kits',
    hoverColor: 'hover:border-primary',
  },
  {
    icon: MessageCircle,
    title: 'Resource and Ideas Hub',
    description: 'A knowledge-sharing hub filled with innovative ideas, project inspirations, research insights, and community discussions to spark creativity.',
    path: 'https://idea-hub-frontend-mu.vercel.app/',
    isExternal: true,
    hoverColor: 'hover:border-primary',
  },
];

const HomePage = () => {
  const homePageJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: 'Innovative Hub',
        url: 'https://inovative-hub.com/',
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://inovative-hub.com/eshop/products?search={search_term_string}',
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Organization',
        name: 'Innovative Hub',
        url: 'https://inovative-hub.com/',
      },
    ],
  });

  return (
    <>
      <SEO
        title="Robotics, IoT & Embedded Systems in Odisha"
        description="Your all-in-one innovation platform for robotics, IoT, and embedded systems. Shop components, kits, and tutorials — tools, knowledge, and community to turn ideas into real-world solutions."
        path="/"
        jsonLd={[homePageJsonLd]}
      />
      <section className="relative min-h-screen flex flex-col overflow-x-hidden overflow-y-visible" aria-label="Home">
        {/* Video Background - covers entire section */}
        <div className="absolute inset-0 z-0">
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="w-full h-full object-cover"
            aria-hidden="true"
          >
            <source src="/videos/hero-video.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-black/60" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center container mx-auto px-4 text-center py-12">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 animate-fade-in italic">
            Innovative Hub
          </h1>
          <p className="text-sm md:text-base text-gray-300 max-w-2xl mx-auto mb-8 animate-fade-in px-4" style={{ animationDelay: '0.2s' }}>
            Your all-in-one innovation platform for robotics, IoT, and embedded systems. We provide the tools, knowledge, and community to transform your ideas into real-world solutions.
          </p>
          <div className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <Link to="/eshop">
              <Button 
                size="lg" 
                className="px-10 py-6 text-base md:text-lg font-semibold rounded-full bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Explore Products
              </Button>
            </Link>
          </div>
        </div>

        {/* Core Offerings - within the same video background */}
        <div className="relative z-10 container mx-auto px-4 pb-16 md:pb-20">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-white mb-8">
            Our Core Offerings
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {offerings.map((offering) => {
              const cardContent = (
                <div className={`h-full bg-[#1a2332]/80 backdrop-blur-sm border-2 border-transparent rounded-xl p-6 transition-all duration-300 ${offering.hoverColor} hover:bg-[#1a2332]`}>
                  <div className="flex flex-col items-center text-center h-full">
                    <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/30 transition-colors">
                      <offering.icon className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-3">
                      {offering.title}
                    </h3>
                    <p className="text-sm text-gray-400 leading-relaxed flex-1">
                      {offering.description}
                    </p>
                  </div>
                </div>
              );

              if (offering.isExternal) {
                return (
                  <a
                    key={offering.title}
                    href={offering.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block"
                  >
                    {cardContent}
                  </a>
                );
              }

              return (
                <Link
                  key={offering.title}
                  to={offering.path}
                  className="group block"
                >
                  {cardContent}
                </Link>
              );
            })}
          </div>

          <nav
            aria-label="Popular pages"
            className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-gray-300"
          >
            <Link to="/eshop/products" className="hover:text-white underline underline-offset-4">
              Shop all products
            </Link>
            <Link to="/about" className="hover:text-white underline underline-offset-4">
              About Innovative Hub
            </Link>
            <Link to="/contact" className="hover:text-white underline underline-offset-4">
              Contact us
            </Link>
            <Link to="/faq" className="hover:text-white underline underline-offset-4">
              FAQ
            </Link>
            <Link to="/order-tracking" className="hover:text-white underline underline-offset-4">
              Track your order
            </Link>
          </nav>
        </div>
      </section>
    </>
  );
};

export default HomePage;
