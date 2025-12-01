interface ToolbarProps {
  onReset: () => void
  onOpenSettings: () => void
  onScreenshot: () => void
  onExport: () => void
  colorsInverted: boolean
}

export function Toolbar({
  onReset,
  onOpenSettings,
  onScreenshot,
  onExport,
}: ToolbarProps) {
  return (
    <div className="toolbar">
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
    </div>
  )
}
