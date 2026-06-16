import { Link } from 'react-router-dom';
import { Facebook, Instagram, Linkedin, ExternalLink } from 'lucide-react';

const Footer = () => {
  const quickLinks = [
    { name: 'Home', path: '/' },
    { name: 'Products', path: '/eshop' },
    { name: 'Workshops', path: '/workshops' },
    { name: 'Internships', path: '/internships' },
  ];

  const companyLinks = [
    { name: 'About Us', path: '/about' },
    { name: 'Contact Us', path: '/contact' },
    { name: 'FAQ', path: '/faq' },
    { name: 'Gallery', path: '/gallery' },
  ];

  const legalLinks = [
    { name: 'Privacy Policy', path: '/privacy-policy' },
    { name: 'Terms & Conditions', path: '/terms-conditions' },
  ];

  const socialLinks = [
    { name: 'Instagram', icon: Instagram, url: 'https://www.instagram.com/innovative_hubofficial/' },
    { name: 'Facebook', icon: Facebook, url: 'https://www.facebook.com/people/Innovative-hub/61566aborrar848671/' },
    { name: 'LinkedIn', icon: Linkedin, url: 'https://linkedin.com/company/innovative-hub' },
  ];

  return (
    <footer className="bg-footer border-t border-border/40 text-footer-text">
      <div className="container mx-auto px-4 py-8 md:py-10 max-w-7xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-6">
          {/* Column 1: Quick Links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm text-footer-muted hover:text-white hover:translate-x-1 transition-all duration-200 inline-block py-1 touch-manipulation"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2: Company */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">Company</h4>
            <ul className="space-y-2">
              {companyLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm text-footer-muted hover:text-white hover:translate-x-1 transition-all duration-200 inline-block py-1 touch-manipulation"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Legal */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">Legal</h4>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm text-footer-muted hover:text-white hover:translate-x-1 transition-all duration-200 inline-block py-1 touch-manipulation"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Links / Social */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">Links</h4>
            <ul className="space-y-2.5">
              {socialLinks.map((social) => (
                <li key={social.name}>
                  <a
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-footer-muted hover:text-white transition-colors py-1 group touch-manipulation"
                  >
                    <social.icon className="w-4 h-4 text-primary group-hover:scale-110 transition-transform duration-200" />
                    <span>{social.name}</span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-footer-muted text-center sm:text-left">
            © {new Date().getFullYear()} Innovative Hub. All rights reserved.
          </p>
          <p className="text-xs text-footer-muted/60 text-center sm:text-right">
            Providing tools, knowledge, and community to transform ideas into reality.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
