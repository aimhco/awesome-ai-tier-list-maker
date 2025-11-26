# Tier List Maker

A fully-featured web application for creating and managing tier lists with drag-and-drop functionality.

## Features

✨ **Core Features:**
- Drag and drop items between tiers (S, A, B, C, D, F by default)
- Upload custom images for ranking
- Item bank for unranked items
- Dark theme with neon accents
- Editable title (click to edit)

📸 **Import/Export:**
- Screenshot functionality (saves to Downloads folder)
- Export tier list as JSON
- Import tier list from JSON
- Automatic localStorage persistence

🎨 **Tier Customization:**
- Add new tiers with custom names and colors
- Delete tiers (items move to Item Bank)
- Rename tiers via settings modal
- Change color of each tier
- Invert tier colors (reverses color gradient only, not tier order)
- Reorder tiers by dragging them up or down
- Settings accessed via gear icon (⚙️) on each tier

🗑️ **Item Management:**
- Delete items individually (hover and click ×)
- Smart reset: first click moves items to bank, second click clears bank

## How to Use

### Getting Started

1. **Open the App:**
   - Open `index.html` in any modern web browser
   - Or double-click `open-app.command` on macOS

2. **Customize Title:**
   - Click on "Tier List Maker" at the top to edit
   - Press Enter or click away to save

### Managing Items

3. **Upload Images:**
   - Click "📤 Upload Image" to add items to the item bank
   - Multiple images can be uploaded one at a time

4. **Rank Items:**
   - Drag items from Item Bank to any tier
   - Drag items between tiers to rerank
   - Drag items back to Item Bank to unrank
   - Hover over items and click × to delete

### Customizing Tiers

5. **Tier Settings (⚙️):**
   - Click the gear icon on any tier to open settings
   - Change tier name
   - Change tier color
   - Delete tier (items move to Item Bank)

6. **Reorder Tiers:**
   - Click and drag any tier row up or down
   - Drop it where you want it positioned

7. **Add New Tiers:**
   - Click "➕ Add Tier" to create a new tier
   - Customize via the gear icon

8. **Invert Colors:**
   - Click "🎨 Invert Colors" to reverse the color gradient
   - Note: This only changes colors, not tier order

### Saving & Sharing

9. **Screenshot:**
   - Click "📸 Screenshot" to save an image of your tier list
   - Image saves to your Downloads folder

10. **Export/Import:**
    - Click "📤 Export JSON" to save your complete tier list
    - Click "📥 Import JSON" to load a previously saved tier list
    - JSON files include all tiers, items, colors, and custom names

### Reset

11. **Smart Reset:**
    - First click: Moves all items from tiers back to Item Bank
    - Second click: Removes all items from Item Bank completely
    - Always shows confirmation before action

## Technical Details

- Pure HTML, CSS, and JavaScript (no build process required)
- Uses html2canvas library for screenshot functionality
- Data persists automatically in browser localStorage
- Responsive design works on desktop and mobile
- Drag-and-drop API for smooth interactions

## Browser Compatibility

Works in all modern browsers:
- Chrome/Edge (recommended)
- Firefox
- Safari

## File Structure

```
tier_list_app_claude_desktop/
├── index.html         # Main HTML structure
├── styles.css         # Styling and theme
├── app.js             # Application logic
├── README.md          # This file
└── open-app.command   # macOS launcher
```

## Keyboard Shortcuts

- Click title and type to rename
- Enter to save title
- Tab through interactive elements
- Escape to close modal (click outside also works)

## Tips

- Screenshots save to Downloads folder (browser security restriction)
- All data saves automatically to browser localStorage
- Clearing browser data will reset the app
- JSON exports can be shared with others
- You can have unlimited tiers and items
- Tier order is preserved when exporting/importing

Enjoy creating tier lists! 🎉
