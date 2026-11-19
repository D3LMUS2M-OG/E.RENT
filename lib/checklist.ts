export type CheckItem = { key: string; text: string; tip?: string };
export type CheckGroup = { id: string; title: string; items: CheckItem[] };

/** What to check before you pay and before you move in. Kept as data so it can be edited without touching the screen. */
export const CHECKLIST: CheckGroup[] = [
  { id: "water", title: "Water", items: [
    { key: "water_pressure", text: "Run every tap and the shower. Is the pressure good?" },
    { key: "water_hot", text: "Does hot water work (heater or shower)?" },
    { key: "water_leaks", text: "Look under sinks and around the toilet for leaks or stains" },
    { key: "water_source", text: "Ask where the water comes from and how often it runs dry", tip: "Town supply, borehole or a tank? Ask neighbours too." },
    { key: "water_bill", text: "Agree who pays the water bill and how it is shared" },
  ] },
  { id: "power", title: "Power", items: [
    { key: "meter_own", text: "Is the electricity meter yours alone, or shared?", tip: "A separate KPLC prepaid meter is best." },
    { key: "meter_reading", text: "Write down the meter number and today's reading" },
    { key: "sockets", text: "Test sockets and light switches in every room" },
    { key: "outages", text: "Ask how often power goes off in the area" },
  ] },
  { id: "security", title: "Security", items: [
    { key: "locks", text: "Test every door and window lock", tip: "Ask for the keys to be counted, and who else has a copy." },
    { key: "rekey", text: "Ask to change or re-key the lock before you move in" },
    { key: "gate", text: "Check the gate, fence, guard and lights outside at night" },
    { key: "neighbours", text: "Talk to a neighbour about the area and the building" },
  ] },
  { id: "condition", title: "Condition of the house", items: [
    { key: "damp", text: "Look and smell for damp, mould or peeling paint" },
    { key: "roof", text: "Look at the ceiling for stains that could mean a leaking roof" },
    { key: "toilet", text: "Flush the toilet and check the drains run freely" },
    { key: "windows", text: "Open and close every window and door" },
    { key: "pests", text: "Look for signs of rats, cockroaches or termites" },
    { key: "photos", text: "Photograph every room and any damage before you move in", tip: "Send the photos to the landlord so you are not blamed for old damage." },
  ] },
  { id: "money", title: "Money and paperwork", items: [
    { key: "lease_read", text: "Read the whole tenancy agreement and keep a copy" },
    { key: "deposit", text: "Agree the deposit amount and when it is returned", tip: "Get a receipt for every payment." },
    { key: "rent_due", text: "Agree the rent due date and how you pay (never cash without a receipt)" },
    { key: "notice", text: "Check the notice period for leaving and for any rent increase" },
    { key: "extras", text: "Ask what else you pay: service charge, garbage, security, water" },
    { key: "view_first", text: "You viewed the house in person before paying anything" },
  ] },
  { id: "handover", title: "Handover", items: [
    { key: "keys", text: "You received all the keys and counted them" },
    { key: "inventory", text: "Fittings listed and signed by both of you (cooker, wardrobes, fixtures)" },
  ] },
];
export const ALL_KEYS = CHECKLIST.flatMap((g) => g.items.map((i) => i.key));
