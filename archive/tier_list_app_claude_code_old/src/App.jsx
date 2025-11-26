import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import './App.css';

function App() {
  const [title, setTitle] = useState('My Tier List');
  const [isInvertedColors, setIsInvertedColors] = useState(false);
  const [savedLists, setSavedLists] = useState([]);
  const tierListRef = useRef(null);

  const [tiers, setTiers] = useState([
    { id: 'S', name: 'S' },
    { id: 'A', name: 'A' },
    { id: 'B', name: 'B' },
    { id: 'C', name: 'C' },
    { id: 'D', name: 'D' },
    { id: 'F', name: 'F' }
  ]);

  const createDefaultItems = () => {
    return Array.from({ length: 8 }, (_, i) => ({
      id: `item-${Date.now()}-${i}`,
      text: `Item ${i + 1}`,
      image: null
    }));
  };

  const [items, setItems] = useState(createDefaultItems());
  const [tierItems, setTierItems] = useState({
    'S': [], 'A': [], 'B': [], 'C': [], 'D': [], 'F': []
  });

  const [draggedItem, setDraggedItem] = useState(null);
  const [draggedFrom, setDraggedFrom] = useState(null);

  const getTierGradientClass = (tierId) => {
    const suffix = isInvertedColors ? '-inv' : '';
    return `tier-gradient-${tierId.toLowerCase()}${suffix}`;
  };

  // Handle drag start
  const handleDragStart = (e, item, source) => {
    setDraggedItem(item);
    setDraggedFrom(source);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('dragging');
  };

  // Handle drag end
  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
  };

  // Handle drag over
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Handle drop
  const handleDrop = (e, targetTier) => {
    e.preventDefault();

    if (!draggedItem) return;

    // Remove from source
    if (draggedFrom === 'pool') {
      setItems(items.filter(item => item.id !== draggedItem.id));
    } else {
      setTierItems(prev => ({
        ...prev,
        [draggedFrom]: prev[draggedFrom].filter(item => item.id !== draggedItem.id)
      }));
    }

    // Add to target
    if (targetTier === 'pool') {
      setItems(prev => [...prev, draggedItem]);
    } else {
      setTierItems(prev => ({
        ...prev,
        [targetTier]: [...prev[targetTier], draggedItem]
      }));
    }

    setDraggedItem(null);
    setDraggedFrom(null);
  };

  // Edit item text
  const handleEditItem = (itemId, newText, source, tierId = null) => {
    if (source === 'pool') {
      setItems(prev => prev.map(item =>
        item.id === itemId ? { ...item, text: newText } : item
      ));
    } else {
      setTierItems(prev => ({
        ...prev,
        [tierId]: prev[tierId].map(item =>
          item.id === itemId ? { ...item, text: newText } : item
        )
      }));
    }
  };

  // Delete item
  const handleDeleteItem = (itemId, source, tierId = null) => {
    if (source === 'pool') {
      setItems(prev => prev.filter(item => item.id !== itemId));
    } else {
      setTierItems(prev => ({
        ...prev,
        [tierId]: prev[tierId].filter(item => item.id !== itemId)
      }));
    }
  };

  // Add new item
  const handleAddItem = () => {
    const newItem = {
      id: `item-${Date.now()}`,
      text: `Item ${items.length + 1}`,
      image: null
    };
    setItems(prev => [...prev, newItem]);
  };

  // Reset all items to pool
  const handleReset = () => {
    const allItems = [...items];
    Object.values(tierItems).forEach(tierItemList => {
      allItems.push(...tierItemList);
    });
    setItems(allItems);
    setTierItems({ 'S': [], 'A': [], 'B': [], 'C': [], 'D': [], 'F': [] });
  };

  // Edit tier name
  const handleEditTierName = (tierId, newName) => {
    setTiers(prev => prev.map(tier =>
      tier.id === tierId ? { ...tier, name: newName } : tier
    ));
  };

  // Toggle color theme
  const handleToggleColors = () => {
    setIsInvertedColors(prev => !prev);
  };

  // Handle image upload
  const handleImageUpload = (e, itemId, source, tierId = null) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const size = 60;
          canvas.width = size;
          canvas.height = size;

          const scale = Math.min(size / img.width, size / img.height);
          const x = (size - img.width * scale) / 2;
          const y = (size - img.height * scale) / 2;

          ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
          const resizedImage = canvas.toDataURL();

          if (source === 'pool') {
            setItems(prev => prev.map(item =>
              item.id === itemId ? { ...item, image: resizedImage } : item
            ));
          } else {
            setTierItems(prev => ({
              ...prev,
              [tierId]: prev[tierId].map(item =>
                item.id === itemId ? { ...item, image: resizedImage } : item
              )
            }));
          }
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  // Export as image
  const handleExportImage = async () => {
    if (tierListRef.current) {
      const canvas = await html2canvas(tierListRef.current);
      const link = document.createElement('a');
      link.download = `${title.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  // Export as JSON
  const handleExportJSON = () => {
    const data = {
      title,
      tiers,
      items,
      tierItems,
      isInvertedColors
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = `${title.replace(/\s+/g, '_')}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
  };

  // Import JSON
  const handleImportJSON = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          setTitle(data.title || 'My Tier List');
          setTiers(data.tiers || tiers);
          setItems(data.items || []);
          setTierItems(data.tierItems || { 'S': [], 'A': [], 'B': [], 'C': [], 'D': [], 'F': [] });
          setIsInvertedColors(data.isInvertedColors || false);
        } catch (error) {
          alert('Error importing file. Please check the file format.');
        }
      };
      reader.readAsText(file);
    }
  };

  // Save current tier list
  const handleSave = () => {
    const savedList = {
      id: Date.now(),
      title,
      tiers,
      items,
      tierItems,
      isInvertedColors,
      savedAt: new Date().toLocaleString()
    };
    setSavedLists(prev => [...prev, savedList]);
  };

  // Load saved tier list
  const handleLoad = (savedList) => {
    setTitle(savedList.title);
    setTiers(savedList.tiers);
    setItems(savedList.items);
    setTierItems(savedList.tierItems);
    setIsInvertedColors(savedList.isInvertedColors);
  };

  // Delete saved tier list
  const handleDeleteSaved = (id) => {
    setSavedLists(prev => prev.filter(list => list.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl space-y-8">
        {/* Controls */}
        <div className="flex flex-wrap gap-3 justify-end">
          <button
            onClick={handleAddItem}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/70 text-slate-100 hover:bg-slate-800/80 hover:border-green-500 px-4 py-2 text-sm font-medium shadow-sm transition-all duration-200"
          >
            + Add Item
          </button>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/70 text-slate-100 hover:bg-slate-800/80 hover:border-green-500 px-4 py-2 text-sm font-medium shadow-sm transition-all duration-200"
          >
            🔄 Reset
          </button>
          <button
            onClick={handleToggleColors}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/70 text-slate-100 hover:bg-slate-800/80 hover:border-green-500 px-4 py-2 text-sm font-medium shadow-sm transition-all duration-200"
          >
            🎨 Inverse
          </button>
          <button
            onClick={handleExportImage}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/70 text-slate-100 hover:bg-slate-800/80 hover:border-green-500 px-4 py-2 text-sm font-medium shadow-sm transition-all duration-200"
          >
            📸 Image
          </button>
          <button
            onClick={handleExportJSON}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/70 text-slate-100 hover:bg-slate-800/80 hover:border-green-500 px-4 py-2 text-sm font-medium shadow-sm transition-all duration-200"
          >
            💾 Export
          </button>
          <label className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/70 text-slate-100 hover:bg-slate-800/80 hover:border-green-500 px-4 py-2 text-sm font-medium shadow-sm transition-all duration-200 cursor-pointer">
            📂 Import
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/80 bg-emerald-500 text-slate-950 hover:bg-emerald-400 hover:border-emerald-300 px-4 py-2 text-sm font-medium shadow-sm transition-all duration-200"
          >
            💾 Save
          </button>
        </div>

        {/* Tier List */}
        <section ref={tierListRef} className="rounded-3xl border border-white/10 bg-slate-900/60 shadow-[0_30px_80px_rgba(0,0,0,0.75)] backdrop-blur-xl p-6 sm:p-8 space-y-6">
          {/* Title */}
          <header className="text-center">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-2xl sm:text-3xl font-semibold tracking-tight text-center bg-transparent border-2 border-transparent hover:border-slate-700 focus:border-slate-600 focus:outline-none text-white px-4 py-2 rounded-lg transition-all duration-200"
              placeholder="My Tier List"
            />
          </header>

          {/* Tiers */}
          <div className="space-y-3">
            {tiers.map((tier) => (
              <div key={tier.id} className="flex items-stretch rounded-2xl bg-slate-900/70 border border-slate-700/70 overflow-hidden">
                {/* Tier Label with Gradient */}
                <div className={`glass-tier ${getTierGradientClass(tier.id)} flex items-center justify-center w-20 sm:w-24 text-xl font-semibold text-white`}>
                  <input
                    type="text"
                    value={tier.name}
                    onChange={(e) => handleEditTierName(tier.id, e.target.value)}
                    className="w-full text-xl font-semibold text-center bg-transparent border-none text-white focus:outline-none focus:bg-black/20 rounded px-2 py-1"
                  />
                </div>

                {/* Tier Content */}
                <div
                  className="flex-1 px-4 py-3 flex items-center gap-3 flex-wrap"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, tier.id)}
                >
                  {tierItems[tier.id].map((item) => (
                    <div
                      key={item.id}
                      className="relative inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-slate-100 shadow-sm hover:bg-slate-700/80 hover:border-green-500 transition cursor-move group"
                      draggable
                      onDragStart={(e) => handleDragStart(e, item, tier.id)}
                      onDragEnd={handleDragEnd}
                    >
                      <button
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 hover:bg-red-500 text-white rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center shadow z-10"
                        onClick={() => handleDeleteItem(item.id, 'tier', tier.id)}
                      >
                        ×
                      </button>
                      {item.image ? (
                        <img src={item.image} alt="" className="h-6 w-6 rounded-md bg-slate-700/80 object-cover" />
                      ) : (
                        <span className="h-6 w-6 rounded-md bg-slate-700/80" />
                      )}
                      <input
                        type="text"
                        value={item.text}
                        onChange={(e) => handleEditItem(item.id, e.target.value, 'tier', tier.id)}
                        className="bg-transparent border-none focus:outline-none text-sm text-slate-100 min-w-[60px]"
                      />
                      <label className="cursor-pointer opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity">
                        📷
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, item.id, 'tier', tier.id)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Item Pool */}
          <div className="pt-2 space-y-4">
            <p className="text-center text-xs tracking-[0.2em] uppercase text-slate-400">
              Items to Rank
            </p>
            <div
              className="flex flex-wrap gap-3 justify-center"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'pool')}
            >
              {items.map((item) => (
                <div
                  key={item.id}
                  className="relative rounded-xl border border-white/10 bg-slate-900/70 px-4 py-2 text-sm text-slate-100 shadow-sm hover:bg-slate-800 hover:border-green-500 transition cursor-move group"
                  draggable
                  onDragStart={(e) => handleDragStart(e, item, 'pool')}
                  onDragEnd={handleDragEnd}
                >
                  <button
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 hover:bg-red-500 text-white rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center shadow z-10"
                    onClick={() => handleDeleteItem(item.id, 'pool')}
                  >
                    ×
                  </button>
                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) => handleEditItem(item.id, e.target.value, 'pool')}
                    className="bg-transparent border-none focus:outline-none text-sm text-slate-100 min-w-[60px] text-center"
                  />
                  <label className="ml-2 cursor-pointer opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity">
                    📷
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, item.id, 'pool')}
                      className="hidden"
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Saved Lists */}
        {savedLists.length > 0 && (
          <section className="rounded-3xl border border-white/10 bg-slate-900/70 shadow-[0_24px_60px_rgba(0,0,0,0.7)] backdrop-blur-xl p-6 sm:p-8 space-y-5">
            <h2 className="text-lg sm:text-xl font-semibold text-center">
              Saved Tier Lists
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              {savedLists.map((savedList) => (
                <article
                  key={savedList.id}
                  className="rounded-2xl border border-slate-700/70 bg-slate-900/70 px-4 py-4 space-y-3"
                >
                  <div>
                    <h3 className="text-sm font-medium truncate">{savedList.title}</h3>
                    <p className="text-xs text-slate-400">{savedList.savedAt}</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleLoad(savedList)}
                      className="flex-1 rounded-xl bg-slate-100 text-slate-900 text-sm font-medium py-2 hover:bg-white transition"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => handleDeleteSaved(savedList.id)}
                      className="flex-1 rounded-xl border border-red-500/60 text-red-400 text-sm font-medium py-2 hover:bg-red-500/10 transition"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default App;
