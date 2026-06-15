'use client';

import { Badge } from '@/components/ui/badge';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface NotificationBadgeProps {
  count: number;
  href?: string;
  className?: string;
}

export function NotificationBadge({ count, href, className }: NotificationBadgeProps) {
  if (count === 0) {
    return null;
  }

  const badge = (
    <Badge
      variant="destructive"
      className={cn(
        "flex items-center gap-1 px-2 py-0.5 text-xs font-semibold",
        className
      )}
    >
      <Bell className="h-3 w-3" />
      {count}
    </Badge>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block">
        {badge}
      </Link>
    );
  }

  return badge;
}
