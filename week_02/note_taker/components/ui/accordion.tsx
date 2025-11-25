"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccordionContextValue {
  value: string[];
  onValueChange: (value: string[]) => void;
}

const AccordionContext = React.createContext<AccordionContextValue | undefined>(
  undefined
);

interface AccordionProps {
  type?: "single" | "multiple";
  defaultValue?: string | string[];
  value?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  children: React.ReactNode;
  className?: string;
  collapsible?: boolean;
}

const Accordion = React.forwardRef<HTMLDivElement, AccordionProps>(
  (
    {
      type = "single",
      defaultValue,
      value: controlledValue,
      onValueChange,
      children,
      className,
      collapsible,
      ...props
    },
    ref
  ) => {
    const [uncontrolledValue, setUncontrolledValue] = React.useState<string[]>(
      () => {
        if (defaultValue === undefined) return [];
        return Array.isArray(defaultValue) ? defaultValue : [defaultValue];
      }
    );

    const value = controlledValue
      ? Array.isArray(controlledValue)
        ? controlledValue
        : [controlledValue]
      : uncontrolledValue;

    const handleValueChange = React.useCallback(
      (newValue: string[]) => {
        if (!controlledValue) {
          setUncontrolledValue(newValue);
        }
        if (onValueChange) {
          if (type === "single") {
            onValueChange(newValue[0] || "");
          } else {
            onValueChange(newValue);
          }
        }
      },
      [controlledValue, onValueChange, type]
    );

    return (
      <AccordionContext.Provider value={{ value, onValueChange: handleValueChange }}>
        <div ref={ref} className={cn("space-y-2", className)} {...props}>
          {children}
        </div>
      </AccordionContext.Provider>
    );
  }
);
Accordion.displayName = "Accordion";

interface AccordionItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ className, value, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("border-b", className)}
        data-value={value}
        {...props}
      />
    );
  }
);
AccordionItem.displayName = "AccordionItem";

interface AccordionTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

const AccordionTrigger = React.forwardRef<
  HTMLButtonElement,
  AccordionTriggerProps
>(({ className, children, value, ...props }, ref) => {
  const context = React.useContext(AccordionContext);
  if (!context) throw new Error("AccordionTrigger must be used within Accordion");

  const isOpen = context.value.includes(value);

  const handleClick = () => {
    const newValue = isOpen
      ? context.value.filter((v) => v !== value)
      : [...context.value, value];
    context.onValueChange(newValue);
  };

  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
        className
      )}
      data-state={isOpen ? "open" : "closed"}
      onClick={handleClick}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
    </button>
  );
});
AccordionTrigger.displayName = "AccordionTrigger";

interface AccordionContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const AccordionContent = React.forwardRef<
  HTMLDivElement,
  AccordionContentProps
>(({ className, children, value, ...props }, ref) => {
  const context = React.useContext(AccordionContext);
  if (!context) throw new Error("AccordionContent must be used within Accordion");

  const isOpen = context.value.includes(value);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [height, setHeight] = React.useState<string>("0px");

  React.useEffect(() => {
    if (contentRef.current) {
      if (isOpen) {
        setHeight(`${contentRef.current.scrollHeight}px`);
      } else {
        setHeight("0px");
      }
    }
  }, [isOpen]);

  return (
    <div
      ref={ref}
      className={cn(
        "overflow-hidden text-sm transition-all duration-200 ease-out",
        isOpen ? "opacity-100" : "opacity-0"
      )}
      style={{ height }}
      data-state={isOpen ? "open" : "closed"}
      {...props}
    >
      <div ref={contentRef} className={cn("pb-4 pt-0", className)}>
        {children}
      </div>
    </div>
  );
});
AccordionContent.displayName = "AccordionContent";

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };

