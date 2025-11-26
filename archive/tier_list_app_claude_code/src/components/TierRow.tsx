import { useState, KeyboardEvent } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ItemCard } from './ItemCard';
import { Item, TierConfig } from '../types';
import './TierRow.css';

interface TierRowProps {
  tier: TierConfig;
  items: Item[];
  onTextChange: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onTierLabelChange: (tierId: string, newLabel: string) => void;
}

export function TierRow({
  tier,
  items,
  onTextChange,
  onDelete,
  onTierLabelChange,
}: TierRowProps) {
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [editLabel, setEditLabel] = useState(tier.label);

  const { setNodeRef, isOver } = useDroppable({
    id: tier.id,
  });

  const handleLabelClick = () => {
    setIsEditingLabel(true);
  };

  const handleLabelSave = () => {
    onTierLabelChange(tier.id, editLabel);
    setIsEditingLabel(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleLabelSave();
    } else if (e.key === 'Escape') {
      setEditLabel(tier.label);
      setIsEditingLabel(false);
    }
  };

  return (
    <div className={`tier-row ${isOver ? 'tier-row-over' : ''}`}>
      <div className="tier-label" style={{ backgroundColor: tier.color }}>
        {isEditingLabel ? (
          <input
            type="text"
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            onBlur={handleLabelSave}
            onKeyDown={handleKeyDown}
            className="tier-label-input"
            autoFocus
          />
        ) : (
          <span onClick={handleLabelClick} className="tier-label-text">
            {tier.label}
          </span>
        )}
      </div>
      <div ref={setNodeRef} className="tier-items">
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={horizontalListSortingStrategy}
        >
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
