-- ============================================================
-- bracket_connectivity.sql
-- Backfills match_number, slot_a/slot_b (R32), and
-- feed_a_match_id/feed_b_match_id (R16+) on all 104 matches.
--
-- Assumes matches were seeded in order:
--   Group (72)  → IDs 1-72
--   R32   (16)  → IDs 73-88
--   R16   (8)   → IDs 89-96
--   QF    (4)   → IDs 97-100
--   SF    (2)   → IDs 101-102
--   THIRD (1)   → ID  103
--   FINAL (1)   → ID  104
-- ============================================================

-- 1. Group-stage match numbers (1–72), ordered by group then kickoff
with ranked as (
  select id,
         row_number() over (order by group_code, kickoff_at, id) as rn
  from matches
  where stage = 'GROUP'
)
update matches m
set match_number = r.rn
from ranked r
where m.id = r.id;

-- 2. Knockout match numbers (fixed to match IDs for this clean seed)
update matches set match_number = id where stage in ('R32','R16','QF','SF','THIRD','FINAL');

-- 3. R32 slot assignments (FIFA WC2026 bracket structure)
--    Groups A-F → left half of bracket
--    Groups G-L → right half of bracket
--    8 best 3rd-place teams fill remaining slots
--    NOTE: update these to match the official FIFA bracket once published.
update matches set slot_a = '1A',    slot_b = '2D'    where match_number = 73;
update matches set slot_a = '1B',    slot_b = '2C'    where match_number = 74;
update matches set slot_a = '1E',    slot_b = '2F'    where match_number = 75;
update matches set slot_a = '1F',    slot_b = '2E'    where match_number = 76;
update matches set slot_a = '1C',    slot_b = '2B'    where match_number = 77;
update matches set slot_a = '1D',    slot_b = '2A'    where match_number = 78;
update matches set slot_a = '3rd-1', slot_b = '3rd-2' where match_number = 79;
update matches set slot_a = '3rd-3', slot_b = '3rd-4' where match_number = 80;
update matches set slot_a = '1G',    slot_b = '2J'    where match_number = 81;
update matches set slot_a = '1H',    slot_b = '2K'    where match_number = 82;
update matches set slot_a = '1K',    slot_b = '2H'    where match_number = 83;
update matches set slot_a = '1L',    slot_b = '2I'    where match_number = 84;
update matches set slot_a = '1I',    slot_b = '2L'    where match_number = 85;
update matches set slot_a = '1J',    slot_b = '2G'    where match_number = 86;
update matches set slot_a = '3rd-5', slot_b = '3rd-6' where match_number = 87;
update matches set slot_a = '3rd-7', slot_b = '3rd-8' where match_number = 88;

-- 4. R16 feed chains (winner of R32 match X plays winner of R32 match Y)
update matches set feed_a_match_id = 73, feed_b_match_id = 74  where match_number = 89;
update matches set feed_a_match_id = 75, feed_b_match_id = 76  where match_number = 90;
update matches set feed_a_match_id = 77, feed_b_match_id = 78  where match_number = 91;
update matches set feed_a_match_id = 79, feed_b_match_id = 80  where match_number = 92;
update matches set feed_a_match_id = 81, feed_b_match_id = 82  where match_number = 93;
update matches set feed_a_match_id = 83, feed_b_match_id = 84  where match_number = 94;
update matches set feed_a_match_id = 85, feed_b_match_id = 86  where match_number = 95;
update matches set feed_a_match_id = 87, feed_b_match_id = 88  where match_number = 96;

-- 5. QF feed chains
update matches set feed_a_match_id = 89, feed_b_match_id = 90  where match_number = 97;
update matches set feed_a_match_id = 91, feed_b_match_id = 92  where match_number = 98;
update matches set feed_a_match_id = 93, feed_b_match_id = 94  where match_number = 99;
update matches set feed_a_match_id = 95, feed_b_match_id = 96  where match_number = 100;

-- 6. SF feed chains
update matches set feed_a_match_id = 97,  feed_b_match_id = 98  where match_number = 101;
update matches set feed_a_match_id = 99,  feed_b_match_id = 100 where match_number = 102;

-- 7. 3rd place: feeds from SF losers (handled in code via USES_LOSER set)
update matches set feed_a_match_id = 101, feed_b_match_id = 102 where match_number = 103;

-- 8. Final: feeds from SF winners
update matches set feed_a_match_id = 101, feed_b_match_id = 102 where match_number = 104;
