import React from 'react';
import {
  Zap,
  Droplets,
  Wifi,
  Armchair,
  Cpu,
  Sparkles,
  Building,
  School,
  HelpCircle,
} from 'lucide-react';

/**
 * Category Definitions & Icons
 * Matches the backend Complaint model's 9 allowed categories.
 */
export const CATEGORIES = [
  {
    name: 'Electrical',
    icon: <Zap size={16} className="text-status-assigned" />,
    description: 'Lights, switches, power sockets, fans, MCB breakers',
  },
  {
    name: 'Plumbing',
    icon: <Droplets size={16} className="text-status-reviewed" />,
    description: 'Taps, washbasins, pipe leakages, restroom flushes',
  },
  {
    name: 'Internet/WiFi',
    icon: <Wifi size={16} className="text-brand" />,
    description: 'Hostel Wi-Fi access points, LAN ports, connectivity',
  },
  {
    name: 'Furniture',
    icon: <Armchair size={16} className="text-muted" />,
    description: 'Desks, chairs, whiteboards, podiums, cupboards',
  },
  {
    name: 'Equipment',
    icon: <Cpu size={16} className="text-status-progress" />,
    description: 'Projectors, lab equipment, AC units, water coolers',
  },
  {
    name: 'Cleanliness',
    icon: <Sparkles size={16} className="text-status-resolved" />,
    description: 'Waste disposal, spills, corridor/washroom sanitation',
  },
  {
    name: 'Hostel Maintenance',
    icon: <Building size={16} className="text-muted" />,
    description: 'Room doors, windows, locks, laundry room issues',
  },
  {
    name: 'Classroom Infrastructure',
    icon: <School size={16} className="text-ink" />,
    description: 'Lecture hall seating, blinds, acoustics, mic systems',
  },
  {
    name: 'Other',
    icon: <HelpCircle size={16} className="text-muted" />,
    description: 'General campus facility concerns',
  },
];

export const getCategoryIcon = (categoryName, size = 16) => {
  const match = CATEGORIES.find(
    (c) => c.name.toLowerCase() === (categoryName || '').toLowerCase()
  );
  if (match) {
    return React.cloneElement(match.icon, { size });
  }
  return <HelpCircle size={size} className="text-muted" />;
};
