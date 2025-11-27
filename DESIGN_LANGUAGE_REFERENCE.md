# Design Language Reference

This document describes the design system used in this project. Use this as a reference when building new features or creating similar applications.

## Color Palette

### Primary Colors
- **Primary Blue**: `#137fec`
  - Used for: Primary buttons, active states, links, accents
  - Hover: `#0f6bc7` or `primary/90` (90% opacity)
  - Light background: `bg-primary/10`
  - Border: `border-primary/20`

### Text Colors
- **Primary Text (Light Mode)**: `#111418`
  - Class: `text-[#111418]`
  - Used for: Headings, primary text content
- **Primary Text (Dark Mode)**: `white` or `text-white`
- **Secondary Text (Light Mode)**: `#617589`
  - Class: `text-[#617589]`
  - Used for: Descriptions, secondary information, labels
- **Secondary Text (Dark Mode)**: `text-gray-400`

### Background Colors
- **Background Light**: `#f6f7f8`
  - Class: `bg-background-light`
  - Used for: Main page background (light mode)
- **Background Dark**: `#101922` or `#111418`
  - Class: `bg-background-dark` or `dark:bg-[#111418]`
  - Used for: Main page background (dark mode)
- **Card Background (Light)**: `white`
  - Class: `bg-white`
- **Card Background (Dark)**: `bg-gray-800` or `bg-background-dark`
  - Class: `dark:bg-gray-800` or `dark:bg-background-dark`

### Border Colors
- **Default Border**: `#dbe0e6`
  - Class: `border-[#dbe0e6]`
  - Dark mode: `dark:border-gray-700`
- **Light Border**: `border-gray-200`
  - Dark mode: `dark:border-gray-700`

### Accent Colors
- **Success/Green**: `#10b981` (green-500)
- **Warning/Orange**: `#f59e0b` (amber-500)
- **Error/Red**: `#ef4444` (red-500)
- **Purple**: `#8b5cf6` (purple-500)
- **Pink**: `#ec4899` (pink-500)
- **Cyan**: `#06b6d4` (cyan-500)

### Status Colors
- **Positive/Win**: `text-green-600 dark:text-green-400`
- **Negative/Loss**: `text-red-600 dark:text-red-400`

## Typography

### Font Family
- **Primary Font**: `Manrope` (via Google Fonts)
- **Fallback**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif`
- **Font Display**: `font-display` (Tailwind class)

### Font Sizes & Weights

#### Headings
- **H1 (Page Title)**: 
  - Size: `text-4xl` (2.25rem / 36px)
  - Weight: `font-black` (900)
  - Color: `text-[#111418] dark:text-white`
  - Tracking: `tracking-tight` or `tracking-[-0.033em]`
  - Example: `<h1 className="text-4xl font-black text-[#111418] dark:text-white tracking-tight">`

- **H2 (Section Title)**:
  - Size: `text-xl` (1.25rem / 20px)
  - Weight: `font-bold` or `font-semibold`
  - Color: `text-[#111418] dark:text-white`

- **H3 (Subsection)**:
  - Size: `text-lg` (1.125rem / 18px)
  - Weight: `font-bold`
  - Color: `text-[#111418] dark:text-white`

- **H4 (Card Title)**:
  - Size: `text-base` (1rem / 16px) or `text-sm` (0.875rem / 14px)
  - Weight: `font-semibold` or `font-bold`
  - Color: `text-[#111418] dark:text-white`

#### Body Text
- **Regular Text**: 
  - Size: `text-sm` (0.875rem / 14px) or `text-base` (1rem / 16px)
  - Weight: `font-medium` or `font-normal`
  - Color: `text-[#111418] dark:text-white` or `text-[#617589] dark:text-gray-400`

- **Small Text / Labels**:
  - Size: `text-xs` (0.75rem / 12px)
  - Weight: `font-semibold` or `font-medium`
  - Color: `text-[#617589] dark:text-gray-400`
  - Tracking: `uppercase tracking-[0.1em]` or `tracking-[0.2em]` for labels

- **Tiny Text**:
  - Size: `text-[10px]` (10px)
  - Used for: Badges, tags, small labels

### Text Utilities
- **Uppercase Labels**: `uppercase tracking-[0.1em]` or `tracking-[0.2em]`
- **Line Height**: Default (no explicit class, uses Tailwind defaults)
- **Text Alignment**: `text-left`, `text-center`, `text-right`

## Spacing & Layout

### Container
- **Max Width**: `max-w-7xl` (80rem / 1280px)
- **Padding**: 
  - Mobile: `p-4` (1rem / 16px)
  - Desktop: `md:p-6` or `md:p-8` (1.5rem / 24px or 2rem / 32px)
- **Top Padding**: `pt-16 md:pt-6` or `pt-16 md:pt-8` (accounts for mobile header)

### Spacing Between Elements
- **Small Gap**: `gap-1` (0.25rem / 4px) or `gap-1.5` (0.375rem / 6px)
- **Medium Gap**: `gap-2` (0.5rem / 8px) or `gap-3` (0.75rem / 12px)
- **Large Gap**: `gap-4` (1rem / 16px) or `gap-6` (1.5rem / 24px)
- **Vertical Spacing**: `space-y-3`, `space-y-4`, `space-y-6`, `space-y-8`

### Grid Layouts
- **Responsive Grid**: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5`
- **Gap**: `gap-4` or `gap-6`

## Border Radius

- **Small**: `rounded` (0.25rem / 4px) - Default
- **Medium**: `rounded-lg` (0.5rem / 8px) - Most common for cards and buttons
- **Large**: `rounded-xl` (0.75rem / 12px) - Cards, containers
- **Full**: `rounded-full` (9999px) - Pills, circular elements

## Shadows

- **Subtle Shadow**: `shadow-sm` - Used for cards, buttons
- **Medium Shadow**: `shadow` - Modals, elevated elements
- **Large Shadow**: `shadow-xl` - Modals, popovers

## Components

### Cards

```tsx
<div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark p-6">
  {/* Card content */}
</div>
```

**Variations:**
- **With Header**: Add header section with `bg-gray-50 dark:bg-gray-700/50` and `border-b`
- **Compact**: Use `p-4` instead of `p-6`

### Buttons

#### Primary Button
```tsx
<button className="rounded-lg bg-primary text-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
  Button Text
</button>
```

#### Secondary Button
```tsx
<button className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-[#111418] dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800">
  Button Text
</button>
```

#### Icon Button
```tsx
<button className="p-2 rounded-lg bg-white dark:bg-background-dark border border-gray-200 dark:border-gray-700 shadow-sm">
  <span className="material-symbols-outlined text-[#111418] dark:text-gray-200">icon_name</span>
</button>
```

#### Link Button (Navigation)
```tsx
<Link className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 ${
  isActive ? 'bg-primary/10 text-primary' : 'text-[#111418] dark:text-gray-300'
}`}>
  <span className="material-symbols-outlined text-base">icon</span>
  <p className="text-sm font-medium">Label</p>
</Link>
```

### Input Fields

```tsx
<input
  className="w-full rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-background-light dark:bg-background-dark px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
  type="text"
/>
```

**Label Pattern:**
```tsx
<label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400">
  Label Text
</label>
<input className="mt-2 ..." />
```

### Stats Cards

```tsx
<div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark p-6">
  <p className="text-sm font-medium text-[#617589] dark:text-gray-400 uppercase tracking-[0.1em]">
    Label
  </p>
  <p className="mt-2 text-2xl font-bold text-[#111418] dark:text-white">
    Value
  </p>
  <p className="text-xs text-[#617589] dark:text-gray-500 mt-1">
    Subtext
  </p>
</div>
```

### Tabs

```tsx
<div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
  <button
    className={`px-4 py-2 font-semibold text-sm transition-colors border-b-2 ${
      isActive
        ? 'border-primary text-primary'
        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
    }`}
  >
    Tab Label
  </button>
</div>
```

### Badges/Tags

```tsx
<span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] bg-primary/10 text-primary hover:bg-primary/20 rounded border border-primary/20 transition-colors">
  Badge Text
</span>
```

### Modals

```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
  <div className="bg-white dark:bg-[#111418] rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
    {/* Modal content */}
  </div>
</div>
```

## Icons

- **Icon Library**: Material Symbols (Google Material Icons)
- **Usage**: `<span className="material-symbols-outlined">icon_name</span>`
- **Sizes**:
  - Small: `text-[12px]` or `text-sm`
  - Default: `text-base` (16px)
  - Large: `text-lg` (18px) or `text-2xl` (24px)

**Common Icons:**
- `dashboard` - Dashboard
- `priority_high` - Priorities
- `receipt_long` - Costs/Receipts
- `group` - Groups
- `event` - Calendar/Events
- `groups` - People
- `functions` - Formulas
- `menu` / `close` - Navigation
- `help` - Help/Info
- `publish` - Push/Publish
- `verified` - Verified/Concrete
- `construction` - Sandbox
- `science` - Experimental

## Dark Mode

### Implementation
- Uses Tailwind's `dark:` prefix
- Toggle via `class` attribute on `<html>` or root element
- Pattern: Always provide both light and dark variants

### Common Patterns
```tsx
// Text
className="text-[#111418] dark:text-white"
className="text-[#617589] dark:text-gray-400"

// Backgrounds
className="bg-white dark:bg-background-dark"
className="bg-gray-50/50 dark:bg-[#111418]"

// Borders
className="border-gray-200 dark:border-gray-700"
className="border-[#dbe0e6] dark:border-gray-700"
```

## Page Structure

### Standard Page Layout
```tsx
<div className="min-h-screen bg-gray-50/50 dark:bg-[#111418]">
  <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8 pt-16 md:pt-6">
    {/* Page Header */}
    <div className="space-y-2">
      <p className="uppercase text-xs font-semibold tracking-[0.25em] text-primary">
        Section Label
      </p>
      <h1 className="text-[#111418] dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">
        Page Title
      </h1>
      <p className="text-[#617589] dark:text-gray-400 text-sm max-w-2xl">
        Description text
      </p>
    </div>
    
    {/* Page Content */}
    <div className="space-y-6">
      {/* Content sections */}
    </div>
  </div>
</div>
```

## Loading States

```tsx
<div className="text-center py-12">
  <p className="text-[#617589] dark:text-gray-400">Data laden...</p>
</div>
```

## Empty States

```tsx
<p className="text-center text-gray-400 py-8">Geen items gevonden.</p>
```

## Color Usage Guidelines

### Charts & Data Visualization
- Use consistent color palette: `#137fec`, `#10b981`, `#f59e0b`, `#ef4444`, `#8b5cf6`, `#ec4899`, `#06b6d4`
- Maintain color meaning across charts (e.g., green for positive, red for negative)

### Status Indicators
- **Success/Positive**: Green (`#10b981` or `green-600`)
- **Warning**: Orange/Amber (`#f59e0b` or `amber-500`)
- **Error/Negative**: Red (`#ef4444` or `red-600`)
- **Info**: Blue (primary `#137fec`)

## Responsive Design

### Breakpoints (Tailwind Defaults)
- **sm**: 640px
- **md**: 768px
- **lg**: 1024px
- **xl**: 1280px
- **2xl**: 1536px

### Common Patterns
- Mobile-first approach
- Hide/show elements: `hidden md:block`
- Responsive padding: `p-4 md:p-6`
- Responsive grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

## Accessibility

- **Focus States**: Always include `focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`
- **Contrast**: Ensure sufficient contrast between text and backgrounds
- **Interactive Elements**: Include hover states for better UX
- **ARIA Labels**: Use `aria-label` for icon-only buttons

## Animation & Transitions

- **Transitions**: `transition-colors` for color changes
- **Transforms**: `transform transition-transform duration-300 ease-in-out` for slide animations
- **Hover Effects**: Subtle opacity or color changes

## Code Examples

### Complete Card Example
```tsx
<div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark overflow-hidden">
  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
    <h3 className="text-base font-bold text-[#111418] dark:text-white">Card Title</h3>
  </div>
  <div className="p-4 space-y-3">
    {/* Card content */}
  </div>
</div>
```

### Form Section Example
```tsx
<div className="rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-background-dark p-6">
  <h2 className="text-lg font-semibold text-[#111418] dark:text-white mb-4">Section Title</h2>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#617589] dark:text-gray-400">
        Label
      </label>
      <input
        className="mt-2 w-full rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-background-light dark:bg-background-dark px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        type="text"
      />
    </div>
  </div>
</div>
```

## Tailwind Configuration

Key custom values in `tailwind.config.js`:
```js
{
  colors: {
    primary: "#137fec",
    "background-light": "#f6f7f8",
    "background-dark": "#101922",
  },
  fontFamily: {
    display: ["Manrope", "sans-serif"],
  },
  borderRadius: {
    DEFAULT: "0.25rem",
    lg: "0.5rem",
    xl: "0.75rem",
    full: "9999px",
  },
}
```

## Notes

- Always test in both light and dark modes
- Maintain consistent spacing using Tailwind's spacing scale
- Use semantic color names where possible (primary, success, error)
- Keep component styles consistent across the application
- Prefer composition over custom CSS when possible

