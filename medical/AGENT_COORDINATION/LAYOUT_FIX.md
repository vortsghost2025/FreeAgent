# Layout Fix - Bottom Panel Covering Chat

## Issue
The "Task Timeline" panel at the bottom was covering the chat input after page load.

## Root Cause
The `bottom-panel` was INSIDE the `main-layout` div, which has `display: flex` (row by default). This caused the bottom-panel to be treated as a 4th column in the row instead of sitting at the bottom of the page.

**Before (broken):**
```html
<div class="main-layout">    <!-- flex row -->
  <div class="left-sidebar">...</div>
  <div class="center-panel">...</div>
  <div class="right-panel">...</div>
  <div class="bottom-panel">...</div>  <!-- 4th column! Wrong! -->
</div>
```

**After (fixed):**
```html
<div class="main-layout">    <!-- flex row -->
  <div class="left-sidebar">...</div>
  <div class="center-panel">...</div>
  <div class="right-panel">...</div>
</div>  <!-- main-layout ends here -->
<div class="bottom-panel">...</div>  <!-- Now sits at bottom -->
```

## Changes Made
1. Moved `bottom-panel` OUTSIDE the `main-layout` div
2. Added `z-index: 5` to bottom-panel CSS
3. Added `flex-shrink: 0` to bottom-panel CSS

## To Apply
Hard refresh the browser: **Ctrl+F5**

---

**This is fix #24** 🦞
