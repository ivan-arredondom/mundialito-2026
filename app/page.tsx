import Link from 'next/link'
import Countdown from '@/components/countdown'

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="bg-[#cc0000] text-white py-24 px-4 text-center">
        <h1 className="text-5xl font-black tracking-tight mb-2">
          MUNDIALITO <span className="text-[#f5c518]">2026</span>
        </h1>
        <p className="text-red-200 uppercase tracking-widest text-sm mb-10">
          FIFA World Cup Prediction Pool
        </p>
        <div className="mb-6">
          <p className="text-red-200 text-xs uppercase tracking-widest mb-4">
            Lock: June 11, 2026
          </p>
          <Countdown />
        </div>
        <p className="text-red-100 max-w-xl mx-auto mb-10 text-lg leading-relaxed">
          Predict every score. <strong>48 teams. 104 matches. One champion.</strong> Climb the
          leaderboard.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/signup"
            className="bg-[#f5c518] text-black font-bold px-8 py-3 rounded-full text-base hover:bg-yellow-300 transition-colors"
          >
            Join the pool
          </Link>
          <Link
            href="/leaderboard"
            className="border-2 border-white text-white font-bold px-8 py-3 rounded-full text-base hover:bg-white hover:text-[#cc0000] transition-colors"
          >
            See leaderboard
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-4 py-20 grid md:grid-cols-2 gap-12">
        <div>
          <h2 className="text-2xl font-black mb-6 uppercase tracking-tight">How to join</h2>
          <ol className="space-y-4">
            {[
              'Register an account',
              'Create a bracket (unlimited entries)',
              'Predict every group-stage score',
              'Pick which teams advance through each knockout round',
              'Lock in before June 11, 2026',
            ].map((step, i) => (
              <li key={i} className="flex gap-4 items-start">
                <span className="bg-[#cc0000] text-white font-black w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm">
                  {i + 1}
                </span>
                <span className="text-gray-700 pt-1">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div>
          <h2 className="text-2xl font-black mb-6 uppercase tracking-tight">How points work</h2>
          <div className="space-y-3 text-sm">
            <div className="font-semibold text-gray-500 uppercase text-xs tracking-widest mt-4 mb-2">
              Group Stage (72 matches)
            </div>
            <Row label="Exact score predicted" pts={5} />
            <Row label="Correct result (W/D/L)" pts={3} />
            <div className="font-semibold text-gray-500 uppercase text-xs tracking-widest mt-6 mb-2">
              Knockout advancement bonuses
            </div>
            <Row label="Advance from groups" pts={3} />
            <Row label="Reach Round of 16" pts={3} />
            <Row label="Reach Quarterfinals" pts={5} />
            <Row label="Reach Semifinals" pts={5} />
            <Row label="Reach the Final" pts={5} />
            <Row label="Correctly predict the winner" pts={5} />
          </div>
        </div>
      </section>
    </>
  )
}

function Row({ label, pts }: { label: string; pts: number }) {
  return (
    <div className="flex justify-between items-center border-b border-gray-100 pb-2">
      <span className="text-gray-700">{label}</span>
      <span className="font-black text-[#cc0000]">{pts} pts</span>
    </div>
  )
}
