import { useState, KeyboardEvent } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Item } from '../types';
import './ItemCard.css';

interface ItemCardProps {
  item: Item;
  onTextChange: (id: string, text: string) => void;
  onDelete: (id: string) => void;
}

export function ItemCard({ item, onTextChange, onDelete }: ItemCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleTextClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleTextSave = () => {
    onTextChange(item.id, editText);
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTextSave();
    } else if (e.key === 'Escape') {
      setEditText(item.text);
      setIsEditing(false);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(item.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="item-card"
      {...attributes}
      {...listeners}
    >
      <button className="delete-btn" onClick={handleDelete}>
        ×
      </button>

      {item.image ? (
        <img src={item.image} alt={item.text} className="item-image" />
      ) : (
        <div className="item-placeholder" />
      )}

      {isEditing ? (
        <input
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleTextSave}
          onKeyDown={handleKeyDown}
          className="item-text-input"
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div className="item-text" onClick={handleTextClick}>
          {item.text}
        </div>
      )}
    </div>
  );
}
