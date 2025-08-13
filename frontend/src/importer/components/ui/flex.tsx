import * as React from "react"
import { cn } from "../../../utils/classes"

interface FlexProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: "row" | "column" | "row-reverse" | "column-reverse"
  align?: "start" | "center" | "end" | "stretch" | "baseline"
  justify?: "start" | "center" | "end" | "between" | "around" | "evenly"
  wrap?: boolean
  gap?: number | string
}

const Flex = React.forwardRef<HTMLDivElement, FlexProps>(
  ({ className, direction = "row", align, justify, wrap, gap, style, ...props }, ref) => {
    const flexClasses = cn(
      "flex",
      {
        "flex-row": direction === "row",
        "flex-col": direction === "column",
        "flex-row-reverse": direction === "row-reverse",
        "flex-col-reverse": direction === "column-reverse",
        "items-start": align === "start",
        "items-center": align === "center",
        "items-end": align === "end",
        "items-stretch": align === "stretch",
        "items-baseline": align === "baseline",
        "justify-start": justify === "start",
        "justify-center": justify === "center",
        "justify-end": justify === "end",
        "justify-between": justify === "between",
        "justify-around": justify === "around",
        "justify-evenly": justify === "evenly",
        "flex-wrap": wrap,
      },
      className
    )

    const gapStyle = gap ? { gap: typeof gap === 'number' ? `${gap * 0.25}rem` : gap } : {}

    return (
      <div
        ref={ref}
        className={flexClasses}
        style={{ ...gapStyle, ...style }}
        {...props}
      />
    )
  }
)
Flex.displayName = "Flex"

const Box = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn(className)} {...props} />
  }
)
Box.displayName = "Box"

const HStack = React.forwardRef<HTMLDivElement, Omit<FlexProps, "direction">>(
  (props, ref) => <Flex ref={ref} direction="row" align="center" {...props} />
)
HStack.displayName = "HStack"

const VStack = React.forwardRef<HTMLDivElement, Omit<FlexProps, "direction">>(
  (props, ref) => <Flex ref={ref} direction="column" {...props} />
)
VStack.displayName = "VStack"

const Text = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn(className)} {...props} />
  }
)
Text.displayName = "Text"

export { Flex, Box, HStack, VStack, Text }