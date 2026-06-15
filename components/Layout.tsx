
'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import BreadcrumbNav from './BreadcrumbNav';

interface LayoutProps {
  children: React.ReactNode;
  currentPageTitle?: string;
  showBreadcrumbs?: boolean;
}

/**
 * Layout component for pages that need breadcrumbs.
 * Note: Header and Footer are now global (in app/layout.tsx),
 * so this component only handles breadcrumbs and page-specific layout.
 */
const Layout: React.FC<LayoutProps> = ({ children, currentPageTitle, showBreadcrumbs = true }) => {
  const pathname = usePathname();
  const isDirectoryPage = pathname === '/directory';

  return (
    <>
      <div className={isDirectoryPage ? "bg-[#d1e2c4] bg-opacity-20" : ""}>
        {showBreadcrumbs && <BreadcrumbNav currentPageTitle={currentPageTitle} />}
      </div>
      <div style={{ background: 'transparent' }}>
        {children}
      </div>
    </>
  );
};

export default Layout;
