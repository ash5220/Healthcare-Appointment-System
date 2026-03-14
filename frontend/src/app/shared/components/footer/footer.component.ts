/**
 * FooterComponent
 * 
 * The application footer that appears at the bottom of all pages.
 * Contains:
 * - Quick navigation links
 * - Contact information
 * - Social media links
 * - Copyright notice
 * 
 * The footer is responsive and collapses to a single column on mobile devices.
 */
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

/**
 * Interface for footer link structure.
 * Groups links by category for organized display.
 */
interface FooterLinkGroup {
  title: string;
  links: Array<{
    label: string;
    path: string;
    external?: boolean;
  }>;
}

/**
 * Interface for social media links.
 */
interface SocialLink {
  name: string;
  icon: string;
  url: string;
}

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
})
export class FooterComponent {
  /**
   * Current year for copyright notice.
   * Computed once at component creation.
   */
  protected readonly currentYear = new Date().getFullYear();

  /**
   * Application name displayed in footer.
   */
  protected readonly appName = 'HealthCare';

  /**
   * Footer navigation link groups.
   * Organized by category for clear structure.
   */
  protected readonly linkGroups: FooterLinkGroup[] = [
    {
      title: 'Quick Links',
      links: [
        { label: 'Home', path: '/' },
        { label: 'About Us', path: '/about' },
        { label: 'Our Doctors', path: '/doctors' },
        { label: 'Services', path: '/services' },
      ],
    },
    {
      title: 'For Patients',
      links: [
        { label: 'Book Appointment', path: '/patient/book' },
        { label: 'My Appointments', path: '/patient/appointments' },
        { label: 'Medical Records', path: '/patient/medical-records' },
        { label: 'Find a Doctor', path: '/doctors' },
      ],
    },
    {
      title: 'Support',
      links: [
        { label: 'Help Center', path: '/help' },
        { label: 'Contact Us', path: '/contact' },
        { label: 'Privacy Policy', path: '/privacy' },
        { label: 'Terms of Service', path: '/terms' },
      ],
    },
  ];

  /**
   * Social media links with icons.
   */
  protected readonly socialLinks: SocialLink[] = [
    { name: 'Facebook', icon: 'bi-facebook', url: 'https://facebook.com' },
    { name: 'Twitter', icon: 'bi-twitter-x', url: 'https://twitter.com' },
    { name: 'Instagram', icon: 'bi-instagram', url: 'https://instagram.com' },
    { name: 'LinkedIn', icon: 'bi-linkedin', url: 'https://linkedin.com' },
  ];

  /**
   * Contact information for display.
   */
  protected readonly contactInfo = {
    email: 'support@healthcare.com',
    phone: '+1 (555) 123-4567',
    address: '123 Medical Center Dr, Health City, HC 12345',
  };
}
