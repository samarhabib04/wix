'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ChevronRight, Home } from 'lucide-react';

type BreadcrumbProps = {
  // Optional title to override the auto-generated title for the current page
  currentPageTitle?: string;
  // For breed pages - specify the breed type to show correct parent
  breedType?: 'Pedigree' | 'Mixed';
};

// Helper function to detect if a path segment is a UUID or contains a UUID/numeric ID pattern
const isUUID = (segment: string): boolean => {
  // Check if it's exactly a UUID
  const exactUUIDRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (exactUUIDRegex.test(segment)) {
    return true;
  }
  // Check if it starts with a UUID pattern (for slugified IDs like "uuid-title-slug")
  const uuidPrefixRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i;
  if (uuidPrefixRegex.test(segment)) {
    return true;
  }
  // Check if it ends with a UUID pattern (for slugified IDs like "title-slug-uuid")
  const uuidSuffixRegex = /-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidSuffixRegex.test(segment)) {
    return true;
  }
  // Check if it ends with a numeric ID pattern (like "title-slug-1234")
  const numericIdSuffixRegex = /-[0-9]+$/i;
  return numericIdSuffixRegex.test(segment);
};

// Helper function to strip UUID/numeric ID from a slug and return a readable title
const stripIdFromSlug = (slug: string): string => {
  // Remove UUID patterns (both prefix and suffix)
  let cleaned = slug
    .replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i, '')
    .replace(/-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, '')
    .replace(/-[0-9]+$/i, '');
  
  // Format the remaining slug to a readable title
  return cleaned
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/** Shorten long breadcrumb labels (admin blog edit slugs only). */
const truncateBreadcrumbWords = (title: string, maxWords = 3): string => {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return title;
  return `${words.slice(0, maxWords).join(' ')}…`;
};

type BreadcrumbItemData = { title: string; path: string };

/** Admin blog editor routes — avoid rendering the full post slug in breadcrumbs. */
function getAdminBlogEditorBreadcrumbs(
  path: string,
  currentPageTitle?: string,
): BreadcrumbItemData[] | null {
  if (/^\/admin-dashboard\/blog\/edit\/?$/.test(path)) {
    return [
      { title: 'Home', path: '/' },
      { title: 'Admin Dashboard', path: '/admin-dashboard' },
      { title: 'Blog', path: '/admin-dashboard/blog' },
      {
        title: truncateBreadcrumbWords(currentPageTitle || 'Edit Post', 3),
        path: '/admin-dashboard/blog/edit',
      },
    ];
  }

  const legacyEditMatch = path.match(/^\/admin-dashboard\/blog\/edit\/([^/]+)\/?$/);
  if (legacyEditMatch) {
    return [
      { title: 'Home', path: '/' },
      { title: 'Admin Dashboard', path: '/admin-dashboard' },
      { title: 'Blog', path: '/admin-dashboard/blog' },
      { title: 'Edit', path: '/admin-dashboard/blog/edit' },
      {
        title: truncateBreadcrumbWords(currentPageTitle || 'Edit Post', 3),
        path: '/admin-dashboard/blog/edit',
      },
    ];
  }

  if (/^\/admin-dashboard\/blog\/new\/?$/.test(path)) {
    return [
      { title: 'Home', path: '/' },
      { title: 'Admin Dashboard', path: '/admin-dashboard' },
      { title: 'Blog', path: '/admin-dashboard/blog' },
      { title: 'New Post', path: '/admin-dashboard/blog/new' },
    ];
  }

  return null;
}

// Helper function to generate path segments and convert them to readable titles
const generateBreadcrumbItems = (path: string, currentPageTitle?: string, breedType?: 'Pedigree' | 'Mixed') => {
  const adminBlogTrail = getAdminBlogEditorBreadcrumbs(path, currentPageTitle);
  if (adminBlogTrail) {
    return adminBlogTrail;
  }

  // Skip empty segments and remove query parameters
  const pathSegments = path.split('/').filter(segment => segment);
  const breadcrumbs: BreadcrumbItemData[] = [];
  let currentPath = '';
  
  // Add home as the first item
  breadcrumbs.push({
    title: 'Home',
    path: '/',
  });
  
  // Generate each segment
  for (let i = 0; i < pathSegments.length; i++) {
    // Build the path
    currentPath += `/${pathSegments[i]}`;
    
    // Format the title - replace hyphens with spaces and capitalize first letter of each word
    let title = pathSegments[i].replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    // Special handling for different route types
    if (pathSegments[i] === 'listings') {
      title = 'Dogs for Sale';
    } else if (pathSegments[i] === 'listing') {
      // For listing detail pages, show "Dogs for Sale" first
      breadcrumbs.push({
        title: 'Dogs for Sale',
        path: '/listings'
      });
      
      // Then add the listing title as the final breadcrumb
      if (currentPageTitle) {
        breadcrumbs.push({
          title: currentPageTitle,
          path: currentPath
        });
      } else {
        // If no title provided, use a generic title
        breadcrumbs.push({
          title: 'Listing Details',
          path: currentPath
        });
      }
      break; // Stop processing after handling listing detail
    } else if (pathSegments[i] === 'stud') {
      // Check if next segment is a UUID (stud detail page)
      if (i + 1 < pathSegments.length && isUUID(pathSegments[i + 1])) {
        // For stud detail pages, show "Stud Services" first
        breadcrumbs.push({
          title: 'Stud Services',
          path: '/stud'
        });
        
        // Then add the stud title as the final breadcrumb
        if (currentPageTitle) {
          breadcrumbs.push({
            title: currentPageTitle,
            path: currentPath
          });
        } else {
          // If no title provided, use a generic title
          breadcrumbs.push({
            title: 'Stud Details',
            path: currentPath
          });
        }
        break; // Stop processing after handling stud detail
      }
      title = 'Stud Services';
    } else if (pathSegments[i] === 'showcase') {
      // Check if next segment is a UUID (showcase detail page)
      if (i + 1 < pathSegments.length && isUUID(pathSegments[i + 1])) {
        // For showcase detail pages, show "Showcase" first
        breadcrumbs.push({
          title: 'Showcase',
          path: '/showcase'
        });
        
        // Then add the showcase title as the final breadcrumb
        if (currentPageTitle) {
          breadcrumbs.push({
            title: currentPageTitle,
            path: currentPath
          });
        } else {
          // If no title provided, use a generic title
          breadcrumbs.push({
            title: 'Showcase Details',
            path: currentPath
          });
        }
        break; // Stop processing after handling showcase detail
      }
      title = 'Showcase';
    } else if (pathSegments[i] === 'services') {
      title = 'Services';
    } else if (pathSegments[i] === 'breeds') {
      title = 'Pedigree Breeds';
    } else if (pathSegments[i] === 'mixed-breeds') {
      title = 'Mixed Breeds';
    } else if (pathSegments[i] === 'shop') {
      // Check if this is a shop detail page (has a slug with UUID/numeric ID)
      if (i + 1 < pathSegments.length && isUUID(pathSegments[i + 1])) {
        breadcrumbs.push({
          title: 'Shop',
          path: '/shop'
        });
        
        if (currentPageTitle) {
          breadcrumbs.push({
            title: currentPageTitle,
            path: currentPath
          });
        } else {
          breadcrumbs.push({
            title: stripIdFromSlug(pathSegments[i + 1]),
            path: currentPath
          });
        }
        break;
      }
      // Also check if the current segment (the shop slug) contains a UUID/numeric ID
      if (i === pathSegments.length - 1 && isUUID(pathSegments[i])) {
        if (breadcrumbs.length > 0 && breadcrumbs[breadcrumbs.length - 1].title !== 'Shop') {
          breadcrumbs.push({
            title: 'Shop',
            path: '/shop'
          });
        }
        
        if (currentPageTitle) {
          breadcrumbs.push({
            title: currentPageTitle,
            path: currentPath
          });
        } else {
          breadcrumbs.push({
            title: stripIdFromSlug(pathSegments[i]),
            path: currentPath
          });
        }
        break;
      }
      title = 'Shop';
    } else if (pathSegments[i] === 'users') {
      // Check if next segment is a UUID (user profile page)
      if (i + 1 < pathSegments.length && isUUID(pathSegments[i + 1])) {
        // For user profile pages, show "User Directory" first
        breadcrumbs.push({
          title: 'User Directory',
          path: '/directory'
        });
        
        // Then add the user name as the final breadcrumb (skip the UUID)
        if (currentPageTitle) {
          breadcrumbs.push({
            title: currentPageTitle,
            path: currentPath + '/' + pathSegments[i + 1]
          });
        } else {
          // If no title provided, use a generic title
          breadcrumbs.push({
            title: 'User Profile',
            path: currentPath + '/' + pathSegments[i + 1]
          });
        }
        break; // Stop processing after handling user profile - this prevents the UUID from being added
      }
      title = 'User Directory';
      currentPath = '/directory';
    } else if (pathSegments[i] === 'my-buyer-dashboard') {
      title = 'Buyer Dashboard';
    } else if (pathSegments[i] === 'my-seller-dashboard') {
      title = 'Seller Dashboard';
    } else if (pathSegments[i] === 'admin-dashboard') {
      title = 'Admin Dashboard';
    }
    
    // Special handling for breed detail pages
    if (i === pathSegments.length - 1 && (pathSegments[i-1] === 'breeds' || pathSegments[i-1] === 'mixed-breeds')) {
      // For breed detail pages, show the proper parent category first
      const isIMixedBreed = pathSegments[i-1] === 'mixed-breeds';
      const parentTitle = isIMixedBreed ? 'Mixed Breeds' : 'Pedigree Breeds';
      const parentPath = isIMixedBreed ? '/mixed-breeds' : '/breeds';
      
      // Update the parent breadcrumb
      breadcrumbs[breadcrumbs.length - 1] = {
        title: parentTitle,
        path: parentPath
      };
      
      // Add the breed name as the final breadcrumb
      if (currentPageTitle) {
        title = currentPageTitle;
      } else {
        // Format the slug to a readable breed name (capitalize words)
        title = pathSegments[i]
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
    }
    
    // Override the title of the last segment if provided (except for listing details which we handle above)
    if (i === pathSegments.length - 1 && currentPageTitle && pathSegments[i] !== 'listing') {
      title = currentPageTitle;
    }
    
    // Only add if we haven't already handled it in the listing/stud/showcase detail page special cases
    // Note: Detail pages break early, so non-detail pages will reach here and should be added
    if (pathSegments[i] !== 'listing') {
      breadcrumbs.push({
        title,
        path: currentPath
      });
    }
  }
  
  return breadcrumbs;
};

const BreadcrumbNav: React.FC<BreadcrumbProps> = ({ currentPageTitle, breedType }) => {
  const pathname = usePathname();
  const params = useParams();
  const isHomePage = pathname === '/';
  
  // Don't show breadcrumbs on the home page
  if (isHomePage) {
    return null;
  }
  
  const breadcrumbItems = generateBreadcrumbItems(pathname, currentPageTitle, breedType);
  const isAdminBlogEditor = /^\/admin-dashboard\/blog\//.test(pathname);
  
  return (
    <div className="container mx-auto px-4 py-2 md:py-3 overflow-x-auto bg-transparent">
      <Breadcrumb>
        <BreadcrumbList>
         {breadcrumbItems.map((item, index) => {
  const isLastItem = index === breadcrumbItems.length - 1;
  
  return (
    <div key={`breadcrumb-${item.path}-${index}`} className="contents">
      <BreadcrumbItem>
        {isLastItem ? (
          <BreadcrumbPage
            className={`text-gray-600 font-medium${
              isAdminBlogEditor ? ' max-w-[12rem] sm:max-w-xs truncate' : ''
            }`}
          >
            {item.title}
          </BreadcrumbPage>
        ) : (
          <BreadcrumbLink asChild>
            <Link href={item.path || '#'} className="text-gray-500 hover:text-gray-700 flex items-center gap-1">
              {index === 0 && <Home className="h-4 w-4" />}
              {item.title}
            </Link>
          </BreadcrumbLink>
        )}
      </BreadcrumbItem>
      {!isLastItem && (
        <BreadcrumbSeparator>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </BreadcrumbSeparator>
      )}
    </div>
  );
})}

        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
};

export default BreadcrumbNav;
