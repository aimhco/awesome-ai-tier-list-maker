import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { ItemCard } from './ItemCard';
import { Item } from '../types';
import './ItemBank.css';

interface ItemBankProps {
  items: Item[];
  onTextChange: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onAddItem: () => void;
  onImageUpload: (file: File) => void;
}

export function ItemBank({
  items,
  onTextChange,
  onDelete,
  onAddItem,
  onImageUpload,
}: ItemBankProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'bank',
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageUpload(file);
      e.target.value = '';
    }
  };

  return (
    <div className="item-bank-wrapper">
      <div className="item-bank-header">
        <h2>Item Bank</h2>
        <div className="item-bank-actions">
          <button onClick={onAddItem}>+ New Item</button>
          <label htmlFor="image-upload" className="upload-label">
            Upload Image
          </label>
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
          />
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={`item-bank ${isOver ? 'item-bank-over' : ''}`}
      >
        <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onTextChange={onTextChange}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
