import { CardTitle, CardDescription } from '@/components/ui/card';
import { ChefHat } from 'lucide-react';

interface AuthCardHeaderProps {
  title: string;
  description: string;
}

export function AuthCardHeader({ title, description }: AuthCardHeaderProps) {
  return (
    <>
      <div className="flex justify-center mb-4">
        <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-3 rounded-xl shadow-lg">
          <ChefHat className="w-8 h-8 text-white" />
        </div>
      </div>
      <CardTitle className="text-2xl">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </>
  );
}
