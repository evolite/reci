import { CardTitle, CardDescription } from '@/components/ui/card';
import { ChefHat } from 'lucide-react';

interface AuthCardHeaderProps {
  readonly title: string;
  readonly description: string;
}

export function AuthCardHeader({ title, description }: AuthCardHeaderProps) {
  return (
    <>
      <div className="flex justify-center mb-4">
        <div className="bg-brand-gradient p-3 rounded-xl shadow-lg">
          <ChefHat className="w-8 h-8 text-white" />
        </div>
      </div>
      <CardTitle className="text-2xl">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </>
  );
}
