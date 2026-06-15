'use client';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

type BlogFeaturedFieldProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

export function BlogFeaturedField({ checked, onCheckedChange }: BlogFeaturedFieldProps) {
  return (
    <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50/60 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="featured" className="text-sm font-medium">
            Homepage featured story
          </Label>
          <p className="text-xs leading-relaxed text-muted-foreground">
            When enabled, this post is the large hero on the homepage Stories section
            and appears in the Hero Stories carousel on{' '}
            <span className="font-medium">/blog</span>. Only one post can be featured
            at a time — turning this on replaces the previous featured post when you
            save.
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Tip: you can also tag a post with the{' '}
            <span className="font-medium">Hero Story</span> category to include it in
            the /blog carousel without making it the homepage hero.
          </p>
        </div>
        <Switch
          id="featured"
          checked={checked}
          onCheckedChange={onCheckedChange}
          className="mt-1 shrink-0"
        />
      </div>
    </div>
  );
}
