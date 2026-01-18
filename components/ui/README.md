# UI Components

Professional, dark-themed UI components for PolyDesk following trading terminal aesthetics.

## Design System

### Colors
- **Background**: `#0a0a0f`
- **Cards**: `#12121a`
- **Primary Accent**: `#10b981` (Green)
- **Secondary Accent**: `#ef4444` (Red)
- **Text**: Gray scale (100-500)

### Typography
- Sans-serif for general text
- Monospace for numbers (via Tailwind)

## Components

### Button

Versatile button with multiple variants and states.

**Props:**
- `variant`: `"default"` | `"primary"` | `"secondary"` | `"ghost"` | `"danger"`
- `size`: `"sm"` | `"md"` | `"lg"`
- `loading`: `boolean`

**Example:**
```tsx
import { Button } from "@/components/ui";

<Button variant="primary" size="lg" loading={isLoading}>
  Trade Now
</Button>
```

### Card

Container component with header, content, and footer sections.

**Components:**
- `Card` - Main container
- `CardHeader` - Header section
- `CardTitle` - Title text
- `CardDescription` - Description text
- `CardContent` - Main content area
- `CardFooter` - Footer section

**Example:**
```tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";

<Card>
  <CardHeader>
    <CardTitle>Market Overview</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Your content here</p>
  </CardContent>
</Card>
```

### Input

Styled input field with label and error message support.

**Props:**
- `label`: `string` - Optional label
- `error`: `string` - Optional error message

**Example:**
```tsx
import { Input } from "@/components/ui";

<Input
  label="Email Address"
  type="email"
  placeholder="you@example.com"
  error={errors.email}
/>
```

### Tabs

Tab navigation using Radix UI primitives.

**Components:**
- `Tabs` - Root container
- `TabsList` - Container for triggers
- `TabsTrigger` - Individual tab button
- `TabsContent` - Tab panel content

**Example:**
```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui";

<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="trades">Trades</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">Overview content</TabsContent>
  <TabsContent value="trades">Trades content</TabsContent>
</Tabs>
```

### Badge

Small badge component for status indicators.

**Props:**
- `variant`: `"default"` | `"success"` | `"warning"` | `"danger"` | `"info"`

**Example:**
```tsx
import { Badge } from "@/components/ui";

<Badge variant="success">Active</Badge>
<Badge variant="danger">Closed</Badge>
```

### Tooltip

Tooltip using Radix UI primitives.

**Components:**
- `TooltipProvider` - Required wrapper (usually at app root)
- `Tooltip` - Root container
- `TooltipTrigger` - Element that triggers tooltip
- `TooltipContent` - Tooltip content

**Example:**
```tsx
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui";

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger>Hover me</TooltipTrigger>
    <TooltipContent>Helpful information</TooltipContent>
  </Tooltip>
</TooltipProvider>
```

## Usage

All components can be imported from the main index:

```tsx
import {
  Button,
  Card,
  Input,
  Tabs,
  Badge,
  Tooltip
} from "@/components/ui";
```

Or individually:

```tsx
import { Button } from "@/components/ui/Button";
```

## Accessibility

All components follow accessibility best practices:
- Proper ARIA attributes
- Keyboard navigation support
- Focus management
- Screen reader friendly

## Styling

Components use:
- **Tailwind CSS** for styling
- **clsx** and **tailwind-merge** via `cn()` utility from `@/lib/utils/formatting`
- **Radix UI** for complex interactive components (Tabs, Tooltip)

## Customization

All components accept a `className` prop that will be merged with default styles:

```tsx
<Button className="w-full" variant="primary">
  Full Width Button
</Button>
```
