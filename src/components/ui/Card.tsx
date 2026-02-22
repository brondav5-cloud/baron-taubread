import { clsx } from "clsx";
import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
  onClick?: () => void;
}

const paddingClasses = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

export function Card({
  children,
  className,
  padding = "md",
  hover = false,
  onClick,
}: CardProps) {
  return (
    <div
      className={clsx(
        "bg-white rounded-2xl shadow-card",
        paddingClasses[padding],
        hover && "hover:shadow-lg transition-shadow cursor-pointer",
        onClick && "cursor-pointer",
        className,
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function CardHeader({ children, className, action }: CardHeaderProps) {
  return (
    <div className={clsx("flex items-center justify-between mb-4", className)}>
      <div className="flex items-center gap-2">{children}</div>
      {action && <div>{action}</div>}
    </div>
  );
}

interface CardTitleProps {
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function CardTitle({ children, icon, className }: CardTitleProps) {
  return (
    <div className={clsx("flex items-center gap-2", className)}>
      {icon && <span className="text-gray-400">{icon}</span>}
      <h3 className="text-lg font-semibold text-gray-900">{children}</h3>
    </div>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
  return <div className={clsx(className)}>{children}</div>;
}
