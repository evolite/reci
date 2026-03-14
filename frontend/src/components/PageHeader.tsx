import type { ReactNode } from 'react';
import { ChefHat } from 'lucide-react';

interface PageHeaderProps {
  readonly title: string;
  readonly description?: string;
  readonly icon?: ReactNode;
  readonly actions?: ReactNode;
}

export function PageHeader({ title, description, icon, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="bg-brand-gradient p-2.5 rounded-xl shadow-lg">
          {icon || <ChefHat className="w-6 h-6 text-white" />}
        </div>
        <div>
          <h1 className="text-3xl font-bold text-brand-gradient-short">
            {title}
          </h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
