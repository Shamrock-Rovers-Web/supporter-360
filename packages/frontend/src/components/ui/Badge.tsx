import { HTMLAttributes, forwardRef } from 'react'

type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'member'
  | 'season'
  | 'ticket'
  | 'shop'
  | 'away'
  | 'gold'

type BadgeSize = 'sm' | 'md' | 'lg'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?: BadgeSize
  dot?: boolean
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-800',
  error: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  member: 'bg-blue-100 text-blue-800',
  season: 'bg-purple-100 text-purple-800',
  ticket: 'bg-green-100 text-green-800',
  shop: 'bg-orange-100 text-orange-800',
  away: 'bg-red-100 text-red-800',
  gold: 'bg-brand-gold-100 text-brand-gold-800 border border-brand-gold-300',
}

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
}

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-slate-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
  member: 'bg-blue-500',
  season: 'bg-purple-500',
  ticket: 'bg-green-500',
  shop: 'bg-orange-500',
  away: 'bg-red-500',
  gold: 'bg-brand-gold-500',
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = 'default',
      size = 'md',
      dot = false,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    return (
      <span
        ref={ref}
        className={`
          inline-flex items-center font-medium rounded-full
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `.replace(/\s+/g, ' ').trim()}
        {...props}
      >
        {dot && (
          <span
            className={`
              w-1.5 h-1.5 rounded-full mr-1.5
              ${dotColors[variant]}
            `}
          />
        )}
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

// Status Badge with animated pulse
interface StatusBadgeProps extends Omit<BadgeProps, 'dot'> {
  pulse?: boolean
}

export const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ pulse = false, className = '', ...props }, ref) => {
    return (
      <Badge
        ref={ref}
        dot
        className={`${className} ${pulse ? 'animate-pulse' : ''}`}
        {...props}
      />
    )
  }
)

StatusBadge.displayName = 'StatusBadge'

// Utility function to get badge variant from supporter type
export function getSupporterTypeBadgeVariant(type: string): BadgeVariant {
  const typeMap: Record<string, BadgeVariant> = {
    'Member': 'member',
    'Season Ticket Holder': 'season',
    'Ticket Buyer': 'ticket',
    'Shop Buyer': 'shop',
    'Away Supporter': 'away',
  }
  return typeMap[type] || 'default'
}

// Membership status badge variants
export function getMembershipStatusVariant(status: string): BadgeVariant {
  const statusMap: Record<string, BadgeVariant> = {
    'active': 'success',
    'Active': 'success',
    'expired': 'warning',
    'Expired': 'warning',
    'pending': 'info',
    'Pending': 'info',
    'cancelled': 'error',
    'Cancelled': 'error',
  }
  return statusMap[status] || 'default'
}
