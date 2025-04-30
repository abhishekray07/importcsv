'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserButton, useClerk } from '@clerk/nextjs';
import {
  LayoutGrid,
  BarChart3,
  LogOut,
  Menu,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { signOut } = useClerk();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = async () => {
    await signOut();
    router.push('/sign-in');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Navigation items for the sidebar
  const navItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: <LayoutGrid className="h-5 w-5 mr-2" />,
      exact: true
    },
    {
      name: 'Importers',
      href: '/dashboard/importers',
      icon: <FileSpreadsheet className="h-5 w-5 mr-2" />,
      exact: false
    },
  ];

  // Check if a nav item is active
  const isActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm h-16 flex items-center px-4 justify-between">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="mr-2 md:hidden"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <h1 className="text-xl font-semibold">ImportCSV Admin</h1>
        </div>
        <div className="flex items-center gap-4">
          <UserButton afterSignOutUrl="/sign-in" />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="flex items-center"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside
          className={`bg-white shadow-sm w-64 transition-all duration-300 ease-in-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } md:translate-x-0 fixed md:static h-[calc(100vh-4rem)] z-10`}
        >
          <nav className="p-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                  isActive(item.href, item.exact)
                    ? 'bg-gray-100 text-gray-900 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {item.icon}
                {item.name}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 p-6 transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'md:ml-0' : 'md:ml-0'
        }`}>
          {children}
        </main>
      </div>
    </div>
  );
}
