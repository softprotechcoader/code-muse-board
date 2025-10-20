# React Key Warning Fix

## Issue
```
Warning: Each child in a list should have a unique "key" prop.
Check the render method of `Dashboard`.
```

## Root Cause
Found on **line 1098-1114** in `Dashboard.tsx`:

```tsx
// ❌ BEFORE (Problematic)
{['All', 'Frontend', 'AI & ML', 'Tools', 'Trending'].map((cat) => (
  cat !== selectedCategory && (
    <Button key={cat} ...>
      {cat}
    </Button>
  )
))}
```

**Problem**: When `.map()` is used with a conditional that returns `false`, React receives an array containing both:
- `<Button>` elements with keys
- `false` values without keys

This causes React to throw a key prop warning because not all children in the list have keys.

## Solution

Use `.filter()` before `.map()` to remove unwanted items:

```tsx
// ✅ AFTER (Fixed)
{['All', 'Frontend', 'AI & ML', 'Tools', 'Trending']
  .filter((cat) => cat !== selectedCategory)
  .map((cat) => (
    <Button key={cat} ...>
      {cat}
    </Button>
  ))}
```

**Why this works**:
- `.filter()` removes categories that match the selected category
- `.map()` only returns Button elements (no false values)
- Every child in the array has a unique key prop
- React is happy! 🎉

## Best Practice

### ❌ DON'T do this:
```tsx
{items.map(item => (
  condition && <Component key={item.id} />
))}
```

### ✅ DO this instead:
```tsx
{items
  .filter(item => condition)
  .map(item => <Component key={item.id} />)
}
```

## Verification
- ✅ Warning resolved
- ✅ All other lists in Dashboard have proper keys
- ✅ No new errors introduced

---

**File Modified**: `src/pages/Dashboard.tsx` (line 1098-1114)  
**Date**: October 20, 2025  
**Status**: ✅ Fixed
