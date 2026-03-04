# Visual Cortex - Improvement Roadmap

## 🎯 Current State Analysis
✅ **Working Well:**
- ReactFlow-based interactive map
- Rich service nodes with metrics
- Health scoring system
- Dependency visualization
- Click-to-details sidebar
- Auto-layout with Dagre

## 🚀 Proposed Improvements (Priority Order)

### **1. CRITICAL - Auto-Refresh & Live Updates** 
**Impact:** HIGH | **Effort:** LOW
- Poll for updates every 10-30 seconds
- Show "Live" indicator when data is fresh
- Highlight services that changed since last update
- Add toggle to pause/resume auto-refresh

```tsx
// Add to CortexPage
const [isLive, setIsLive] = useState(true);
const [lastChange, setLastChange] = useState<Set<number>>(new Set());

useEffect(() => {
  if (!isLive) return;
  const interval = setInterval(async () => {
    const newData = await getCortexServices(repoId);
    // Compare and highlight changes
  }, 30000);
  return () => clearInterval(interval);
}, [isLive]);
```

### **2. HIGH - Filter & Sort Controls**
**Impact:** HIGH | **Effort:** MEDIUM
- Filter by: Status (Healthy/Warning/Critical), Layer (API/Logic/Data)
- Sort by: Health score, Complexity, Dependencies
- Quick filters: "Show only issues", "High complexity only"

```tsx
// Add filter toolbar
<div className="flex gap-2">
  <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>
    All Services ({services.length})
  </FilterButton>
  <FilterButton active={filter === 'critical'} onClick={() => setFilter('critical')}>
    Critical ({services.filter(s => s.status === 'critical').length})
  </FilterButton>
  <FilterButton active={filter === 'warning'} onClick={() => setFilter('warning')}>
    Has Issues ({services.filter(s => s.health.issues.length > 0).length})
  </FilterButton>
</div>
```

### **3. HIGH - Enhanced Search with Highlighting**
**Impact:** MEDIUM | **Effort:** LOW
- Highlight matching nodes visually
- Dim non-matching nodes
- Show match count
- Auto-focus on first result

```tsx
const highlightedNodes = useMemo(() => {
  if (!searchQuery) return nodes;
  return nodes.map(node => ({
    ...node,
    style: {
      ...node.style,
      opacity: (node.data as ServiceData).name
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ? 1 : 0.3,
      filter: (node.data as ServiceData).name
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ? 'brightness(1.2)' : 'brightness(0.7)',
    }
  }));
}, [nodes, searchQuery]);
```

### **4. MEDIUM - Quick Action Buttons**
**Impact:** MEDIUM | **Effort:** LOW
- "Fit View" - Reset zoom/pan
- "Hide Healthy" - Focus on problems
- "Show Critical Path" - Highlight critical service dependencies
- "Export PNG" - Download diagram

```tsx
import { toPng } from 'html-to-image';

const exportDiagram = useCallback(() => {
  const element = document.querySelector('.react-flow');
  if (element) {
    toPng(element as HTMLElement).then(dataUrl => {
      const link = document.createElement('a');
      link.download = `cortex-${repoId}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    });
  }
}, [repoId]);
```

### **5. MEDIUM - Keyboard Shortcuts**
**Impact:** MEDIUM | **Effort:** LOW
- `ESC` - Close sidebar
- `/` - Focus search
- `F` - Fit view
- `1/2/3` - Filter by layer
- `H` - Hide/show healthy services
- `R` - Refresh data

```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setSelectedService(null);
    if (e.key === '/' && e.target !== searchInputRef.current) {
      e.preventDefault();
      searchInputRef.current?.focus();
    }
    if (e.key === 'f') fitView();
    if (e.key === 'r') window.location.reload();
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

### **6. MEDIUM - Dependency Path Finder**
**Impact:** MEDIUM | **Effort:** MEDIUM
- Click 2 services to show dependency path between them
- Highlight the path with different color
- Show "hops" count

```tsx
const [pathMode, setPathMode] = useState<{start?: number; end?: number}>({});
const [highlightedPath, setHighlightedPath] = useState<number[]>([]);

const findPath = (start: number, end: number, services: ServiceData[]) => {
  // BFS to find shortest path
  const queue = [[start]];
  const visited = new Set([start]);
  
  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1];
    
    if (current === end) return path;
    
    const service = services.find(s => s.id === current);
    service?.connections.forEach(next => {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push([...path, next]);
      }
    });
  }
  return null;
};
```

### **7. LOW - Metric Toggles**
**Impact:** LOW | **Effort:** LOW
- Toggle visibility of specific metrics on nodes
- Compact/Detailed view modes
- Remember preference in localStorage

### **8. LOW - Time-based Pulse Animation**
**Impact:** LOW | **Effort:** MEDIUM
- Pulse services changed in last 5 minutes (from timeline data)
- Fade effect based on recency
- Show "new" badge for services added today

### **9. LOW - Advanced Filtering**
**Impact:** LOW | **Effort:** MEDIUM
- Complexity threshold slider
- Dependency count range
- Show only connected to selected service

### **10. LOW - Performance Metrics Panel**
**Impact:** LOW | **Effort:** HIGH
- Real-time latency graph overlay
- Error rate trends
- Traffic flow visualization

## 📊 Recommended Implementation Order

**Phase 1 (This Week):**
1. Auto-refresh with live indicator
2. Enhanced search with highlighting
3. Quick action buttons (Fit View, Hide Healthy, Refresh)

**Phase 2 (Next Week):**
4. Filter & sort controls
5. Keyboard shortcuts
6. Export to PNG

**Phase 3 (Future):**
7. Dependency path finder
8. Time-based pulse animations
9. Advanced filtering
10. Real-time performance overlay

## 🎨 UI/UX Improvements

### Color Coding Enhancements
- Use gradients for health scores
- Add subtle glow effects for recently updated services
- Better contrast for accessibility

### Interaction Improvements
- Double-click node to zoom and center
- Right-click for context menu (View files, Run tests, Deploy)
- Drag-and-drop to manually adjust layout (save preference)

### Information Density
- Add tooltips with full metric details on hover
- Show dependency count on edges
- Display service owner/team if available

## 🔧 Technical Improvements

### Performance
- Virtualize nodes for repos with 50+ services
- Lazy load full metrics on node selection
- Debounce search and filter operations

### Data Quality
- Add timestamp to each metric
- Track metric trends (up/down arrows)
- Cache layout positions per repo

### Error Handling
- Graceful degradation if metrics unavailable
- Retry failed API calls
- Show stale data indicator

## 📈 Future Vision

**Ultimate Goal:** Real-time system observability dashboard
- WebSocket for instant updates
- Click service → see live logs
- One-click deploy from diagram
- Alert rules based on health scores
- Historical playback (scrub timeline to see architecture evolution)
