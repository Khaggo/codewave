import { appendFileSync, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const distDir = process.env.NEXT_DIST_DIR?.trim() || '.next'
const buildRoot = path.join(repoRoot, 'frontend', distDir)
const manifestPath = path.join(buildRoot, 'app-build-manifest.json')
const baselinePath = path.join(repoRoot, 'tools', 'web-performance-baseline.json')
const reportPath = path.join(buildRoot, 'web-bundle-report.json')

if (!existsSync(manifestPath)) {
  console.error(
    `Missing ${path.relative(repoRoot, manifestPath)}. Run npm run build:web first.`,
  )
  process.exit(2)
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))
const layoutFiles = manifest.pages['/layout'] ?? []
const failures = []
const routes = {}

for (const [route, expected] of Object.entries(baseline.routes)) {
  const routeFiles = manifest.pages[route]
  if (!routeFiles) {
    failures.push(`${route}: missing from app build manifest`)
    continue
  }

  const javaScriptFiles = [...new Set([...layoutFiles, ...routeFiles])].filter((file) =>
    file.endsWith('.js'),
  )
  const rawJavaScriptBytes = javaScriptFiles.reduce(
    (total, file) => total + statSync(path.join(buildRoot, file)).size,
    0,
  )
  const maximumBytes = Math.floor(
    expected.rawJavaScriptBytes * (1 + baseline.allowedGrowthPercent / 100),
  )
  const growthPercent =
    ((rawJavaScriptBytes - expected.rawJavaScriptBytes) / expected.rawJavaScriptBytes) * 100

  routes[route] = {
    rawJavaScriptBytes,
    baselineBytes: expected.rawJavaScriptBytes,
    maximumBytes,
    growthPercent: Number(growthPercent.toFixed(2)),
    files: javaScriptFiles,
  }

  if (rawJavaScriptBytes > maximumBytes) {
    failures.push(
      `${route}: ${rawJavaScriptBytes} bytes exceeds the ${maximumBytes}-byte budget`,
    )
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  allowedGrowthPercent: baseline.allowedGrowthPercent,
  routes,
  failures,
}

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)

const summary = Object.entries(routes)
  .map(
    ([route, result]) =>
      `| ${route} | ${result.rawJavaScriptBytes} | ${result.baselineBytes} | ${result.growthPercent}% |`,
  )
  .join('\n')
const summaryMarkdown = [
  '## Staff web bundle budget',
  '',
  '| Route | Current bytes | Baseline bytes | Growth |',
  '| --- | ---: | ---: | ---: |',
  summary,
  '',
].join('\n')

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, summaryMarkdown)
}

console.log(summaryMarkdown)
console.log(`Report: ${path.relative(repoRoot, reportPath)}`)

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}
