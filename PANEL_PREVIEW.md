# 🎨 Floating Panel Preview

## What It Looks Like

```
┌─────────────────────────────────────┐
│ 🎯 Jobs Filter              − × │  ← Blue header (draggable)
├─────────────────────────────────────┤
│                                     │
│  Hide Reposted Jobs        ⚪→⚫  │  ← Toggle switch
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Time Range                         │
│  ┌──────┐ hours                    │  ← Number input
│  │  24  │                          │
│  └──────┘                          │
│  Enter 0 to show all jobs          │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Blacklisted Companies              │
│  ┌─────────────────────────────┐  │
│  │ Type company name...        │  │  ← Text input
│  └─────────────────────────────┘  │
│                                     │
│  ┌──────────────┐ ┌──────────────┐│
│  │ High Code  × │ │ Jobs Via... ×││  ← Company tags
│  └──────────────┘ └──────────────┘│
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Filter Results                     │
│  ┌───────────────────────────────┐ │
│  │   25        18         7      │ │  ← Live stats
│  │  Total    Visible   Hidden    │ │
│  └───────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

---

## Minimized View

```
┌─────────────────────────┐
│ 🎯 Jobs Filter    − × │  ← Only header visible
└─────────────────────────┘
```

---

## Color Scheme

### Header
- **Background**: Linear gradient
  - Start: `#0a66c2` (LinkedIn blue)
  - End: `#004182` (Darker blue)
- **Text**: White
- **Buttons**: White with transparency

### Body
- **Background**: White
- **Text**: Dark gray (#333)
- **Borders**: Light gray (#e0e0e0)
- **Inputs**: Light border (#d0d0d0)

### Toggle Switch
- **Off**: Gray (#ccc)
- **On**: LinkedIn blue (#0a66c2)
- **Knob**: White

### Company Tags
- **Background**: LinkedIn blue (#0a66c2)
- **Text**: White
- **Remove button**: White × symbol

### Stats
- **Background**: Light gray (#f5f5f5)
- **Numbers**: Large, bold, dark (#333)
- **Labels**: Small, light (#666)

---

## Interactions

### Dragging
```
1. Hover over header → Cursor changes to "move"
2. Click and hold → Panel follows mouse
3. Release → Panel stays in new position
```

### Toggle Switch
```
OFF: ⚪────  (Gray background)
ON:  ────⚫  (Blue background)
```

### Minimize Button
```
Click −  → Panel collapses to header only
Click −  → Panel expands to full view
```

### Close Button
```
Click ×  → Panel disappears
Click extension icon → Panel reappears
```

### Company Tags
```
Type "High Code" + Enter → Tag appears: │ High Code × │
Click × → Tag disappears
```

---

## Responsive Behavior

### Normal (320px wide)
```
┌─────────────────────────────────────┐
│ Full panel with all controls        │
│ Stats in 3 columns                  │
└─────────────────────────────────────┘
```

### Minimized (200px wide)
```
┌─────────────────────────┐
│ Header only             │
└─────────────────────────┘
```

---

## Positioning

### Default
- **Top**: 100px from top of page
- **Right**: 20px from right edge
- **Fixed**: Stays in place when scrolling

### After Dragging
- **Top**: Wherever you drop it
- **Left**: Wherever you drop it
- **Fixed**: Still stays in place when scrolling

---

## Animations

### Panel Entrance
```
From: Invisible, 100px to the right
To:   Visible, in position
Duration: 0.3s
Easing: ease-out
```

### Toggle Switch
```
From: Knob on left, gray background
To:   Knob on right, blue background
Duration: 0.3s
Easing: smooth
```

### Button Hover
```
From: 20% white opacity
To:   30% white opacity
Duration: 0.2s
```

---

## Real-time Updates

### When You Toggle "Hide Reposted"
```
1. Toggle switches ON
2. Jobs with "Reposted" disappear from page
3. Stats update:
   Total: 25 → 25
   Visible: 25 → 18
   Hidden: 0 → 7
```

### When You Add Company
```
1. Type "High Code" + Enter
2. Tag appears: │ High Code × │
3. Jobs from High Code disappear
4. Stats update:
   Total: 25 → 25
   Visible: 18 → 15
   Hidden: 7 → 10
```

### When You Change Time Range
```
1. Enter "24" in Time Range
2. Jobs older than 24h disappear
3. Stats update:
   Total: 25 → 25
   Visible: 15 → 12
   Hidden: 10 → 13
```

---

## Example States

### State 1: All Filters Off
```
Filter Results
─────────────
Total:    25
Visible:  25
Hidden:    0
```

### State 2: Hide Reposted ON
```
Filter Results
─────────────
Total:    25
Visible:  18
Hidden:    7
```

### State 3: Hide Reposted + 2 Companies Blacklisted
```
Filter Results
─────────────
Total:    25
Visible:  15
Hidden:   10
```

### State 4: All Filters Active
```
Filter Results
─────────────
Total:    25
Visible:   8
Hidden:   17
```

---

## 🎯 Try It Now!

1. Reload the extension
2. Go to LinkedIn Jobs
3. Click the extension icon
4. See the beautiful floating panel!
5. Drag it around
6. Toggle filters
7. Watch stats update in real-time

**It's much better than a popup!** 🚀

