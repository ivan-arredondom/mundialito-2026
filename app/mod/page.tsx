import { requireMod } from '@/lib/require-mod'

export default async function ModPage() {
  await requireMod()

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-black mb-1">Mod Panel</h1>
      <p className="text-gray-500 text-sm mb-10">Mundialito 2026 — moderator controls</p>
      <p className="text-gray-400">Mod tools coming soon.</p>
    </div>
  )
}
