import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import html2canvas from 'html2canvas';
import { TierRow } from './components/TierRow';
import { ItemBank } from './components/ItemBank';
import { ItemCard } from './components/ItemCard';
import { Item, TierConfig, Placements, SavedTierList } from './types';
import './App.css';

const STORAGE_KEY = 'tierlist-state';
const SAVED_LISTS_KEY = 'tierlist-saved';

const defaultTierColors = ['#ff4444', '#ff8844', '#ffdd44', '#44ff44', '#4444ff', '#8844ff'];
const invertedTierColors = ['#44ff44', '#4444ff', '#8844ff', '#ffdd44', '#ff8844', '#ff4444'];

function createDefaultItems(): Item[] {
  return Array.from({ length: 8 }, (_, i) => ({
    id: `item-${i + 1}`,
    text: `Box ${i + 1}`,
  }));
}

function createDefaultTierConfigs(inverted: boolean): TierConfig[] {
  const labels = ['S', 'A', 'B', 'C', 'D', 'F'];
  const colors = inverted ? invertedTierColors : defaultTierColors;
  return labels.map((label, i) => ({
    id: label.toLowerCase(),
    label,
    color: colors[i],
  }));
}

function createDefaultPlacements(items: Item[]): Placements {
  return {
    bank: items.map((item) => item.id),
    s: [],
    a: [],
    b: [],
    c: [],
    d: [],
    f: [],
  };
}

function App() {
  const [title, setTitle] = useState('My Tier List');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [colorInverted, setColorInverted] = useState(false);
  const [items, setItems] = useState<Item[]>(createDefaultItems);
  const [tierConfigs, setTierConfigs] = useState<TierConfig[]>(
    () => createDefaultTierConfigs(false)
  );
  const [placements, setPlacements] = useState<Placements>(() =>
    createDefaultPlacements(createDefaultItems())
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [savedLists, setSavedLists] = useState<SavedTierList[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState('');

  const tierListRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setTitle(data.title || 'My Tier List');
        setItems(data.items || createDefaultItems());
        setPlacements(data.placements || createDefaultPlacements(data.items || createDefaultItems()));
        setColorInverted(data.colorInverted || false);
        setTierConfigs(createDefaultTierConfigs(data.colorInverted || false));
        if (data.tierConfigs) {
          setTierConfigs(data.tierConfigs);
        }
      } catch (e) {
        console.error('Failed to load state:', e);
      }
    }

    const savedListsData = localStorage.getItem(SAVED_LISTS_KEY);
    if (savedListsData) {
      try {
        setSavedLists(JSON.parse(savedListsData));
      } catch (e) {
        console.error('Failed to load saved lists:', e);
      }
    }
  }, []);

  useEffect(() => {
    const state = {
      title,
      items,
      placements,
      tierConfigs,
      colorInverted,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [title, items, placements, tierConfigs, colorInverted]);

  const findContainer = (id: string) => {
    if (placements.bank.includes(id)) return 'bank';
    for (const tier of tierConfigs) {
      if (placements[tier.id]?.includes(id)) return tier.id;
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId) || overId;

    if (!activeContainer) return;

    if (activeContainer === overContainer) {
      const containerItems = placements[activeContainer];
      const oldIndex = containerItems.indexOf(activeId);
      const newIndex = containerItems.indexOf(overId);

      if (oldIndex !== -1 && newIndex !== -1) {
        setPlacements({
          ...placements,
          [activeContainer]: arrayMove(containerItems, oldIndex, newIndex),
        });
      }
    } else {
      setPlacements({
        ...placements,
        [activeContainer]: placements[activeContainer].filter((id) => id !== activeId),
        [overContainer]: [...(placements[overContainer] || []), activeId],
      });
    }
  };

  const handleTextChange = (id: string, text: string) => {
    setItems(items.map((item) => (item.id === id ? { ...item, text } : item)));
  };

  const handleDelete = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
    const newPlacements = { ...placements };
    Object.keys(newPlacements).forEach((key) => {
      newPlacements[key] = newPlacements[key].filter((itemId) => itemId !== id);
    });
    setPlacements(newPlacements);
  };

  const handleAddItem = () => {
    const newId = `item-${Date.now()}`;
    const newItem: Item = {
      id: newId,
      text: `Box ${items.length + 1}`,
    };
    setItems([...items, newItem]);
    setPlacements({
      ...placements,
      bank: [...placements.bank, newId],
    });
  };

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 50;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, size, size);
          const resizedImage = canvas.toDataURL('image/png');

          const newId = `item-${Date.now()}`;
          const newItem: Item = {
            id: newId,
            text: `Box ${items.length + 1}`,
            image: resizedImage,
          };
          setItems([...items, newItem]);
          setPlacements({
            ...placements,
            bank: [...placements.bank, newId],
          });
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleTierLabelChange = (tierId: string, newLabel: string) => {
    setTierConfigs(
      tierConfigs.map((tier) =>
        tier.id === tierId ? { ...tier, label: newLabel } : tier
      )
    );
  };

  const handleInvertColors = () => {
    const newInverted = !colorInverted;
    setColorInverted(newInverted);
    setTierConfigs(createDefaultTierConfigs(newInverted).map((defaultTier, i) => ({
      ...tierConfigs[i],
      color: defaultTier.color,
    })));
  };

  const handleReset = () => {
    setPlacements(createDefaultPlacements(items));
  };

  const handleExportImage = async () => {
    if (tierListRef.current) {
      try {
        const canvas = await html2canvas(tierListRef.current, {
          backgroundColor: '#1a1a1a',
          scale: 2,
        });

        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${title.replace(/\s+/g, '-')}-${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(url);
          }
        });
      } catch (error) {
        console.error('Failed to export image:', error);
        alert('Failed to export image');
      }
    }
  };

  const handleExportJSON = () => {
    const data = {
      title,
      items,
      placements,
      tierConfigs,
      colorInverted,
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '-')}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target?.result as string);
            setTitle(data.title || 'My Tier List');
            setItems(data.items || createDefaultItems());
            setPlacements(data.placements || createDefaultPlacements(data.items || createDefaultItems()));
            setColorInverted(data.colorInverted || false);
            setTierConfigs(data.tierConfigs || createDefaultTierConfigs(data.colorInverted || false));
          } catch (error) {
            console.error('Failed to import:', error);
            alert('Failed to import JSON file');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleSave = () => {
    if (!saveName.trim()) {
      alert('Please enter a name for this tier list');
      return;
    }

    const newSaved: SavedTierList = {
      id: `saved-${Date.now()}`,
      name: saveName,
      timestamp: Date.now(),
      title,
      items,
      placements,
      tierConfigs,
      colorInverted,
    };

    const updated = [...savedLists, newSaved];
    setSavedLists(updated);
    localStorage.setItem(SAVED_LISTS_KEY, JSON.stringify(updated));
    setSaveDialogOpen(false);
    setSaveName('');
  };

  const handleLoadSaved = (saved: SavedTierList) => {
    setTitle(saved.title);
    setItems(saved.items);
    setPlacements(saved.placements);
    setTierConfigs(saved.tierConfigs);
    setColorInverted(saved.colorInverted);
  };

  const handleDeleteSaved = (id: string) => {
    const updated = savedLists.filter((s) => s.id !== id);
    setSavedLists(updated);
    localStorage.setItem(SAVED_LISTS_KEY, JSON.stringify(updated));
  };

  const handleTitleClick = () => {
    setIsEditingTitle(true);
  };

  const handleTitleSave = () => {
    setTitle(editTitle);
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setEditTitle(title);
      setIsEditingTitle(false);
    }
  };

  const activeItem = activeId ? items.find((item) => item.id === activeId) : null;

  return (
    <div className="app">
      <div className="header">
        <div className="title-container" onClick={handleTitleClick}>
          {isEditingTitle ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleTitleKeyDown}
              className="title-input"
              autoFocus
            />
          ) : (
            <h1>{title}</h1>
          )}
        </div>
      </div>

      <div className="toolbar">
        <button onClick={handleReset}>Reset Tiers</button>
        <button onClick={handleInvertColors}>
          Invert Colors ({colorInverted ? 'Green→Red' : 'Red→Green'})
        </button>
        <button onClick={handleExportImage}>Export as Image</button>
        <button onClick={handleExportJSON}>Export JSON</button>
        <button onClick={handleImportJSON}>Import JSON</button>
        <button onClick={() => setSaveDialogOpen(true)}>Save Tier List</button>
      </div>

      {saveDialogOpen && (
        <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#2a2a2a', borderRadius: '8px' }}>
          <input
            type="text"
            placeholder="Enter tier list name..."
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            style={{ marginRight: '0.5rem', padding: '0.5rem', width: '300px' }}
          />
          <button onClick={handleSave}>Save</button>
          <button onClick={() => setSaveDialogOpen(false)} style={{ marginLeft: '0.5rem' }}>
            Cancel
          </button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div ref={tierListRef} className="tier-list">
          {tierConfigs.map((tier) => (
            <TierRow
              key={tier.id}
              tier={tier}
              items={items.filter((item) =>
                placements[tier.id]?.includes(item.id)
              )}
              onTextChange={handleTextChange}
              onDelete={handleDelete}
              onTierLabelChange={handleTierLabelChange}
            />
          ))}
        </div>

        <div className="item-bank-container">
          <ItemBank
            items={items.filter((item) => placements.bank.includes(item.id))}
            onTextChange={handleTextChange}
            onDelete={handleDelete}
            onAddItem={handleAddItem}
            onImageUpload={handleImageUpload}
          />
        </div>

        <DragOverlay>
          {activeItem ? (
            <div style={{ cursor: 'grabbing' }}>
              <ItemCard
                item={activeItem}
                onTextChange={handleTextChange}
                onDelete={handleDelete}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {savedLists.length > 0 && (
        <div className="saved-lists">
          <h2>Saved Tier Lists</h2>
          <div className="saved-lists-grid">
            {savedLists.map((saved) => (
              <div key={saved.id} className="saved-list-card">
                <h3>{saved.name}</h3>
                <div className="timestamp">
                  {new Date(saved.timestamp).toLocaleString()}
                </div>
                <div className="actions">
                  <button onClick={() => handleLoadSaved(saved)}>Load</button>
                  <button onClick={() => handleDeleteSaved(saved.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
