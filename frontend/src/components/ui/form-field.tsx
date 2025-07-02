import * as React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface FormFieldProps extends React.ComponentProps<"input"> {
  label?: string
  error?: string
  containerClassName?: string
}

export function FormField({ 
  label, 
  error, 
  className,
  containerClassName,
  id,
  ...props 
}: FormFieldProps) {
  // Generate ID if not provided for accessibility
  const fieldId = id || `field-${Math.random().toString(36).substr(2, 9)}`
  
  return (
    <div className={cn("w-full", containerClassName)}>
      {label && (
        <Label htmlFor={fieldId} className="block text-sm font-medium mb-2">
          {label}
        </Label>
      )}
      <Input
        id={fieldId}
        className={cn(
          error ? "border-destructive focus-visible:ring-destructive/20" : "",
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}