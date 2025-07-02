"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { VariantProps } from "class-variance-authority"
import { buttonVariants } from "@/components/ui/button"

interface ButtonWithLoadingProps 
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
  asChild?: boolean
}

export function ButtonWithLoading({
  loading = false,
  disabled,
  children,
  className,
  ...props
}: ButtonWithLoadingProps) {
  return (
    <Button
      disabled={disabled || loading}
      className={`font-medium ${className || ''}`}
      {...props}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  )
}