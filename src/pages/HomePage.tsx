import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Zap, MonitorPlay, Settings, MessageCircle, Calendar, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SEO from '@/components/SEO';
import { workshopsApi, Workshop } from '@/services/api';

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
    path: '/resources',
    isExternal: false,
    hoverColor: 'hover:border-primary',
  },
];

const HomePage = () => {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWorkshops = async () => {
      try {
        const res = await workshopsApi.getAll({ homepage: true });
        if (res.success) {
          // Sort by date ascending (soonest first)
          const sorted = [...res.data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          setWorkshops(sorted.slice(0, 3));
        }
      } catch (err) {
        console.error('Failed to fetch workshops:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchWorkshops();
  }, []);

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
      <section className="relative min-h-screen flex flex-col overflow-x-hidden overflow-y-visible pb-12" aria-label="Home">
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
          <div className="absolute inset-0 bg-black/65" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-4 text-center pt-24 pb-6 md:pt-32 md:pb-8">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 animate-fade-in italic">
            Innovative Hub
          </h1>
          <p className="text-sm md:text-base text-gray-300 max-w-2xl mx-auto mb-0 animate-fade-in px-4" style={{ animationDelay: '0.2s' }}>
            Your all-in-one innovation platform for robotics, IoT, and embedded systems. We provide the tools, knowledge, and community to transform your ideas into real-world solutions.
          </p>
        </div>

        {/* Core Offerings - within the same video background */}
        <div className="relative z-10 container mx-auto px-4 pb-16">
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
        </div>

        {/* Upcoming Workshops Section */}
        <div className="relative z-10 container mx-auto px-4 pb-12 pt-8 border-t border-border/20">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-white mb-2">
            Upcoming Live Workshops
          </h2>
          <p className="text-center text-xs sm:text-sm text-gray-400 mb-8 max-w-md mx-auto">
            Join our live, interactive engineering and robotics workshops hosted by industry experts.
          </p>

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : workshops.length === 0 ? (
            <div className="text-center py-10 bg-[#1a2332]/40 border border-border/40 rounded-xl max-w-sm mx-auto p-6">
              <Calendar className="w-8 h-8 mx-auto text-gray-500 mb-2" />
              <p className="text-sm text-gray-400">No upcoming workshops scheduled at the moment.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {workshops.map((w) => (
                  <Link 
                    key={w._id}
                    to={`/workshop/${w._id}`}
                    className="bg-[#1a2332]/60 backdrop-blur-sm border border-border/40 p-4 rounded-xl flex flex-col justify-between hover:border-primary/50 transition-all duration-300 hover:bg-[#1a2332]/80 group text-left"
                  >
                    <div>
                      {w.thumbnail ? (
                        <div className="w-full h-32 rounded-lg overflow-hidden mb-3.5">
                          <img src={w.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt={w.title} />
                        </div>
                      ) : (
                        <div className="w-full h-32 bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-lg flex items-center justify-center mb-3.5">
                          <Calendar className="w-6 h-6 text-primary/60" />
                        </div>
                      )}
                      <h3 className="text-sm font-bold text-white line-clamp-1 mb-1.5 group-hover:text-primary transition-colors" title={w.title}>
                        {w.title}
                      </h3>
                      <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed mb-4">
                        {w.description}
                      </p>
                    </div>

                    <div className="space-y-1.5 text-[11px] text-gray-400 border-t border-border/20 pt-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        <span>{new Date(w.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        <span>{w.time} ({w.duration})</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="text-center mt-10">
                <Link to="/workshops">
                  <Button variant="outline" className="rounded-full border-primary/40 hover:border-primary text-primary hover:text-white font-semibold gap-2 px-6">
                    View All Workshops
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
};

export default HomePage;
