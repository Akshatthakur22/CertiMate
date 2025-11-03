# 🚀 Quick Reference: Responsive Classes

Copy-paste these patterns for instant responsive design.

## 📐 Typography

```tsx
{/* Large Heading */}
<h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold">

{/* Medium Heading */}
<h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold">

{/* Small Heading */}
<h3 className="text-xl sm:text-2xl font-bold">

{/* Body Text */}
<p className="text-base sm:text-lg">

{/* Small Text */}
<span className="text-xs sm:text-sm">
```

## 📦 Spacing

```tsx
{/* Section Padding */}
<section className="py-12 sm:py-16 md:py-24">

{/* Container Padding */}
<div className="px-4 sm:px-6 md:px-8">

{/* Card Padding */}
<Card className="p-6 sm:p-8 md:p-10">

{/* Margins */}
<div className="mt-6 sm:mt-8 md:mt-12">
```

## 📱 Layouts

```tsx
{/* Grid - 1 → 2 → 3 columns */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">

{/* Flex - Stack → Row */}
<div className="flex flex-col sm:flex-row gap-3 sm:gap-4">

{/* Centered Container */}
<div className="max-w-7xl mx-auto px-4">
```

## 🎯 Buttons

```tsx
{/* Full-width on mobile */}
<Button className="w-full sm:w-auto px-6 py-3">
  Click me
</Button>

{/* Button Group */}
<div className="flex flex-col sm:flex-row gap-3">
  <Button className="w-full sm:w-auto">Primary</Button>
  <Button className="w-full sm:w-auto">Secondary</Button>
</div>
```

## 🖼️ Media

```tsx
{/* Responsive Image */}
<img className="w-full h-auto max-w-md mx-auto" />

{/* Aspect Ratio */}
<div className="aspect-video sm:aspect-square">

{/* Responsive Icon */}
<Icon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
```

## 🌙 Dark Mode

```tsx
{/* Background */}
<div className="bg-white dark:bg-gray-900">

{/* Text */}
<p className="text-gray-900 dark:text-gray-100">

{/* Border */}
<div className="border-gray-200 dark:border-gray-700">

{/* Card */}
<Card className="bg-white dark:bg-gray-800">
```

## 🎨 Common Patterns

```tsx
{/* Hero Section */}
<section className="py-12 sm:py-16 md:py-24 px-4">
  <div className="max-w-7xl mx-auto">
    <h1 className="text-3xl sm:text-4xl md:text-5xl">
    </h1>
  </div>
</section>

{/* Feature Cards */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <Card className="p-6 sm:p-8">
    {/* Content */}
  </Card>
</div>

{/* Form Layout */}
<div className="max-w-2xl mx-auto px-4 py-8">
  <input className="w-full px-4 py-3 text-base" />
  <Button className="w-full sm:w-auto mt-4">
    Submit
  </Button>
</div>
```

---

## ✅ Quick Checklist

- [ ] Headings scale with screen size
- [ ] Buttons full-width on mobile
- [ ] Grids stack on mobile
- [ ] Padding increases with screen size
- [ ] No horizontal scroll
- [ ] Touch targets ≥44px
- [ ] Dark mode variants added
- [ ] Tested at 360px, 768px, 1024px

---

**Need more?** See `RESPONSIVE_DESIGN_GUIDE.md` for detailed documentation.

