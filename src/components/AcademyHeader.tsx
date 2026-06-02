import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { User, Search, GraduationCap, ArrowRight, LayoutDashboard, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '../context/AuthContext';
import LogoMark from '@/components/LogoMark';

interface AcademyHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const AcademyHeader = ({ searchQuery, onSearchChange }: AcademyHeaderProps) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (location.pathname !== '/robotics-courses') {
      navigate(`/robotics-courses?search=${encodeURIComponent(q)}`);
    }
  };

  // Render Tutor action button dynamically
  const renderTutorButton = () => {
    if (isAuthenticated && user) {
      if (user.role === 'tutor') {
        return (
          <Link to="/tutor-dashboard">
            <Button variant="outline" size="sm" className="gap-1.5 rounded-full border-primary/50 text-primary hover:bg-primary/10 text-xs sm:text-sm">
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Tutor Dashboard</span>
            </Button>
          </Link>
        );
      }
      if (user.tutorStatus === 'pending') {
        return (
          <Button variant="ghost" size="sm" className="gap-1.5 rounded-full text-xs sm:text-sm text-yellow-500/80 hover:text-yellow-500 bg-yellow-500/5 hover:bg-yellow-500/10 cursor-default" disabled>
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            <span>Pending Application</span>
          </Button>
        );
      }
    }

    return (
      <Link to={isAuthenticated ? "/tutor-registration" : "/login?redirect=/tutor-registration"}>
        <Button variant="ghost" size="sm" className="gap-1 text-xs sm:text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-full">
          <span>Become a Tutor</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </Link>
    );
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-[#0d1520]/95 backdrop-blur-sm border-b border-white/10 shadow-sm text-white">
      <div className="container mx-auto px-4">
        {/* Header grid: 3-column responsive layout */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3 md:py-0 md:h-20 gap-3 md:gap-4">
          <div className="flex items-center justify-between md:justify-start gap-4">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 shrink-0">
              <LogoMark variant="navDark" priority />
              <span className="text-base sm:text-lg font-bold text-white tracking-tight leading-none">
                Innovative <span className="text-primary">Hub</span>
              </span>
            </Link>
            
            {/* Section label for Academy */}
            <span className="hidden sm:inline-block px-2.5 py-0.5 border border-primary/20 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider rounded">
              Academy
            </span>
          </div>

          {/* Search bar centered */}
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-lg w-full mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white/5 border-white/10 text-white placeholder-gray-400 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 rounded-full w-full text-sm"
            />
          </form>

          {/* Actions on right */}
          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
            {renderTutorButton()}

            <Link to="/account">
              <Button variant="default" size="sm" className="gap-1.5 rounded-full px-4 text-xs sm:text-sm bg-primary hover:bg-primary/90 text-white font-medium">
                <User className="w-3.5 h-3.5" />
                <span>My Account</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AcademyHeader;
