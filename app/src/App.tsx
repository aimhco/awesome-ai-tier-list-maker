import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core'
import type {
  DragEndEvent,
  DragStartEvent,
  UniqueIdentifier,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { ItemBank } from './components/ItemBank'
import { TierRow } from './components/TierRow'
import { ItemCard } from './components/ItemCard'
import { items, tiers, type Item, type Tier, type TierId } from './data'
import { toPng } from 'html-to-image'
import { processImageFile } from './utils/imageProcessor'
import { useOpenRouter } from './hooks/useOpenRouter'
import { AIItemSuggestionsModal } from './components/AIItemSuggestionsModal'
import { AITierPlacementModal } from './components/AITierPlacementModal'
import { AIDescriptionModal } from './components/AIDescriptionModal'
import { AISetupWizard } from './components/AISetupWizard'
import { generateItemSuggestions } from './services/aiItemSuggestions'
import { generateTierPlacements } from './services/aiTierPlacement'
import { generateTierListDescription } from './services/aiDescriptionGenerator'
import { generateTierListSetup, type TierListSetup } from './services/aiTierListSetup'
import { extractTextFromImage, getActiveModel } from './services/openRouterService'
import { parseNaturalLanguageCommand, type ParsedCommand } from './services/aiNaturalCommands'
import { NaturalCommandModal } from './components/NaturalCommandModal'
import { getModelDisplayName } from './services/aiConfig'
import type { AIItemSuggestion, AITierPlacement, AIDescriptionOptions } from './types/ai'
import './App.css'

type ContainerId = TierId | 'bank'

type Placements = Record<ContainerId, string[]>
type ThemeMode = 'dark' | 'light'
type TierConfig = Tier
type CustomItem = Item
type NewTextItem = {
  id: string
  label: string
  badge: string
  color: string
}
type UploadingImage = {
  id: string
  file: File
  preview: string
  label: string
  color: string
  badge: string
  error?: string
  loading: boolean
  extractedText?: string[]
}

type SavedConfig = {
  id: string
  name: string
  timestamp: number
  state: {
    placements: Placements
    tiers: TierConfig[]
    disabledItems: string[]
    customItems: CustomItem[]
  }
}

const STORAGE_KEY = 'codex-tier-list-state'
const DEFAULT_TIERS: TierConfig[] = tiers.map((tier) => ({ ...tier }))
const DEFAULT_ITEMS: Item[] = items.map((item) => ({ ...item }))
let tierIdCounter = 0
let customItemCounter = 0
const TIER_COLOR_PALETTE = [
  '#8b5cf6',
  '#7c3aed',
  '#6d28d9',
  '#5b21b6',
  '#4c1d95',
  '#a855f7',
  '#c084fc',
  '#d946ef',
  '#f472b6',
  '#fb7185',
  '#f97316',
  '#ea580c',
  '#d97706',
  '#c2410c',
  '#a16207',
  '#92400e',
  '#7c2d12',
  '#6c2d11',
  '#5a2910',
  '#4a2510',
]

const cloneTiers = (tierList: TierConfig[]) =>
  tierList.map((tier) => ({ ...tier }))

const generateTierId = () => {
  tierIdCounter += 1
  return `tier-${Date.now()}-${tierIdCounter}`
}

const generateItemId = () => {
  customItemCounter += 1
  return `custom-${Date.now()}-${customItemCounter}`
}

const createDefaultPlacements = (
  tierList: TierConfig[],
  itemList: Item[] = DEFAULT_ITEMS,
): Placements => {
  const initial: Placements = { bank: itemList.map((item) => item.id) }
  for (const tier of tierList) {
    initial[tier.id] = []
  }
  return initial
}

const getContrastingTextColor = (hex: string) => {
  let normalized = hex.replace('#', '')
  if (normalized.length === 3) {
    normalized = normalized
      .split('')
      .map((char) => char + char)
      .join('')
  }
  const r = parseInt(normalized.slice(0, 2), 16) || 0
  const g = parseInt(normalized.slice(2, 4), 16) || 0
  const b = parseInt(normalized.slice(4, 6), 16) || 0
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b
  return luminance > 186 ? '#1a1a1a' : '#f5f5f5'
}

const normalizeTierConfig = (raw: unknown): TierConfig[] | null => {
  if (!Array.isArray(raw)) return null
  const sanitized = raw
    .map((entry) => {
      if (typeof entry !== 'object' || entry === null) return null
      const { id, label, color, textColor } = entry as Record<string, unknown>
      if (typeof id !== 'string' || !id.trim()) return null
      const safeColor = typeof color === 'string' && color ? color : '#4caf50'
      return {
        id,
        label:
          typeof label === 'string' && label.trim()
            ? label.slice(0, 24)
            : id.toUpperCase(),
        color: safeColor,
        textColor:
          typeof textColor === 'string' && textColor
            ? textColor
            : getContrastingTextColor(safeColor),
      }
    })
    .filter(Boolean) as TierConfig[]
  return sanitized.length ? sanitized : null
}

const normalizeCustomItems = (raw: unknown): CustomItem[] => {
  if (!Array.isArray(raw)) return []
  return raw
    .map((entry) => {
      if (typeof entry !== 'object' || entry === null) return null
      const { id, label, color, badge } = entry as Record<string, unknown>
      if (typeof id !== 'string' || !id.trim()) return null
      if (typeof label !== 'string' || !label.trim()) return null
      const safeColor = typeof color === 'string' && color ? color : '#8b5cf6'
      return {
        id,
        label: label.slice(0, 50),
        color: safeColor,
        badge:
          typeof badge === 'string' && badge.trim()
            ? badge.slice(0, 5).toUpperCase()
            : undefined,
        textColor: getContrastingTextColor(safeColor),
      }
    })
    .filter(Boolean) as CustomItem[]
}

const normalizePlacements = (
  raw: unknown,
  tierList: TierConfig[],
  itemList: Item[],
): Placements => {
  const initial = createDefaultPlacements(tierList, itemList)
  if (typeof raw !== 'object' || raw === null) {
    return initial
  }

  const data = raw as Record<string, unknown>
  const seen = new Set<string>()
  const validIds = new Set(itemList.map((item) => item.id))
  const containerOrder: ContainerId[] = ['bank', ...tierList.map((tier) => tier.id)]

  for (const container of containerOrder) {
    const stored = data[container]
    if (!Array.isArray(stored)) continue

    initial[container] = stored.filter((entry): entry is string => {
      if (typeof entry !== 'string') return false
      if (!validIds.has(entry)) return false
      if (seen.has(entry)) return false
      seen.add(entry)
      return true
    })
  }

  for (const item of itemList) {
    if (!seen.has(item.id)) {
      initial.bank.push(item.id)
    }
  }

  return initial
}

const loadInitialState = () => {
  const fallbackTiers = cloneTiers(DEFAULT_TIERS)
  const fallbackPlacements = createDefaultPlacements(fallbackTiers)
  const fallbackDisabled: string[] = []
  const fallbackCustom: CustomItem[] = []

  if (!isBrowser()) {
    return {
      tiers: fallbackTiers,
      placements: fallbackPlacements,
      disabledItems: fallbackDisabled,
      customItems: fallbackCustom,
    }
  }

  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (!stored) {
    return {
      tiers: fallbackTiers,
      placements: fallbackPlacements,
      disabledItems: fallbackDisabled,
      customItems: fallbackCustom,
    }
  }

  try {
    const parsed = JSON.parse(stored) as {
      tiers?: unknown
      placements?: unknown
      disabledItems?: unknown
      customItems?: unknown
    }
    const storedTiers = normalizeTierConfig(parsed.tiers) ?? fallbackTiers
    const disabledItems =
      Array.isArray(parsed.disabledItems)
        ? parsed.disabledItems.filter((entry): entry is string => typeof entry === 'string')
        : []
    const storedCustom = normalizeCustomItems(parsed.customItems)
    const availableItems = [...DEFAULT_ITEMS, ...storedCustom].filter(
      (item) => !disabledItems.includes(item.id),
    )
    const storedPlacements = normalizePlacements(
      parsed.placements,
      storedTiers,
      availableItems,
    )
    return {
      tiers: storedTiers,
      placements: storedPlacements,
      disabledItems,
      customItems: storedCustom,
    }
  } catch {
    return {
      tiers: fallbackTiers,
      placements: fallbackPlacements,
      disabledItems: fallbackDisabled,
      customItems: fallbackCustom,
    }
  }
}

const isBrowser = () => typeof window !== 'undefined'

const reconcilePlacements = (
  prevPlacements: Placements,
  previousTiers: TierConfig[],
  nextTiers: TierConfig[],
  itemList: Item[],
): Placements => {
  const next: Placements = { bank: [] }
  const nextIds = new Set(nextTiers.map((tier) => tier.id))
  const validItems = new Set(itemList.map((item) => item.id))
  const seen = new Set<string>()

  for (const tier of nextTiers) {
    const existing = prevPlacements[tier.id] ?? []
    next[tier.id] = existing.filter((itemId) => {
      if (!validItems.has(itemId) || seen.has(itemId)) return false
      seen.add(itemId)
      return true
    })
  }

  const removedItems: string[] = []
  for (const tier of previousTiers) {
    if (!nextIds.has(tier.id)) {
      removedItems.push(...(prevPlacements[tier.id] ?? []))
    }
  }

  const nextBank = [
    ...(prevPlacements.bank ?? []).filter((itemId) => {
      if (!validItems.has(itemId) || seen.has(itemId)) return false
      seen.add(itemId)
      return true
    }),
    ...removedItems.filter((itemId) => {
      if (!validItems.has(itemId) || seen.has(itemId)) return false
      seen.add(itemId)
      return true
    }),
  ]

  for (const item of itemList) {
    if (!seen.has(item.id)) {
      nextBank.push(item.id)
      seen.add(item.id)
    }
  }

  next.bank = nextBank
  return next
}

const removeItemFromPlacements = (
  current: Placements,
  itemId: string,
): Placements => {
  const result: Placements = {}
  for (const [key, list] of Object.entries(current)) {
    // Remove all instances of itemId (in case of duplicates)
    result[key as ContainerId] = list.filter((id) => id !== itemId)
  }
  if (!result.bank) {
    result.bank = []
  }
  return result
}

// Remove duplicate IDs from placements
const deduplicatePlacements = (placements: Placements): Placements => {
  const result: Placements = {}
  const seen = new Set<string>()

  for (const [key, list] of Object.entries(placements)) {
    result[key as ContainerId] = list.filter(id => {
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })
  }

  return result
}

function App() {
  const initialState = useMemo(() => loadInitialState(), [])
  const [tierConfig, setTierConfig] = useState(() => initialState.tiers)
  const [placements, setPlacements] = useState<Placements>(
    () => initialState.placements,
  )
  const [customItems, setCustomItems] = useState<CustomItem[]>(
    () => initialState.customItems ?? [],
  )
  const [disabledItems, setDisabledItems] = useState<string[]>(
    () => initialState.disabledItems ?? [],
  )
  const baseItems = useMemo(() => DEFAULT_ITEMS, [])
  const activeItems = useMemo(
    () =>
      [...baseItems, ...customItems].filter(
        (item) => !disabledItems.includes(item.id),
      ),
    [baseItems, customItems, disabledItems],
  )
  const itemsById = useMemo(() => {
    return activeItems.reduce<Record<string, Item>>((acc, item) => {
      acc[item.id] = item
      return acc
    }, {})
  }, [activeItems])

  const [activeId, setActiveId] = useState<string | null>(null)
  const [title, setTitle] = useState('Awesome Tier List')
  const [colorsInverted, setColorsInverted] = useState(false)
  const [presentationMode, setPresentationMode] = useState(false)
  const [themeMode, setThemeMode] = useState<ThemeMode>('light')

  // AI state
  const ai = useOpenRouter()
  const [aiEnabled, setAiEnabled] = useState(false)
  const [isAISuggestionsOpen, setIsAISuggestionsOpen] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<AIItemSuggestion[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null)
  const [isPlacementOpen, setIsPlacementOpen] = useState(false)
  const [aiPlacements, setAiPlacements] = useState<AITierPlacement[]>([])
  const [placementLoading, setPlacementLoading] = useState(false)
  const [placementError, setPlacementError] = useState<string | null>(null)
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false)
  const [aiDescription, setAiDescription] = useState('')
  const [descriptionLoading, setDescriptionLoading] = useState(false)
  const [descriptionError, setDescriptionError] = useState<string | null>(null)
  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState(false)
  const [setupData, setSetupData] = useState<TierListSetup | null>(null)
  const [setupLoading, setSetupLoading] = useState(false)
  const [setupError, setSetupError] = useState<string | null>(null)
  const [isCommandModalOpen, setIsCommandModalOpen] = useState(false)
  const [parsedCommand, setParsedCommand] = useState<ParsedCommand | null>(null)
  const [commandLoading, setCommandLoading] = useState(false)
  const [hideTitles, setHideTitles] = useState(false)
  const [showDistribution, setShowDistribution] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [editorTiers, setEditorTiers] = useState<TierConfig[]>([])
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([])
  const [showLoadConfirmation, setShowLoadConfirmation] = useState(false)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null)
  const [activeConfigId, setActiveConfigId] = useState<string | null>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<{
    label: string
    badge: string
    color: string
  } | null>(null)
  const titleBeforeEditRef = useRef<string>('')
  const [isSaveDropdownOpen, setIsSaveDropdownOpen] = useState(false)
  const saveDropdownRef = useRef<HTMLDivElement>(null)
  const [isAiDropdownOpen, setIsAiDropdownOpen] = useState(false)
  const aiDropdownRef = useRef<HTMLDivElement>(null)
  const [isSettingsDropdownOpen, setIsSettingsDropdownOpen] = useState(false)
  const settingsDropdownRef = useRef<HTMLDivElement>(null)

  const appRef = useRef<HTMLDivElement>(null)

  const themedTiers = useMemo(() => {
    if (!colorsInverted) return tierConfig

    // Reverse the color order: 1st gets last's color, 2nd gets 2nd-to-last's color, etc.
    const reversedColors = tierConfig.map((tier) => ({
      color: tier.color,
      textColor: tier.textColor,
    })).reverse()

    return tierConfig.map((tier, index) => ({
      ...tier,
      color: reversedColors[index].color,
      textColor: reversedColors[index].textColor,
    }))
  }, [colorsInverted, tierConfig])

  const maxLabelLength = useMemo(() => {
    return tierConfig.reduce((max, tier) => Math.max(max, tier.label.length), 1)
  }, [tierConfig])

  const labelWidth = useMemo(() => {
    const base = maxLabelLength * 16
    return Math.min(240, Math.max(90, base))
  }, [maxLabelLength])

  // Calculate distribution percentages for each tier
  const distributionData = useMemo(() => {
    // Count items placed in tiers (excluding bank)
    const tierCounts: Record<string, number> = {}
    let totalPlaced = 0

    for (const tier of tierConfig) {
      const count = (placements[tier.id] || []).length
      tierCounts[tier.id] = count
      totalPlaced += count
    }

    // Calculate percentages
    const percentages: Record<string, number> = {}
    for (const tier of tierConfig) {
      percentages[tier.id] = totalPlaced > 0
        ? Math.round((tierCounts[tier.id] / totalPlaced) * 100)
        : 0
    }

    return { percentages, totalPlaced }
  }, [tierConfig, placements])

  const containerOrder = useMemo<ContainerId[]>(
    () => ['bank', ...tierConfig.map((tier) => tier.id)],
    [tierConfig],
  )

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const findContainer = (id: UniqueIdentifier): ContainerId | undefined => {
    if (containerOrder.includes(id as ContainerId)) {
      return id as ContainerId
    }

    return containerOrder.find((container) =>
      placements[container].includes(id as string),
    )
  }

  // Save/Load configuration functions
  const loadSavedConfigs = (): SavedConfig[] => {
    if (!isBrowser()) return []

    try {
      const stored = window.localStorage.getItem('codex-tier-list-saved-configs')
      if (!stored) return []

      const configs = JSON.parse(stored) as SavedConfig[]
      // Sort by timestamp descending (newest first)
      return configs.sort((a, b) => b.timestamp - a.timestamp)
    } catch (error) {
      console.error('Failed to load saved configs:', error)
      return []
    }
  }

  const handleSaveCurrentList = () => {
    // If there's an active config, update it
    if (activeConfigId) {
      const activeConfig = savedConfigs.find(c => c.id === activeConfigId)
      if (activeConfig) {
        const updatedConfigs = savedConfigs.map(config =>
          config.id === activeConfigId
            ? {
                ...config,
                name: title.trim() || 'Untitled Tier List',
                timestamp: Date.now(),
                state: {
                  placements: { ...placements },
                  tiers: [...tierConfig],
                  disabledItems: [...disabledItems],
                  customItems: [...customItems],
                },
              }
            : config
        )

        // Sort by timestamp descending (newest first)
        const sortedConfigs = updatedConfigs.sort((a, b) => b.timestamp - a.timestamp)
        setSavedConfigs(sortedConfigs)

        // Persist to localStorage
        if (isBrowser()) {
          window.localStorage.setItem(
            'codex-tier-list-saved-configs',
            JSON.stringify(sortedConfigs)
          )
        }

        alert(`Updated "${activeConfig.name}" successfully!`)
        return
      }
    }

    // Otherwise, save as new
    handleSaveAsNew()
  }

  const handleSaveAsNew = () => {
    // Check limit
    if (savedConfigs.length >= 15) {
      alert('Maximum 15 saved lists reached. Please delete a list before saving a new one.')
      return
    }

    // Get list name from title (trim and default if empty)
    const listName = title.trim() || 'Untitled Tier List'

    // Create new config
    const newConfig: SavedConfig = {
      id: `config-${Date.now()}`,
      name: listName,
      timestamp: Date.now(),
      state: {
        placements: { ...placements },
        tiers: [...tierConfig],
        disabledItems: [...disabledItems],
        customItems: [...customItems],
      },
    }

    // Add to saved configs
    const updatedConfigs = [newConfig, ...savedConfigs]
    setSavedConfigs(updatedConfigs)

    // Persist to localStorage
    if (isBrowser()) {
      window.localStorage.setItem(
        'codex-tier-list-saved-configs',
        JSON.stringify(updatedConfigs)
      )
    }

    // Set as active config
    setActiveConfigId(newConfig.id)

    alert(`Saved "${listName}" successfully!`)
  }

  const handleLoadListClick = (configId: string) => {
    setSelectedConfigId(configId)
    setShowLoadConfirmation(true)
  }

  const confirmLoadList = () => {
    if (!selectedConfigId) return

    const config = savedConfigs.find(c => c.id === selectedConfigId)
    if (!config) return

    // Restore state
    setPlacements(config.state.placements)
    setTierConfig(config.state.tiers)
    setDisabledItems(config.state.disabledItems)
    setCustomItems(config.state.customItems)
    setTitle(config.name)

    // Set as active config
    setActiveConfigId(selectedConfigId)

    // Update current state storage
    updateStorage(
      config.state.placements,
      config.state.tiers,
      config.state.disabledItems,
      config.state.customItems
    )

    setShowLoadConfirmation(false)
    setSelectedConfigId(null)
  }

  const cancelLoadList = () => {
    setShowLoadConfirmation(false)
    setSelectedConfigId(null)
  }

  const handleDeleteListClick = (configId: string) => {
    setSelectedConfigId(configId)
    setShowDeleteConfirmation(true)
  }

  const confirmDeleteList = () => {
    if (!selectedConfigId) return

    // Remove from saved configs
    const updatedConfigs = savedConfigs.filter(c => c.id !== selectedConfigId)
    setSavedConfigs(updatedConfigs)

    // Update localStorage
    if (isBrowser()) {
      window.localStorage.setItem(
        'codex-tier-list-saved-configs',
        JSON.stringify(updatedConfigs)
      )
    }

    setShowDeleteConfirmation(false)
    setSelectedConfigId(null)
  }

  const cancelDeleteList = () => {
    setShowDeleteConfirmation(false)
    setSelectedConfigId(null)
  }

  const handleInvertColors = () => {
    setColorsInverted((prev) => !prev)
  }

  const handleTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
    // Limit title to 50 characters
    setTitle(event.target.value.slice(0, 50))
  }

  const handleTitleBlur = () => {
    if (!title.trim()) {
      setTitle('Awesome Tier List')
    }
  }

  const handleTitleFocus = () => {
    titleBeforeEditRef.current = title
  }

  const handleTitleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      event.currentTarget.blur()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setTitle(titleBeforeEditRef.current)
      event.currentTarget.blur()
    }
  }

  const togglePresentationMode = () => {
    setPresentationMode((prev) => !prev)
  }

  const handleThemeChange = (mode: ThemeMode) => {
    setThemeMode(mode)
  }

  // Save button click handler
  const handleSaveButtonClick = () => {
    if (activeConfigId) {
      // If there's an active config, toggle the dropdown
      setIsSaveDropdownOpen(!isSaveDropdownOpen)
    } else {
      // Otherwise, just save
      handleSaveCurrentList()
    }
  }

  // Click outside to close save dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (saveDropdownRef.current && !saveDropdownRef.current.contains(event.target as Node)) {
        setIsSaveDropdownOpen(false)
      }
    }

    if (isSaveDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isSaveDropdownOpen])

  // Click outside to close AI dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (aiDropdownRef.current && !aiDropdownRef.current.contains(event.target as Node)) {
        setIsAiDropdownOpen(false)
      }
    }

    if (isAiDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isAiDropdownOpen])

  // Click outside to close settings dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsDropdownRef.current && !settingsDropdownRef.current.contains(event.target as Node)) {
        setIsSettingsDropdownOpen(false)
      }
    }

    if (isSettingsDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isSettingsDropdownOpen])

  // Load AI enabled state from localStorage
  useEffect(() => {
    const enabled = localStorage.getItem('ai-enabled') === 'true'
    if (enabled && ai.available) {
      setAiEnabled(true)
    }
  }, [ai.available])

  // Save AI enabled state
  useEffect(() => {
    localStorage.setItem('ai-enabled', aiEnabled.toString())
  }, [aiEnabled])

  // Update editor tiers when colors are inverted while settings modal is open
  useEffect(() => {
    if (isSettingsOpen) {
      setEditorTiers(cloneTiers(themedTiers))
    }
  }, [colorsInverted, isSettingsOpen, themedTiers])

  // Warn user before leaving page if there are unsaved items
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only warn if there are items in the tier list
      if (customItems.length > 0) {
        e.preventDefault()
        e.returnValue = '' // Chrome requires returnValue to be set
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [customItems])

  const handleUploadImages = () => {
    setIsUploadImagesOpen(true)
  }

  const closeUploadImagesModal = () => {
    setIsUploadImagesOpen(false)
    setUploadingImages([])
    setIsProcessingUpload(false)
  }

  const handleFilesSelected = async (files: FileList) => {
    const existingCount = uploadingImages.length
    const availableSlots = 20 - existingCount
    const fileArray = Array.from(files).slice(0, availableSlots)

    const initialImages: UploadingImage[] = fileArray.map(file => ({
      id: generateItemId(),
      file,
      preview: '',
      label: file.name.replace(/\.[^/.]+$/, ''),
      color: '#8b5cf6',
      badge: '',
      error: undefined,
      loading: true,
    }))

    // Only append if there are existing images, otherwise replace
    if (existingCount > 0) {
      setUploadingImages(prev => [...prev, ...initialImages])
    } else {
      setUploadingImages(initialImages)
    }

    // Process each file sequentially
    for (const img of initialImages) {
      try {
        const base64 = await processImageFile(img.file)

        // Update with preview first
        setUploadingImages(prev =>
          prev.map(item =>
            item.id === img.id
              ? { ...item, preview: base64, loading: extractTextOCR }
              : item
          )
        )

        // Extract text from image (OCR) if enabled
        // Use ORIGINAL file for OCR, not the resized thumbnail
        if (extractTextOCR && aiEnabled && ai.available) {
          try {
            const mimeType = img.file.type
            // Read original file as base64 for OCR (not the 96x96 thumbnail)
            const originalBase64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader()
              reader.onload = () => resolve(reader.result as string)
              reader.onerror = reject
              reader.readAsDataURL(img.file)
            })
            const base64Data = originalBase64.split(',')[1]

            const extractedTexts = await extractTextFromImage({
              base64: base64Data,
              mimeType
            })

            setUploadingImages(prev =>
              prev.map(item =>
                item.id === img.id
                  ? { ...item, extractedText: extractedTexts, loading: false }
                  : item
              )
            )
          } catch (ocrError) {
            console.warn('OCR extraction failed:', ocrError)
            setUploadingImages(prev =>
              prev.map(item =>
                item.id === img.id
                  ? { ...item, loading: false }
                  : item
              )
            )
          }
        } else {
          // No OCR, just mark as not loading
          setUploadingImages(prev =>
            prev.map(item =>
              item.id === img.id
                ? { ...item, loading: false }
                : item
            )
          )
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to process image'
        setUploadingImages(prev =>
          prev.map(item =>
            item.id === img.id
              ? { ...item, error: errorMessage, loading: false }
              : item
          )
        )
      }
    }
  }

  const updateImageLabel = (id: string, label: string) => {
    setUploadingImages(prev =>
      prev.map(img => (img.id === id ? { ...img, label } : img))
    )
  }

  const updateImageBadge = (id: string, badge: string) => {
    setUploadingImages(prev =>
      prev.map(img =>
        img.id === id
          ? { ...img, badge: badge.toUpperCase().slice(0, 5) }
          : img
      )
    )
  }

  const updateImageColor = (id: string, color: string) => {
    setUploadingImages(prev =>
      prev.map(img => (img.id === id ? { ...img, color } : img))
    )
  }

  const removeUploadingImage = (id: string) => {
    setUploadingImages(prev => prev.filter(img => img.id !== id))
  }

  const updateExtractedText = (imageId: string, textIndex: number, newText: string) => {
    setUploadingImages(prev =>
      prev.map(img => {
        if (img.id !== imageId || !img.extractedText) return img
        const updated = [...img.extractedText]
        updated[textIndex] = newText
        return { ...img, extractedText: updated }
      })
    )
  }

  const removeExtractedText = (imageId: string, textIndex: number) => {
    setUploadingImages(prev =>
      prev.map(img => {
        if (img.id !== imageId || !img.extractedText) return img
        const updated = img.extractedText.filter((_, idx) => idx !== textIndex)
        return { ...img, extractedText: updated }
      })
    )
  }

  const handleSaveUploadedImages = () => {
    // Prevent multiple clicks
    if (isProcessingUpload) return

    const validImages = uploadingImages.filter(img => !img.error && img.preview)

    if (validImages.length === 0) {
      closeUploadImagesModal()
      return
    }

    setIsProcessingUpload(true)

    // Create items from extracted text (OCR) first
    const ocrItems: CustomItem[] = []
    const imagesWithOcr = new Set<string>()

    validImages.forEach(img => {
      if (img.extractedText && img.extractedText.length > 0) {
        imagesWithOcr.add(img.id)
        img.extractedText.forEach((text, idx) => {
          if (text.trim()) {
            const label = text.trim().slice(0, 50)
            // Auto-generate badge from first two letters of label
            const badge = label.slice(0, 2).toUpperCase()
            ocrItems.push({
              id: `${img.id}-ocr-${idx}`,
              label,
              badge,
              color: '#8b5cf6',
            })
          }
        })
      }
    })

    // Create items from images - but skip images that had OCR extraction
    // (user only wants OCR text items, not the source image)
    const newItems = validImages
      .filter(img => !imagesWithOcr.has(img.id))
      .map(img => ({
        id: img.id,
        label: img.label.trim().slice(0, 50) || img.file.name,
        image: img.preview,
      }))

    // Combine image items and OCR items
    const allNewItems = [...newItems, ...ocrItems]

    // Check for duplicates before adding
    setCustomItems(prev => {
      const existingIds = new Set(prev.map(item => item.id))
      const uniqueNewItems = allNewItems.filter(item => !existingIds.has(item.id))

      if (uniqueNewItems.length === 0) {
        return prev // No new items to add
      }

      const nextCustom = [...prev, ...uniqueNewItems]

      setPlacements(prevPlacements => {
        const existingBankIds = new Set(prevPlacements.bank)
        const newItemIds = uniqueNewItems
          .map(item => item.id)
          .filter(id => !existingBankIds.has(id))

        let nextPlacements: Placements = {
          ...prevPlacements,
          bank: [...prevPlacements.bank, ...newItemIds],
        }

        // Deduplicate to ensure no duplicate IDs
        nextPlacements = deduplicatePlacements(nextPlacements)

        updateStorage(nextPlacements, tierConfig, disabledItems, nextCustom)
        return nextPlacements
      })
      return nextCustom
    })

    closeUploadImagesModal()
  }

  const handleOpenSettings = () => {
    // Use themedTiers so settings show inverted colors when active
    setEditorTiers(cloneTiers(themedTiers))
    setIsSettingsOpen(true)
  }

  const handleCloseSettings = () => {
    setIsSettingsOpen(false)
  }

  const handleToggleHideTitles = () => {
    setHideTitles((prev) => !prev)
  }

  const handleToggleDistribution = () => {
    setShowDistribution((prev) => !prev)
  }

  const handleSaveList = () => {
    // Placeholder handler for upcoming save functionality
  }

  const [isAddItemsOpen, setIsAddItemsOpen] = useState(false)
  const [newTextItems, setNewTextItems] = useState<NewTextItem[]>([])

  const [isUploadImagesOpen, setIsUploadImagesOpen] = useState(false)
  const [uploadingImages, setUploadingImages] = useState<UploadingImage[]>([])
  const [isProcessingUpload, setIsProcessingUpload] = useState(false)
  const [extractTextOCR, setExtractTextOCR] = useState(false)

  const openAddItemsModal = () => {
    setNewTextItems([{ id: generateItemId(), label: '', badge: '', color: '#8b5cf6' }])
    setIsAddItemsOpen(true)
  }

  const closeAddItemsModal = () => {
    setIsAddItemsOpen(false)
    setNewTextItems([])
  }

  const handleAddTextItem = () => {
    openAddItemsModal()
  }

  const handleAISuggestions = async () => {
    if (!ai.available) {
      alert('AI features require an OpenRouter API key. Please configure it in .env.local')
      return
    }

    setIsAISuggestionsOpen(true)
    setSuggestionsLoading(true)
    setSuggestionsError(null)
    setAiSuggestions([])

    // Use all active items (both default and custom) for context
    const existingLabels = activeItems.map((item) => item.label)

    const result = await ai.executeTask(async () => {
      return generateItemSuggestions({
        title,
        existingItems: existingLabels,
        count: 5,
      })
    })

    setSuggestionsLoading(false)

    if (result) {
      setAiSuggestions(result)
    } else if (ai.error) {
      setSuggestionsError(ai.error.message)
    }
  }

  const handleAddSuggestedItems = (selectedLabels: string[]) => {
    const newItems: Item[] = selectedLabels.map((label) => ({
      id: generateItemId(),
      label,
      color: '#8b5cf6',
    }))

    setCustomItems((prev) => [...prev, ...newItems])

    const newItemIds = newItems.map((item) => item.id)
    setPlacements((prev) => ({
      ...prev,
      bank: [...prev.bank, ...newItemIds],
    }))

    setIsAISuggestionsOpen(false)
    setAiSuggestions([])
  }

  const handleCloseSuggestions = () => {
    setIsAISuggestionsOpen(false)
    setAiSuggestions([])
    setSuggestionsError(null)
  }

  const handleRetrySuggestions = () => {
    handleAISuggestions()
  }

  // Tier Placement handlers
  const handleAutoPlaceTiers = async () => {
    if (!ai.available) {
      alert('AI features require an OpenRouter API key. Please configure it in .env.local')
      return
    }

    // Only place items from the bank
    const bankItemIds = placements.bank
    if (bankItemIds.length === 0) {
      alert('No items in Item Bank to place')
      return
    }

    setIsPlacementOpen(true)
    setPlacementLoading(true)
    setPlacementError(null)
    setAiPlacements([])

    const itemsToPlace = bankItemIds
      .map(id => {
        const item = itemsById[id]
        return item ? { id: item.id, label: item.label } : null
      })
      .filter((item): item is { id: string; label: string } => item !== null)

    const result = await ai.executeTask(async () => {
      return generateTierPlacements({
        title,
        tiers: themedTiers.map(t => ({ id: t.id, label: t.label })),
        items: itemsToPlace,
      })
    })

    setPlacementLoading(false)

    if (result) {
      setAiPlacements(result)
    } else if (ai.error) {
      setPlacementError(ai.error.message)
    }
  }

  const handleApplyPlacements = (selectedPlacements: AITierPlacement[]) => {
    // Move items from bank to their suggested tiers
    setPlacements((prev) => {
      const next = { ...prev }

      selectedPlacements.forEach((placement) => {
        // Remove from bank
        next.bank = next.bank.filter(id => id !== placement.itemId)

        // Add to suggested tier
        const tierId = placement.tier as ContainerId
        if (!next[tierId]) {
          next[tierId] = []
        }
        next[tierId] = [...next[tierId], placement.itemId]
      })

      updateStorage(next)
      return next
    })

    setIsPlacementOpen(false)
    setAiPlacements([])
  }

  const handleClosePlacement = () => {
    setIsPlacementOpen(false)
    setAiPlacements([])
    setPlacementError(null)
  }

  const handleRetryPlacement = () => {
    handleAutoPlaceTiers()
  }

  const handleOpenDescription = () => {
    setIsDescriptionOpen(true)
    setAiDescription('')
    setDescriptionError(null)
  }

  const handleGenerateDescription = async (options: AIDescriptionOptions) => {
    if (!ai.available) {
      alert('AI features require an OpenRouter API key. Please configure it in .env.local')
      return
    }

    setDescriptionLoading(true)
    setDescriptionError(null)
    setAiDescription('')

    // Collect tiers with their items
    const tiersWithItems = themedTiers.map(tier => ({
      tier: {
        id: tier.id,
        label: tier.label,
        color: tier.color,
      },
      items: (placements[tier.id] || [])
        .map(itemId => {
          const item = itemsById[itemId]
          return item ? { id: item.id, label: item.label } : null
        })
        .filter((item): item is { id: string; label: string } => item !== null),
    }))

    const result = await ai.executeTask(async () => {
      return generateTierListDescription({
        title,
        tiersWithItems,
        options,
      })
    })

    setDescriptionLoading(false)

    if (result) {
      setAiDescription(result)
    } else if (ai.error) {
      setDescriptionError(ai.error.message)
    }
  }

  const handleCloseDescription = () => {
    setIsDescriptionOpen(false)
    setAiDescription('')
    setDescriptionError(null)
  }

  const handleRetryDescription = () => {
    // The modal will handle regeneration with the current options
    setDescriptionError(null)
  }

  const handleOpenSetupWizard = () => {
    setIsSetupWizardOpen(true)
    setSetupData(null)
    setSetupError(null)
  }

  const handleGenerateSetup = async (topic: string) => {
    if (!ai.available) {
      alert('AI features require an OpenRouter API key. Please configure it in .env.local')
      return
    }

    setSetupLoading(true)
    setSetupError(null)
    setSetupData(null)

    const result = await ai.executeTask(async () => {
      return generateTierListSetup({
        topic,
        numTiers: 5,
        numItems: 12,
      })
    })

    setSetupLoading(false)

    if (result) {
      setSetupData(result)
    } else if (ai.error) {
      setSetupError(ai.error.message)
    }
  }

  const handleApplySetup = () => {
    if (!setupData) return

    // Apply the generated setup
    setTitle(setupData.title)

    // Create tiers from setup
    const newTiers: TierConfig[] = setupData.tiers.map((tier, index) => ({
      id: `tier-${index + 1}` as TierId,
      label: tier.label,
      color: tier.color,
      textColor: tier.textColor,
    }))

    setTierConfig(newTiers)

    // Create items from setup with auto-generated badges
    const newItems = setupData.items.map((item, index) => ({
      id: `item-setup-${index + 1}`,
      label: item.label,
      badge: item.label.slice(0, 2).toUpperCase(), // Auto-assign first two letters as badge
      color: '#8b5cf6',
    }))

    setCustomItems((prev) => [...prev, ...newItems])

    // Place all items in bank initially
    setPlacements((prev) => ({
      ...prev,
      bank: [...prev.bank, ...newItems.map(i => i.id)],
    }))

    // Close wizard
    setIsSetupWizardOpen(false)
    setSetupData(null)
  }

  const handleCloseSetupWizard = () => {
    setIsSetupWizardOpen(false)
    setSetupData(null)
    setSetupError(null)
  }

  const handleRetrySetup = () => {
    setSetupData(null)
    setSetupError(null)
  }

  // Natural Language Command handlers
  const handleOpenCommandModal = () => {
    setIsCommandModalOpen(true)
    setParsedCommand(null)
  }

  const handleCloseCommandModal = () => {
    setIsCommandModalOpen(false)
    setParsedCommand(null)
  }

  const handleParseCommand = async (command: string) => {
    if (!ai.available) {
      alert('AI features require an OpenRouter API key. Please configure it in .env.local')
      return
    }

    setCommandLoading(true)
    setParsedCommand(null)

    // Build context for command parsing
    const context = {
      currentTiers: themedTiers.map(t => ({ label: t.label, id: t.id })),
      currentItems: customItems.map(i => ({ label: i.label, id: i.id }))
    }

    const result = await ai.executeTask(async () => {
      return parseNaturalLanguageCommand(command, context)
    })

    setCommandLoading(false)

    if (result) {
      setParsedCommand(result)
    }
  }

  const handleExecuteCommand = () => {
    if (!parsedCommand || parsedCommand.action === 'unknown') {
      alert('Cannot execute unknown command')
      return
    }

    try {
      executeCommand(parsedCommand)
      handleCloseCommandModal()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to execute command')
    }
  }

  const handleClearCommand = () => {
    setParsedCommand(null)
  }

  const executeCommand = (command: ParsedCommand) => {
    const { action, params } = command

    switch (action) {
      case 'move_items': {
        const targetTierLabel = params.targetTier
        const targetTier = themedTiers.find(t => t.label.toLowerCase() === targetTierLabel?.toLowerCase())

        if (!targetTier) {
          throw new Error(`Tier "${targetTierLabel}" not found`)
        }

        if (params.allItems) {
          // Move all items to target tier
          const allItemIds = customItems.map(i => i.id)
          setPlacements(prev => ({
            ...prev,
            [targetTier.id]: [...prev[targetTier.id], ...allItemIds],
            bank: []
          }))
        } else if (params.itemNames && params.itemNames.length > 0) {
          // Move specific items
          const itemsToMove = params.itemNames
            .map(name => customItems.find(i => i.label.toLowerCase().includes(name.toLowerCase())))
            .filter((item): item is typeof customItems[0] => item !== undefined)

          if (itemsToMove.length === 0) {
            throw new Error('No matching items found')
          }

          const itemIds = itemsToMove.map(i => i.id)

          setPlacements(prev => {
            const newPlacements = { ...prev }

            // Remove from all containers
            Object.keys(newPlacements).forEach(key => {
              newPlacements[key as ContainerId] = newPlacements[key as ContainerId].filter(
                id => !itemIds.includes(id)
              )
            })

            // Add to target tier
            newPlacements[targetTier.id] = [...newPlacements[targetTier.id], ...itemIds]

            return newPlacements
          })
        }
        break
      }

      case 'create_tier': {
        if (!params.tierName) {
          throw new Error('Tier name is required')
        }

        const newTier: TierConfig = {
          id: `tier-${Date.now()}` as TierId,
          label: params.tierName,
          color: '#8b5cf6',
          textColor: '#FFFFFF'
        }

        setTierConfig(prev => {
          const position = params.tierPosition
          if (position === 'top' || position === 0) {
            return [newTier, ...prev]
          } else if (position === 'bottom' || typeof position === 'number') {
            return [...prev, newTier]
          }
          return [...prev, newTier]
        })
        break
      }

      case 'delete_tier': {
        const tierToDelete = themedTiers.find(
          t => t.label.toLowerCase() === params.tierToDelete?.toLowerCase()
        )

        if (!tierToDelete) {
          throw new Error(`Tier "${params.tierToDelete}" not found`)
        }

        // Move items to bank before deleting
        setPlacements(prev => ({
          ...prev,
          bank: [...prev.bank, ...(prev[tierToDelete.id] || [])],
          [tierToDelete.id]: []
        }))

        setTierConfig(prev => prev.filter(t => t.id !== tierToDelete.id))
        break
      }

      case 'rename_tier': {
        const tierToRename = themedTiers.find(
          t => t.label.toLowerCase() === params.oldTierName?.toLowerCase()
        )

        if (!tierToRename) {
          throw new Error(`Tier "${params.oldTierName}" not found`)
        }

        if (!params.newTierName) {
          throw new Error('New tier name is required')
        }

        setTierConfig(prev =>
          prev.map(t => t.id === tierToRename.id ? { ...t, label: params.newTierName! } : t)
        )
        break
      }

      case 'clear_tier': {
        const tierToClear = themedTiers.find(
          t => t.label.toLowerCase() === params.tierToClear?.toLowerCase()
        )

        if (!tierToClear) {
          throw new Error(`Tier "${params.tierToClear}" not found`)
        }

        setPlacements(prev => ({
          ...prev,
          bank: [...prev.bank, ...(prev[tierToClear.id] || [])],
          [tierToClear.id]: []
        }))
        break
      }

      case 'swap_tiers': {
        const tier1 = themedTiers.find(t => t.label.toLowerCase() === params.tier1?.toLowerCase())
        const tier2 = themedTiers.find(t => t.label.toLowerCase() === params.tier2?.toLowerCase())

        if (!tier1 || !tier2) {
          throw new Error('Both tiers must exist')
        }

        setTierConfig(prev => {
          const newTiers = [...prev]
          const idx1 = newTiers.findIndex(t => t.id === tier1.id)
          const idx2 = newTiers.findIndex(t => t.id === tier2.id)

          if (idx1 !== -1 && idx2 !== -1) {
            ;[newTiers[idx1], newTiers[idx2]] = [newTiers[idx2], newTiers[idx1]]
          }

          return newTiers
        })
        break
      }

      default:
        throw new Error(`Action "${action}" not implemented`)
    }
  }

  const handleAddTextItemRow = () => {
    setNewTextItems((prev) => [
      ...prev,
      { id: generateItemId(), label: '', badge: '', color: '#8b5cf6' },
    ])
  }

  const handleRemoveTextRow = (rowId: string) => {
    setNewTextItems((prev) => prev.filter((row) => row.id !== rowId))
  }

  const handleTextItemChange = (
    rowId: string,
    field: keyof NewTextItem,
    value: string,
  ) => {
    setNewTextItems((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? {
              ...row,
              [field]:
                field === 'badge'
                  ? value.toUpperCase().slice(0, 5)
                  : field === 'label'
                    ? value
                    : value,
            }
          : row,
      ),
    )
  }

  const handleSaveNewTextItems = () => {
    const entries = newTextItems
      .map((row) => ({
        id: generateItemId(),
        label: row.label.trim().slice(0, 50),
        badge: row.badge.trim() ? row.badge.trim().slice(0, 5).toUpperCase() : undefined,
        color: row.color || '#8b5cf6',
        textColor: getContrastingTextColor(row.color || '#8b5cf6'),
      }))
      .filter((row) => row.label.length > 0)

    if (!entries.length) {
      closeAddItemsModal()
      return
    }

    setCustomItems((prev) => {
      const nextCustom = [...prev, ...entries]
      const newIds = new Set(entries.map((entry) => entry.id))
      setPlacements((prevPlacements) => {
        const filteredBank = prevPlacements.bank.filter((id) => !newIds.has(id))
        const nextPlacements: Placements = {
          ...prevPlacements,
          bank: [...filteredBank, ...entries.map((entry) => entry.id)],
        }
        updateStorage(nextPlacements, tierConfig, disabledItems, nextCustom)
        return nextPlacements
      })
      return nextCustom
    })

    closeAddItemsModal()
  }

  const handleEditTierLabel = (id: TierId, value: string) => {
    setEditorTiers((prev) =>
      prev.map((tier) =>
        tier.id === id
          ? { ...tier, label: value.slice(0, 14) || tier.label }
          : tier,
      ),
    )
  }

  const handleEditTierColor = (id: TierId, value: string) => {
    setEditorTiers((prev) =>
      prev.map((tier) =>
        tier.id === id
          ? { ...tier, color: value, textColor: getContrastingTextColor(value) }
          : tier,
      ),
    )
  }

  const handleMoveTier = (index: number, direction: number) => {
    setEditorTiers((prev) => {
      const target = index + direction
      if (target < 0 || target >= prev.length) return prev
      return arrayMove(prev, index, target)
    })
  }

  const handleDeleteTier = (id: TierId) => {
    setEditorTiers((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((tier) => tier.id !== id)
    })
  }

  const handleResetEditor = () => {
    setEditorTiers(cloneTiers(DEFAULT_TIERS))
  }

  const handleAddTierRow = () => {
    setEditorTiers((prev) => {
      if (prev.length >= 20) return prev
      const index = prev.length % TIER_COLOR_PALETTE.length
      const color = TIER_COLOR_PALETTE[index]
      return [
        ...prev,
        {
          id: generateTierId(),
          label: `Tier ${prev.length + 1}`,
          color,
          textColor: getContrastingTextColor(color),
        },
      ]
    })
  }

  const handleApplySettings = () => {
    if (!editorTiers.length) return

    // If colors are inverted, un-invert them before saving to tierConfig
    let tiersToSave = editorTiers
    if (colorsInverted) {
      const reversedColors = editorTiers.map((tier) => ({
        color: tier.color,
        textColor: tier.textColor,
      })).reverse()

      tiersToSave = editorTiers.map((tier, index) => ({
        ...tier,
        color: reversedColors[index].color,
        textColor: reversedColors[index].textColor,
      }))
    }

    const sanitized = tiersToSave.map((tier) => ({
      ...tier,
      label: tier.label.trim() || 'Tier',
      textColor: tier.textColor || getContrastingTextColor(tier.color),
    }))
    const nextPlacements = reconcilePlacements(
      placements,
      tierConfig,
      sanitized,
      activeItems,
    )
    setTierConfig(sanitized)
    setPlacements(nextPlacements)
    updateStorage(nextPlacements, sanitized, disabledItems, customItems)
    setIsSettingsOpen(false)
  }

  const handleRemoveItem = (itemId: string) => {
    const isCustomItem = customItems.some((item) => item.id === itemId)

    if (isCustomItem) {
      // Remove custom item
      const nextCustom = customItems.filter((item) => item.id !== itemId)
      const cleaned = removeItemFromPlacements(placements, itemId)

      setCustomItems(nextCustom)
      setPlacements(cleaned)
      updateStorage(cleaned, tierConfig, disabledItems, nextCustom)
    } else {
      // Disable default item
      if (disabledItems.includes(itemId)) return // Already disabled

      const nextDisabled = [...disabledItems, itemId]
      const cleaned = removeItemFromPlacements(placements, itemId)

      setDisabledItems(nextDisabled)
      setPlacements(cleaned)
      updateStorage(cleaned, tierConfig, nextDisabled, customItems)
    }
  }

  const handleStartEditItem = (itemId: string) => {
    // Try to find item in custom items first, then in all items
    let item = customItems.find((item) => item.id === itemId)
    if (!item) {
      item = activeItems.find((item) => item.id === itemId)
    }
    if (!item) return

    setEditingItemId(itemId)
    setEditFormData({
      label: item.label,
      badge: item.badge || '',
      color: item.color || '#8b5cf6',
    })
  }

  const handleSaveEditItem = () => {
    if (!editingItemId || !editFormData) return

    const isCustomItem = customItems.some((item) => item.id === editingItemId)

    if (isCustomItem) {
      // Update existing custom item
      const nextCustom = customItems.map((item) =>
        item.id === editingItemId
          ? {
              ...item,
              label: editFormData.label.trim() || item.label,
              badge: editFormData.badge.trim().slice(0, 2).toUpperCase() || undefined,
              color: editFormData.color,
              textColor: getContrastingTextColor(editFormData.color),
            }
          : item
      )

      setCustomItems(nextCustom)
      updateStorage(placements, tierConfig, disabledItems, nextCustom)
    } else {
      // Convert default item to custom item
      const defaultItem = baseItems.find((item) => item.id === editingItemId)
      if (!defaultItem) return

      // Generate a new ID for the custom item
      const newItemId = generateItemId()

      const newCustomItem: CustomItem = {
        ...defaultItem,
        id: newItemId,
        label: editFormData.label.trim() || defaultItem.label,
        badge: editFormData.badge.trim().slice(0, 2).toUpperCase() || undefined,
        color: editFormData.color,
        textColor: getContrastingTextColor(editFormData.color),
      }

      // Update placements to replace old ID with new ID
      const nextPlacements = { ...placements }
      Object.keys(nextPlacements).forEach((key) => {
        nextPlacements[key] = nextPlacements[key].map((id) =>
          id === editingItemId ? newItemId : id
        )
      })

      const nextCustom = [...customItems, newCustomItem]
      const nextDisabled = [...disabledItems, editingItemId]

      setPlacements(nextPlacements)
      setCustomItems(nextCustom)
      setDisabledItems(nextDisabled)
      updateStorage(nextPlacements, tierConfig, nextDisabled, nextCustom)
    }

    setEditingItemId(null)
    setEditFormData(null)
  }

  const handleCancelEditItem = () => {
    setEditingItemId(null)
    setEditFormData(null)
  }

  const handleUpdateEditForm = (field: 'label' | 'badge' | 'color', value: string) => {
    if (!editFormData) return
    setEditFormData({
      ...editFormData,
      [field]: value,
    })
  }

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.dataset.theme = themeMode
    }
  }, [themeMode])

  useEffect(() => {
    // Load saved configs on mount
    const configs = loadSavedConfigs()
    setSavedConfigs(configs)
  }, [])

  const handleScreenshot = async () => {
    if (!isBrowser() || !appRef.current) return
    const frame = appRef.current.cloneNode(true) as HTMLElement
    const background = themeMode === 'light' ? '#f5f2eb' : '#121212'
    frame.style.background = background
    frame.style.padding = '2rem'
    frame.style.minHeight = '100vh'
    frame.style.gap = '0.75rem'

    frame
      .querySelectorAll('[data-hide-in-screenshot="true"]')
      .forEach((node) => node.remove())

    frame.querySelectorAll('[data-hide-in-screenshot="frame"]').forEach((node) => {
      const element = node as HTMLElement
      element.style.margin = '0 auto'
      element.style.maxWidth = '1100px'
      element.style.width = '100%'
    })

    if (placements.bank.length === 0) {
      frame.querySelector('[data-item-bank="wrapper"]')?.remove()
    } else {
      frame.querySelector('[data-item-bank="subtitle"]')?.remove()
    }

    const header = frame.querySelector('.app__header') as HTMLElement | null
    if (header) {
      header.style.gap = '0.25rem'
      header.style.marginBottom = '0.35rem'
    }

    // Ensure item bank grid wraps properly in screenshot
    const itemBankGrid = frame.querySelector('.item-bank__grid') as HTMLElement | null
    if (itemBankGrid) {
      itemBankGrid.style.maxWidth = '700px'
      itemBankGrid.style.margin = '0 auto'
    }

    const staging = document.createElement('div')
    staging.style.position = 'fixed'
    staging.style.left = '-99999px'
    staging.style.top = '0'
    staging.style.opacity = '0'
    staging.style.pointerEvents = 'none'
    staging.appendChild(frame)
    document.body.appendChild(staging)

    try {
      const dataUrl = await toPng(frame, {
        cacheBust: true,
        backgroundColor: background,
        width: 1100,
      })

      const link = document.createElement('a')
      const safeTitle = title.trim() ? title.trim().replace(/\s+/g, '-') : 'tier-list'
      const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
      link.download = `${safeTitle.toLowerCase()}-${today}.png`
      link.href = dataUrl
      link.click()
    } catch (error) {
      console.error(error)
      window.alert('Unable to capture screenshot.')
    } finally {
      staging.remove()
    }
  }

  const updateStorage = (
    nextPlacements: Placements = placements,
    nextTiers: TierConfig[] = tierConfig,
    nextDisabled: string[] = disabledItems,
    nextCustom: CustomItem[] = customItems,
  ) => {
    if (isBrowser()) {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          placements: nextPlacements,
          tiers: nextTiers,
          disabledItems: nextDisabled,
          customItems: nextCustom,
        }),
      )
    }
  }

  const moveItem = (
    from: ContainerId,
    to: ContainerId,
    itemId: string,
    overId?: UniqueIdentifier,
  ) => {
    setPlacements((prev) => {
      const next: Placements = {
        ...prev,
        [from]: [...prev[from]],
        [to]: [...prev[to]],
      }

      const fromIndex = next[from].indexOf(itemId)
      if (fromIndex >= 0) {
        next[from].splice(fromIndex, 1)
      }

      let insertIndex = next[to].length
      if (overId && overId !== to) {
        const idx = next[to].indexOf(overId as string)
        if (idx >= 0) insertIndex = idx
      }

      next[to].splice(insertIndex, 0, itemId)
      updateStorage(next)
      return next
    })
  }

  const reorderItem = (
    container: ContainerId,
    active: string,
    over?: string,
  ) => {
    setPlacements((prev) => {
      const containerItems = prev[container]
      const fromIndex = containerItems.indexOf(active)
      let toIndex = typeof over === 'string'
        ? containerItems.indexOf(over)
        : containerItems.length - 1
      if (toIndex === -1) {
        toIndex = containerItems.length - 1
      }

      if (fromIndex === toIndex) return prev

      const next = {
        ...prev,
        [container]: arrayMove(containerItems, fromIndex, toIndex),
      }
      updateStorage(next)
      return next
    })
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const activeContainer = findContainer(active.id)
    const overContainer = findContainer(over.id)

    if (!activeContainer || !overContainer) return

    if (activeContainer === overContainer) {
      const overId =
        over.id === overContainer ? undefined : (over.id as string)
      reorderItem(activeContainer, active.id as string, overId)
      return
    }

    moveItem(
      activeContainer,
      overContainer,
      active.id as string,
      over.id,
    )
  }

  const handleResetApplication = () => {
    const defaultTiers = cloneTiers(DEFAULT_TIERS)
    const nextPlacements = createDefaultPlacements(defaultTiers, DEFAULT_ITEMS)
    setTierConfig(defaultTiers)
    setPlacements(nextPlacements)
    setDisabledItems([])
    setCustomItems([])
    setActiveConfigId(null)
    setTitle('Awesome Tier List')
    updateStorage(nextPlacements, defaultTiers, [], [])
  }

  const handleResetPlacements = () => {
    setPlacements((prev) => {
      const next: Placements = {
        bank: activeItems.map((item) => item.id),
      }
      for (const key of Object.keys(prev)) {
        if (key === 'bank') continue
        next[key as ContainerId] = []
      }
      updateStorage(next)
      return next
    })
  }

  const handleExport = () => {
    if (!isBrowser()) return
    const payload = containerOrder.reduce<Record<string, string[]>>(
      (acc, container) => {
        // Use 'bank' for item bank, otherwise use tier label
        if (container === 'bank') {
          acc[container] = placements[container]
        } else {
          const tier = tierConfig.find(t => t.id === container)
          const label = tier?.label || container
          acc[label] = placements[container]
        }
        return acc
      },
      {},
    )

    const output = JSON.stringify(payload, null, 2)
    navigator.clipboard
      .writeText(output)
      .then(() => window.alert('Tier assignments copied to clipboard.'))
      .catch(() => window.alert(output))
  }

  return (
    <div
      ref={appRef}
      className={`app app--${themeMode}${presentationMode ? ' app--presentation' : ''}`}
      data-hide-in-screenshot="frame"
    >
      <div className="app__header" data-hide-in-screenshot="frame">
        <div className="app__control-row" data-hide-in-screenshot="true">
          <button
            type="button"
            className={`icon-button icon-button--play${presentationMode ? ' is-active' : ''}`}
            onClick={togglePresentationMode}
            aria-pressed={presentationMode}
            aria-label={presentationMode ? 'Exit presentation mode' : 'Enter presentation mode'}
            title={presentationMode ? 'Exit Presentation Mode' : 'Presentation Mode'}
          >
            {presentationMode ? '✕' : '▶'}
          </button>
          <div className="icon-button-container" ref={aiDropdownRef}>
            <button
              type="button"
              className={`icon-button icon-button--ai${aiEnabled ? ' is-active' : ''}`}
              onClick={() => setIsAiDropdownOpen(!isAiDropdownOpen)}
              aria-label="AI menu"
              aria-expanded={isAiDropdownOpen}
              title="AI Menu"
            >
              <span className="ai-icon" aria-hidden="true">
                ✨
              </span>
              <span className="ai-label">AI</span>
            </button>
            {isAiDropdownOpen && (
              <div className="icon-button__dropdown">
                <button
                  type="button"
                  className="icon-button__dropdown-option"
                  onClick={() => {
                    if (!ai.available) {
                      alert(
                        'OpenRouter API key not found.\n\n' +
                        '1. Get free API key: https://openrouter.ai/keys\n' +
                        '2. Add to .env.local: VITE_OPENROUTER_API_KEY=your_key\n' +
                        '3. Restart dev server'
                      )
                      setIsAiDropdownOpen(false)
                      return
                    }
                    const newEnabled = !aiEnabled
                    setAiEnabled(newEnabled)
                    // Close dropdown when disabling AI features
                    if (!newEnabled) {
                      setIsAiDropdownOpen(false)
                    }
                  }}
                >
                  {aiEnabled ? '✓ AI Features Enabled' : 'Enable AI Features'}
                </button>
                {aiEnabled && getActiveModel() && (
                  <div className="icon-button__dropdown-info">
                    Current AI Model: {getModelDisplayName(getActiveModel()!)}
                  </div>
                )}
                {aiEnabled && (
                  <button
                    type="button"
                    className="icon-button__dropdown-option"
                    onClick={() => {
                      handleOpenDescription()
                      setIsAiDropdownOpen(false)
                    }}
                  >
                    Generate Descriptions ✨
                  </button>
                )}
                {aiEnabled && (
                  <button
                    type="button"
                    className="icon-button__dropdown-option"
                    onClick={() => {
                      handleOpenCommandModal()
                      setIsAiDropdownOpen(false)
                    }}
                  >
                    Natural Commands ✨
                  </button>
                )}
                {aiEnabled && (
                  <button
                    type="button"
                    className="icon-button__dropdown-option"
                    onClick={() => {
                      handleOpenSetupWizard()
                      setIsAiDropdownOpen(false)
                    }}
                  >
                    Tier List Setup Wizard ✨
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="icon-button-container" ref={saveDropdownRef}>
            <button
              type="button"
              className="icon-button icon-button--save"
              onClick={handleSaveButtonClick}
              aria-label="Save"
              aria-expanded={isSaveDropdownOpen}
              title="Save"
            >
              💾
            </button>
            {isSaveDropdownOpen && activeConfigId && (
              <div className="icon-button__dropdown">
                <button
                  type="button"
                  className="icon-button__dropdown-option"
                  onClick={() => {
                    handleSaveCurrentList()
                    setIsSaveDropdownOpen(false)
                  }}
                >
                  Update "{savedConfigs.find(c => c.id === activeConfigId)?.name}"
                </button>
                <button
                  type="button"
                  className="icon-button__dropdown-option"
                  onClick={() => {
                    handleSaveAsNew()
                    setIsSaveDropdownOpen(false)
                  }}
                >
                  Save As New
                </button>
              </div>
            )}
          </div>
          <div className="icon-button-container" ref={settingsDropdownRef}>
            <button
              type="button"
              className="icon-button icon-button--settings"
              onClick={() => setIsSettingsDropdownOpen(!isSettingsDropdownOpen)}
              aria-label="Settings menu"
              aria-expanded={isSettingsDropdownOpen}
              title="Settings Menu"
            >
              ⚙
            </button>
            {isSettingsDropdownOpen && (
              <div className="icon-button__dropdown">
                <button
                  type="button"
                  className="icon-button__dropdown-option"
                  onClick={() => {
                    handleOpenSettings()
                    setIsSettingsDropdownOpen(false)
                  }}
                >
                  Settings
                </button>
                <button
                  type="button"
                  className="icon-button__dropdown-option"
                  onClick={() => {
                    handleScreenshot()
                    setIsSettingsDropdownOpen(false)
                  }}
                >
                  Screenshot
                </button>
                <button
                  type="button"
                  className="icon-button__dropdown-option"
                  onClick={() => {
                    handleExport()
                    setIsSettingsDropdownOpen(false)
                  }}
                >
                  Copy JSON
                </button>
                <button
                  type="button"
                  className="icon-button__dropdown-option"
                  onClick={() => {
                    handleResetApplication()
                    setIsSettingsDropdownOpen(false)
                  }}
                >
                  Reset Application
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            className={`theme-toggle${themeMode === 'light' ? ' is-light' : ' is-dark'}`}
            onClick={() =>
              handleThemeChange(themeMode === 'light' ? 'dark' : 'light')
            }
            aria-label={`Switch to ${themeMode === 'light' ? 'dark' : 'light'} mode`}
            title={`Switch to ${themeMode === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            <span className="theme-toggle__icon" aria-hidden="true">
              ☀
            </span>
            <span className="theme-toggle__icon theme-toggle__icon--moon" aria-hidden="true">
              ☾
            </span>
            <span className="theme-toggle__thumb" aria-hidden="true" />
          </button>
        </div>
        <h1 className={`app__title${!presentationMode ? ' app__title--editable' : ''}`}>
          <input
            className="app__title-input"
            type="text"
            spellCheck={false}
            value={title}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            onFocus={handleTitleFocus}
            onKeyDown={handleTitleKeyDown}
            readOnly={presentationMode}
            aria-label="Tier list title"
            title={!presentationMode ? 'Click to edit (Enter to save, Esc to cancel)' : ''}
            size={Math.max(15, title.length + 2)}
          />
        </h1>
      </div>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <ItemBank
          itemIds={placements.bank}
          itemsById={itemsById}
          showLabels={!hideTitles}
          onRemoveItem={handleRemoveItem}
          editingItemId={editingItemId}
          editFormData={editFormData}
          onStartEdit={handleStartEditItem}
          onSaveEdit={handleSaveEditItem}
          onCancelEdit={handleCancelEditItem}
          onUpdateEditForm={handleUpdateEditForm}
          onAddTextItem={handleAddTextItem}
          onUploadImages={handleUploadImages}
          onToggleHideTitles={handleToggleHideTitles}
          onToggleDistribution={handleToggleDistribution}
          onResetPlacements={handleResetPlacements}
          onAISuggestions={handleAISuggestions}
          onAutoPlaceTiers={handleAutoPlaceTiers}
          presentationMode={presentationMode}
          aiEnabled={aiEnabled}
          showDistribution={showDistribution}
          hasPlacedItems={distributionData.totalPlaced > 0}
        />
        <div className="tier-list">
          {themedTiers.map((tier) => (
            <TierRow
              key={tier.id}
              tier={tier}
              itemIds={placements[tier.id] ?? []}
              itemsById={itemsById}
              showLabels={!hideTitles}
              labelWidth={labelWidth}
              onRemoveItem={handleRemoveItem}
              editingItemId={editingItemId}
              editFormData={editFormData}
              onStartEdit={handleStartEditItem}
              onSaveEdit={handleSaveEditItem}
              onCancelEdit={handleCancelEditItem}
              onUpdateEditForm={handleUpdateEditForm}
              showDistribution={showDistribution}
              distributionPercentage={distributionData.percentages[tier.id] || 0}
            />
          ))}
        </div>
        <DragOverlay>
          {activeId ? (
            <ItemCard
              item={itemsById[activeId]}
              hideRemove
              showLabel={!hideTitles}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Saved Lists Section */}
      {!presentationMode && savedConfigs.length > 0 && (
        <>
          <hr className="saved-lists-divider" data-hide-in-screenshot="true" />
          <div className="saved-lists-section" data-hide-in-screenshot="true">
            <h3 className="saved-lists-title">
              Saved Tier Lists
              {savedConfigs.length >= 15 && (
                <span style={{ fontSize: '0.9rem', color: 'var(--color-text-subtle)', marginLeft: '0.5rem' }}>
                  (Limit: 15/15 reached)
                </span>
              )}
            </h3>
            <div className="saved-lists-grid">
              {savedConfigs.map((config) => (
                <div key={config.id} className="saved-list-card">
                  <div className="saved-list-card__header">
                    <h4 className="saved-list-card__name">{config.name}</h4>
                    <span className="saved-list-card__date">
                      {new Date(config.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="saved-list-card__meta">
                    <span>{config.state.tiers.length} tiers</span>
                    <span>•</span>
                    <span>
                      {Object.values(config.state.placements).flat().length} items
                    </span>
                  </div>
                  <div className="saved-list-card__actions">
                    <button
                      className="button button--secondary"
                      onClick={() => handleLoadListClick(config.id)}
                      title={`Load "${config.name}" tier list`}
                    >
                      Load
                    </button>
                    <button
                      className="button button--danger"
                      onClick={() => handleDeleteListClick(config.id)}
                      title={`Delete "${config.name}" tier list`}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {isSettingsOpen ? (
        <div
          className="settings-modal__backdrop"
          data-hide-in-screenshot="true"
        >
          <div
            className="settings-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Tier settings"
          >
            <div className="settings-modal__title">
              <h2>Tier List Settings</h2>
              <button
                type="button"
                className="item-card__remove settings-modal__close"
                onClick={handleCloseSettings}
                aria-label="Close settings"
                title="Close settings"
              >
                ×
              </button>
            </div>
            <div className="settings-modal__rows">
              {editorTiers.map((tier, index) => {
                // Always edit the actual tier color in settings, not the inverted display color
                const previewColor = tier.color
                return (
                  <div key={tier.id} className="settings-tier-row">
                    <div className="settings-tier-row__input">
                      <input
                        type="text"
                        value={tier.label}
                        maxLength={14}
                        onChange={(event) =>
                          handleEditTierLabel(tier.id, event.target.value)
                        }
                        aria-label={`Tier label for ${tier.label}`}
                      />
                    </div>
                    <div className="settings-tier-row__controls">
                      <button
                        type="button"
                        onClick={() => handleMoveTier(index, -1)}
                        disabled={index === 0}
                        aria-label={`Move ${tier.label} up`}
                        title={`Move ${tier.label} up`}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveTier(index, 1)}
                        disabled={index === editorTiers.length - 1}
                        aria-label={`Move ${tier.label} down`}
                        title={`Move ${tier.label} down`}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTier(tier.id)}
                        disabled={editorTiers.length <= 1}
                        aria-label={`Delete ${tier.label} tier`}
                        title={`Delete ${tier.label} tier`}
                      >
                        🗑
                      </button>
                    </div>
                    <input
                      type="color"
                      value={previewColor}
                      onChange={(event) =>
                        handleEditTierColor(tier.id, event.target.value)
                      }
                      aria-label={`Tier color for ${tier.label}`}
                    />
                  </div>
                )
              })}
            </div>
            <div className="settings-modal__actions">
              <button
                type="button"
                onClick={handleAddTierRow}
                disabled={editorTiers.length >= 20}
                title="Add a new tier row"
              >
                Add Tier
              </button>
              <button
                type="button"
                onClick={handleInvertColors}
                aria-pressed={colorsInverted}
                title={colorsInverted ? 'Disable inverted tier colors' : 'Invert tier colors for dark/light mode'}
              >
                {colorsInverted ? 'Disable Inverted Colors' : 'Invert Colors'}
              </button>
              <button type="button" onClick={handleResetEditor} title="Reset tiers to default configuration">
                Reset to Default
              </button>
            </div>
            <div className="settings-modal__footer">
              <button type="button" onClick={handleCloseSettings} title="Cancel without saving">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplySettings}
                disabled={!editorTiers.length}
                title="Apply settings changes"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {isAddItemsOpen ? (
        <div className="settings-modal__backdrop" data-hide-in-screenshot="true">
          <div className="settings-modal">
            <div className="settings-modal__title">
              <h2>Add Text Items</h2>
              <button
                type="button"
                className="item-card__remove settings-modal__close"
                onClick={closeAddItemsModal}
                aria-label="Close add text items"
              >
                ×
              </button>
            </div>
            <div className="add-items-modal__rows">
              {newTextItems.map((row, index) => (
                <div key={row.id} className="add-items-row">
                  <div className="add-items-row__index">{index + 1}</div>
                  <input
                    type="text"
                    value={row.label}
                    onChange={(event) =>
                      handleTextItemChange(row.id, 'label', event.target.value)
                    }
                    placeholder="Title"
                  />
                  <input
                    type="text"
                    value={row.badge}
                    maxLength={5}
                    onChange={(event) =>
                      handleTextItemChange(row.id, 'badge', event.target.value)
                    }
                    placeholder="Code"
                  />
                  <input
                    type="color"
                    value={row.color}
                    onChange={(event) =>
                      handleTextItemChange(row.id, 'color', event.target.value)
                    }
                    aria-label="Item color"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveTextRow(row.id)}
                    aria-label={`Remove row ${index + 1}`}
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>
            <div className="settings-modal__actions">
              <button type="button" onClick={handleAddTextItemRow}>
                Add Row
              </button>
            </div>
            <div className="settings-modal__footer">
              <button type="button" onClick={closeAddItemsModal}>
                Cancel
              </button>
              <button type="button" onClick={handleSaveNewTextItems}>
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {isUploadImagesOpen ? (
        <div className="settings-modal__backdrop" data-hide-in-screenshot="true">
          <div className="settings-modal">
            <div className="settings-modal__title">
              <h2>Upload Images</h2>
              <button
                type="button"
                className="item-card__remove settings-modal__close"
                onClick={closeUploadImagesModal}
                aria-label="Close upload images"
              >
                ×
              </button>
            </div>

            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/svg+xml,image/webp,image/tiff,image/gif,image/bmp,image/x-icon,image/avif,image/heic,image/heif"
              onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
              style={{ display: 'none' }}
              id="image-upload-input"
            />

            {uploadingImages.length === 0 ? (
              <div className="upload-images-modal__empty">
                <p>No images selected. Click the button below to choose images.</p>
              </div>
            ) : (
              <div className="upload-images-modal__rows">
                {uploadingImages.map((img) => (
                  <div key={img.id} className="upload-image-preview">
                    {img.loading ? (
                      <div className="upload-image-preview__loading">
                        {img.preview ? 'Extracting text...' : 'Processing...'}
                      </div>
                    ) : img.error ? (
                      <div className="upload-image-preview__error">{img.error}</div>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="upload-image-preview__remove"
                          onClick={() => removeUploadingImage(img.id)}
                          aria-label={`Remove ${img.label}`}
                        >
                          ×
                        </button>
                        <img
                          src={img.preview}
                          alt={img.label}
                          className="upload-image-preview__thumbnail"
                        />
                        <input
                          type="text"
                          value={img.label}
                          onChange={(e) => updateImageLabel(img.id, e.target.value)}
                          placeholder="Image name"
                          maxLength={50}
                        />
                        {img.extractedText && img.extractedText.length > 0 && (
                          <div className="upload-image-preview__extracted-text">
                            <div className="upload-image-preview__extracted-text-label">
                              Extracted Text ({img.extractedText.length}):
                            </div>
                            <div className="upload-image-preview__extracted-text-items">
                              {img.extractedText.map((text, idx) => (
                                <div key={idx} className="upload-image-preview__extracted-text-item">
                                  <input
                                    type="text"
                                    value={text}
                                    onChange={(e) => updateExtractedText(img.id, idx, e.target.value)}
                                    className="upload-image-preview__extracted-text-input"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeExtractedText(img.id, idx)}
                                    className="upload-image-preview__extracted-text-remove"
                                    title="Remove"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="settings-modal__actions">
              <div className="upload-images-modal__controls">
                <label htmlFor="image-upload-input" className="upload-images-modal__file-button">
                  {uploadingImages.length > 0 ? 'Add More Images' : 'Choose Images'}
                </label>
                <label className="upload-images-modal__auto-caption">
                  <input
                    type="checkbox"
                    checked={extractTextOCR}
                    onChange={(e) => setExtractTextOCR(e.target.checked)}
                  />
                  <span>Extract text from images ✨</span>
                </label>
              </div>
              {uploadingImages.length >= 20 && (
                <span className="upload-limit-warning">Maximum 20 images per upload</span>
              )}
            </div>

            <div className="settings-modal__footer">
              <button type="button" onClick={closeUploadImagesModal}>
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveUploadedImages}
                disabled={isProcessingUpload || uploadingImages.filter(img => !img.error && img.preview).length === 0}
              >
                {isProcessingUpload ? 'Uploading...' : `Upload (${uploadingImages.filter(img => !img.error && img.preview).length})`}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* AI Item Suggestions Modal */}
      {isAISuggestionsOpen && (
        <AIItemSuggestionsModal
          suggestions={aiSuggestions}
          isLoading={suggestionsLoading}
          error={suggestionsError}
          onAddSelected={handleAddSuggestedItems}
          onCancel={handleCloseSuggestions}
          onRetry={handleRetrySuggestions}
        />
      )}

      {/* AI Tier Placement Modal */}
      {isPlacementOpen && (
        <AITierPlacementModal
          placements={aiPlacements}
          isLoading={placementLoading}
          error={placementError}
          tiers={themedTiers}
          itemsById={itemsById}
          onApplySelected={handleApplyPlacements}
          onCancel={handleClosePlacement}
          onRetry={handleRetryPlacement}
        />
      )}

      {/* AI Description Modal */}
      {isDescriptionOpen && (
        <AIDescriptionModal
          description={aiDescription}
          isLoading={descriptionLoading}
          error={descriptionError}
          onGenerate={handleGenerateDescription}
          onClose={handleCloseDescription}
          onRetry={handleRetryDescription}
        />
      )}

      {/* AI Setup Wizard */}
      {isSetupWizardOpen && (
        <AISetupWizard
          isLoading={setupLoading}
          error={setupError}
          setup={setupData}
          onGenerate={handleGenerateSetup}
          onApply={handleApplySetup}
          onCancel={handleCloseSetupWizard}
          onRetry={handleRetrySetup}
        />
      )}

      {/* Natural Language Command Modal */}
      {isCommandModalOpen && (
        <NaturalCommandModal
          isLoading={commandLoading}
          parsedCommand={parsedCommand}
          onSubmit={handleParseCommand}
          onExecute={handleExecuteCommand}
          onCancel={handleCloseCommandModal}
          onClear={handleClearCommand}
        />
      )}

      {/* Load Confirmation Dialog */}
      {showLoadConfirmation && selectedConfigId && (
        <div className="settings-modal__backdrop">
          <div className="confirmation-dialog">
            <h3>Load Tier List?</h3>
            <p>
              Loading "{savedConfigs.find(c => c.id === selectedConfigId)?.name}" will replace your current tier list.
            </p>
            <p className="confirmation-dialog__warning">
              Make sure to save your current list if you want to keep it!
            </p>
            <div className="confirmation-dialog__actions">
              <button className="button" onClick={cancelLoadList}>
                Cancel
              </button>
              <button className="button button--primary" onClick={confirmLoadList}>
                Load
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirmation && selectedConfigId && (
        <div className="settings-modal__backdrop">
          <div className="confirmation-dialog">
            <h3>Delete Saved List?</h3>
            <p>
              Are you sure you want to delete "{savedConfigs.find(c => c.id === selectedConfigId)?.name}"?
            </p>
            <p className="confirmation-dialog__warning">
              This action cannot be undone.
            </p>
            <div className="confirmation-dialog__actions">
              <button className="button" onClick={cancelDeleteList}>
                Cancel
              </button>
              <button className="button button--danger" onClick={confirmDeleteList}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
