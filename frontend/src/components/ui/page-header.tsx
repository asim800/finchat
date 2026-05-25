// Templated page header component for dashboard pages

'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface PageHeaderAction {
  type: 'link' | 'component';
  label?: string;
  href?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  icon?: string;
  component?: React.ReactNode;
}

interface PageHeaderProps {
  title: string;
  description: string;
  actions?: PageHeaderAction[];
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions = []
}) => {
  return (
    <div className="mb-4 md:mb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-blue-600">
            {title}
          </h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1 md:mt-2">
            {description}
          </p>
        </div>
        {actions.length > 0 && (
          <div className="flex items-center space-x-3">
            {actions.map((action, index) => (
              <React.Fragment key={index}>
                {action.type === 'link' && action.href && (
                  <Link href={action.href}>
                    <Button variant={action.variant || 'outline'}>
                      {action.icon && <span>{action.icon} </span>}
                      {action.label}
                    </Button>
                  </Link>
                )}
                {action.type === 'component' && action.component}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
