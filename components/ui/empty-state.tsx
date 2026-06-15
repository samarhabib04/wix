import React from 'react';
import { Database, Search, FileX, Users, ShoppingBag, Star, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: 'database' | 'search' | 'file' | 'users' | 'shop' | 'star' | 'message';
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'database',
  title,
  description,
  action,
  className
}) => {
  const icons = {
    database: Database,
    search: Search,
    file: FileX,
    users: Users,
    shop: ShoppingBag,
    star: Star,
    message: MessageSquare
  };

  const IconComponent = icons[icon];

  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-16 px-4 text-center',
      className
    )}>
      <div className="rounded-full bg-brand-light-green/20 p-4 mb-6">
        <IconComponent className="h-10 w-10 text-brand-dark-green" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-3">
        {title}
      </h3>
      <p className="text-muted-foreground max-w-md leading-relaxed mb-6">
        {description}
      </p>
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
