interface ToolbarProps {
  onAddTextItem: () => void
  onUploadImages: () => void
  onToggleHideTitles: () => void
  onResetPlacements: () => void
  onReset: () => void
  onOpenSettings: () => void
  onScreenshot: () => void
  onExport: () => void
  onSaveList: () => void
  onSaveAsNew?: () => void
  activeConfigName?: string
  hideTitles: boolean
  colorsInverted: boolean
}

export function Toolbar({
  onAddTextItem,
  onUploadImages,
  onToggleHideTitles,
  onResetPlacements,
  onReset,
  onOpenSettings,
  onScreenshot,
  onExport,
  onSaveList,
  onSaveAsNew,
  activeConfigName,
  hideTitles,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <button type="button" onClick={onAddTextItem}>
        Add Text Item(s)
      </button>
      <button type="button" onClick={onUploadImages}>
        Upload Image(s)
      </button>
      <button
        type="button"
        onClick={onToggleHideTitles}
        aria-pressed={hideTitles}
      >
        {hideTitles ? 'Show Item Titles' : 'Hide Item Titles'}
      </button>
      <button type="button" onClick={onResetPlacements}>
        Reset Tiers
      </button>
      <button type="button" onClick={onReset}>
        Reset Application
      </button>
      <button type="button" onClick={onOpenSettings}>
        Settings
      </button>
      <button type="button" onClick={onScreenshot}>
        Screenshot
      </button>
      <button type="button" onClick={onExport}>
        Copy JSON
      </button>
      <button type="button" onClick={onSaveList}>
        {activeConfigName ? `Update "${activeConfigName}"` : 'Save List'}
      </button>
      {activeConfigName && onSaveAsNew && (
        <button type="button" onClick={onSaveAsNew}>
          Save As New
        </button>
      )}
    </div>
  )
}
