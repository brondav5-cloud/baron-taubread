import { clsx } from "clsx";
import { ReactNode, ButtonHTMLAttributes } from "react";
import Link from "next/link";

// ============================================
// BUTTON
// ============================================

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonBaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconPosition?: "start" | "end";
  fullWidth?: boolean;
  loading?: boolean;
  children?: ReactNode;
  className?: string;
}

interface ButtonProps
  extends
    ButtonBaseProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500",
  secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500",
  outline:
    "bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50 focus:ring-gray-500",
  ghost: "bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-gray-500",
  danger: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-500",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
  lg: "px-6 py-3 text-base gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "start",
  fullWidth = false,
  loading = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        (disabled || loading) && "opacity-50 cursor-not-allowed",
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>טוען...</span>
        </>
      ) : (
        <>
          {icon && iconPosition === "start" && <span>{icon}</span>}
          {children}
          {icon && iconPosition === "end" && <span>{icon}</span>}
        </>
      )}
    </button>
  );
}

// ============================================
// LINK BUTTON
// ============================================

interface LinkButtonProps extends ButtonBaseProps {
  href: string;
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "start",
  fullWidth = false,
  children,
  className,
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={clsx(
        "inline-flex items-center justify-center font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className,
      )}
    >
      {icon && iconPosition === "start" && <span>{icon}</span>}
      {children}
      {icon && iconPosition === "end" && <span>{icon}</span>}
    </Link>
  );
}

// ============================================
// ICON BUTTON
// ============================================

interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "className"
> {
  icon: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  label?: string; // for accessibility
  className?: string;
}

const iconSizeClasses: Record<ButtonSize, string> = {
  sm: "p-1.5",
  md: "p-2",
  lg: "p-3",
};

export function IconButton({
  icon,
  variant = "ghost",
  size = "md",
  label,
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
        variantClasses[variant],
        iconSizeClasses[size],
        className,
      )}
      aria-label={label}
      {...props}
    >
      {icon}
    </button>
  );
}
