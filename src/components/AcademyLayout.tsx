import { ReactNode, useState, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import AcademyHeader from './AcademyHeader';
import Footer from './Footer';

interface AcademyLayoutProps {
  children: ReactNode;
}

const AcademyLayout = ({ children }: AcademyLayoutProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');

  // Keep state in sync with URL search parameter changes
  useEffect(() => {
    const q = searchParams.get('search') || '';
    setSearchQuery(q);
  }, [searchParams]);

  // Update query state and URL parameters if on the courses catalog listing page
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (location.pathname === '/robotics-courses') {
      const newParams = new URLSearchParams(searchParams);
      if (query.trim()) {
        newParams.set('search', query);
      } else {
        newParams.delete('search');
      }
      setSearchParams(newParams);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col bg-background overflow-x-hidden">
      <AcademyHeader searchQuery={searchQuery} onSearchChange={handleSearchChange} />
      <main className="flex-1 flex flex-col w-full max-w-full pt-32 md:pt-24">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default AcademyLayout;
