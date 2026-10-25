import { ProjectFile } from '../types';

export interface Preset {
  id: string;
  name: string;
  description: string;
  files: ProjectFile[];
  activeFileId: string;
}

export const PRESETS: Preset[] = [
  {
    id: 'basics',
    name: 'TypeScript Essentials',
    description: 'Interfaces, Generics, Discriminated Unions & Enums',
    activeFileId: 'main',
    files: [
      {
        id: 'main',
        name: 'index.ts',
        isEntry: true,
        content: `// 🚀 Welcome to TypeScript Browser Compiler!
// Write, import, edit, compile & run directly in your browser.

// 1. Interfaces & Types
interface User {
  id: number;
  name: string;
  role: 'developer' | 'designer' | 'manager';
  skills: string[];
}

// 2. Generic Cache Repository
class CacheStore<T> {
  private items = new Map<string, T>();

  set(key: string, value: T): void {
    this.items.set(key, value);
    console.info(\`[Cache] Saved item for key: "\${key}"\`);
  }

  get(key: string): T | undefined {
    return this.items.get(key);
  }

  list(): Array<{ key: string; value: T }> {
    return Array.from(this.items.entries()).map(([key, value]) => ({ key, value }));
  }
}

// 3. Discriminated Union
type ApiResponse<T> =
  | { status: 'success'; data: T; timestamp: number }
  | { status: 'error'; message: string; code: number };

function formatResponse<T>(res: ApiResponse<T>): string {
  switch (res.status) {
    case 'success':
      return \`Success (\${res.timestamp}): \${JSON.stringify(res.data)}\`;
    case 'error':
      return \`Error \${res.code}: \${res.message}\`;
  }
}

// 4. Let's execute and test!
console.log('--- 🧪 Initializing Cache ---');
const userStore = new CacheStore<User>();

userStore.set('dev-01', {
  id: 101,
  name: 'Ada Lovelace',
  role: 'developer',
  skills: ['TypeScript', 'Math', 'Algorithms']
});

userStore.set('dev-02', {
  id: 102,
  name: 'Grace Hopper',
  role: 'developer',
  skills: ['Compilers', 'Systems', 'Fortran']
});

console.log('User Store contents:');
console.table(userStore.list());

const successResult: ApiResponse<User[]> = {
  status: 'success',
  data: userStore.list().map(item => item.value),
  timestamp: Date.now()
};

console.log('Formatted API Response:', formatResponse(successResult));
console.log('🎉 TypeScript compilation and runtime verified!');
`
      }
    ]
  },
  {
    id: 'multi-file',
    name: 'Multi-File Modules',
    description: 'Imports and exports across multiple project files',
    activeFileId: 'app-main',
    files: [
      {
        id: 'app-main',
        name: 'index.ts',
        isEntry: true,
        content: `// 📦 Multi-File Module Demo
// Importing from local files: ./models.ts and ./calculator.ts

import { Item, CartSummary } from './models';
import { calculateCartTotal, formatCurrency } from './calculator';

const cart: Item[] = [
  { id: 'p1', name: 'Ultra-Wide Monitor', price: 449.99, quantity: 1, category: 'hardware' },
  { id: 'p2', name: 'Mechanical Keyboard', price: 129.50, quantity: 2, category: 'hardware' },
  { id: 'p3', name: 'Cloud Dev Subscription', price: 29.00, quantity: 3, category: 'software' }
];

console.log('Cart Items:');
console.table(cart);

const summary: CartSummary = calculateCartTotal(cart, 0.08); // 8% sales tax

console.log(\`Subtotal: \${formatCurrency(summary.subtotal)}\`);
console.log(\`Tax (8%): \${formatCurrency(summary.tax)}\`);
console.log(\`Total:    \${formatCurrency(summary.total)}\`);
console.log(\`Total Items Count: \${summary.itemCount}\`);
`
      },
      {
        id: 'app-models',
        name: 'models.ts',
        content: `export interface Item {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: 'hardware' | 'software' | 'services';
}

export interface CartSummary {
  subtotal: number;
  tax: number;
  total: number;
  itemCount: number;
}
`
      },
      {
        id: 'app-calc',
        name: 'calculator.ts',
        content: `import { Item, CartSummary } from './models';

export function calculateCartTotal(items: Item[], taxRate: number = 0): CartSummary {
  const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round(total * 100) / 100,
    itemCount
  };
}

export function formatCurrency(amount: number): string {
  return '$' + amount.toFixed(2);
}
`
      }
    ]
  },
  {
    id: 'canvas',
    name: 'Interactive Canvas Graphics',
    description: 'Live 2D particle simulation rendered to execution canvas',
    activeFileId: 'canvas-main',
    files: [
      {
        id: 'canvas-main',
        name: 'index.ts',
        isEntry: true,
        content: `// 🎨 Live 2D Particle Simulation
// The runner provides an HTML5 canvas element with id="preview-canvas"

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

const canvas = document.getElementById('preview-canvas') as HTMLCanvasElement;

if (!canvas) {
  console.warn('Preview canvas not found. Check the Canvas view tab!');
} else {
  const ctx = canvas.getContext('2d')!;
  const width = canvas.width = 480;
  const height = canvas.height = 280;

  const colors = ['#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#34d399'];
  const particles: Particle[] = [];

  // Generate particles
  for (let i = 0; i < 45; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 2.5,
      vy: (Math.random() - 0.5) * 2.5,
      radius: Math.random() * 3 + 2,
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }

  console.info(\`Simulating \${particles.length} particles in canvas (\${width}x\${height})\`);

  // Render frame
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, width, height);

  // Draw connecting lines
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 75) {
        ctx.strokeStyle = \`rgba(129, 140, 248, \${1 - dist / 75})\`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.stroke();
      }
    }
  }

  // Draw nodes
  particles.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = p.color;
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  console.log('✅ Canvas graphic rendered successfully! View in the Canvas tab.');
}
`
      }
    ]
  },
  {
    id: 'async',
    name: 'Async Pipeline & Promises',
    description: 'Typed async/await workflows, retry logic & data transforms',
    activeFileId: 'async-main',
    files: [
      {
        id: 'async-main',
        name: 'index.ts',
        isEntry: true,
        content: `// ⚡ Typed Asynchronous Data Pipeline

interface WeatherStation {
  id: string;
  city: string;
  elevation: number;
}

interface TelemetryReport {
  stationId: string;
  temperatureC: number;
  humidityPercent: number;
  recordedAt: string;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchStationMeta(id: string): Promise<WeatherStation> {
  console.info(\`[Network] Fetching station metadata for \${id}...\`);
  await sleep(150);
  return {
    id,
    city: 'San Francisco, CA',
    elevation: 52
  };
}

async function fetchTelemetry(stationId: string): Promise<TelemetryReport> {
  console.info(\`[Network] Polling sensors for \${stationId}...\`);
  await sleep(200);
  return {
    stationId,
    temperatureC: 18.4,
    humidityPercent: 72,
    recordedAt: new Date().toISOString()
  };
}

async function runPipeline() {
  console.time('Full Pipeline Execution');
  
  const [station, report] = await Promise.all([
    fetchStationMeta('STATION-902'),
    fetchTelemetry('STATION-902')
  ]);

  const fahrenheit = (report.temperatureC * 9/5) + 32;

  console.log('Telemetry Synced:');
  console.table({
    Station: station.city,
    'Temp (°C)': report.temperatureC,
    'Temp (°F)': fahrenheit.toFixed(1),
    'Humidity (%)': report.humidityPercent,
    Timestamp: report.recordedAt
  });

  console.timeEnd('Full Pipeline Execution');
  return { success: true, processed: 1 };
}

runPipeline().then(result => {
  console.log('Pipeline finished with output:', result);
});
`
      }
    ]
  },
  {
    id: 'algorithms',
    name: 'Algorithms & Benchmarks',
    description: 'Generic QuickSort, Binary Search, and micro-benchmarking',
    activeFileId: 'algo-main',
    files: [
      {
        id: 'algo-main',
        name: 'index.ts',
        isEntry: true,
        content: `// 🧮 Generic QuickSort & Benchmark

type Comparator<T> = (a: T, b: T) => number;

function quickSort<T>(arr: T[], compare: Comparator<T>): T[] {
  if (arr.length <= 1) return arr;
  
  const pivot = arr[Math.floor(arr.length / 2)];
  const left: T[] = [];
  const middle: T[] = [];
  const right: T[] = [];

  for (const item of arr) {
    const diff = compare(item, pivot);
    if (diff < 0) left.push(item);
    else if (diff > 0) right.push(item);
    else middle.push(item);
  }

  return [...quickSort(left, compare), ...middle, ...quickSort(right, compare)];
}

// Generate random numbers
const arraySize = 5000;
console.log(\`Generating random dataset of \${arraySize} numbers...\`);
const dataset = Array.from({ length: arraySize }, () => Math.floor(Math.random() * 100000));

console.time('QuickSort Performance');
const sorted = quickSort(dataset, (a, b) => a - b);
console.timeEnd('QuickSort Performance');

console.log(\`Sorted verify: First 5: [\${sorted.slice(0, 5).join(', ')}] | Last 5: [\${sorted.slice(-5).join(', ')}]\`);

// Verify sorted invariant
let isSorted = true;
for (let i = 1; i < sorted.length; i++) {
  if (sorted[i] < sorted[i - 1]) {
    isSorted = false;
    break;
  }
}
console.log('Sorting invariant verified:', isSorted ? '✅ SUCCESS' : '❌ FAILED');
`
      }
    ]
  }
];
