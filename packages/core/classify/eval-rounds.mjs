// CLI for the applicability-rounds prototype. WIP, not wired into the build.
// Run from repo root:  node packages/core/classify/eval-rounds.mjs [apgName|all]
import { run, ANS } from './rounds-lib.mjs'

const arg = process.argv[2]
if (arg && arg !== 'all') {
  const r = run(arg); if (!r) { console.error('no answers for', arg); process.exit(1) }
  console.log(JSON.stringify(r, null, 2))
} else {
  console.log('component    widget live kbd  yesFacets  questions(9+sub)  applies  n/a  depends')
  for (const n of Object.keys(ANS)) {
    const r = run(n); if (!r) { console.log(n.padEnd(12), '(skip)'); continue }
    console.log(`${r.NAME.padEnd(12)} ${String(r.widget).padEnd(6)} ${String(r.live).padEnd(4)} ${String(r.kbd).padEnd(4)} ${String(r.yesFacets.length).padStart(8)}   ${String(r.q).padStart(13)}   ${String(r.applies).padStart(6)} ${String(r.na).padStart(4)} ${String(r.dep).padStart(7)}`)
  }
  console.log('\n(naive = 135 questions; flat 1-level ≈ 67 for a 4-facet component)')
}
