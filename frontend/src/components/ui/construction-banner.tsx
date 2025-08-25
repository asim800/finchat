'use client';

import React, { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { XIcon } from 'lucide-react';

export const ConstructionBanner: React.FC = () => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) {
    return null;
  }

  return (
    <Alert className="rounded-none border-l-0 border-r-0 border-t-0 bg-orange-50 border-orange-200 border-b-2">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center">
          <span className="text-orange-600 mr-3 text-lg">🚧</span>
          <AlertDescription className="text-orange-800 font-medium">
            This website is currently under construction.
          </AlertDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsDismissed(true)}
          className="text-orange-600 hover:text-orange-800 hover:bg-orange-100 p-1 ml-4"
        >
          <XIcon className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
};