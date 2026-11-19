import { Clock, Zap } from "lucide-react";
import { describeAvailability, responseLabel, type Availability } from "@/lib/availability";

/** "Replies within 1 hour" and the hours the landlord says they are around. Shows only what is true and known. */
export function ResponseInfo({ minutes, availability }: { minutes: number | null | undefined; availability?: Availability | null }) {
  const label = responseLabel(minutes);
  if (!label && !availability) return null;
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      {label && <li className="inline-flex items-center gap-1.5 font-medium"><Zap className="size-4 text-accent" aria-hidden />{label}</li>}
      {availability && <li className="inline-flex items-center gap-1.5 text-muted"><Clock className="size-4" aria-hidden />Usually around {describeAvailability(availability)}{availability.note ? `. ${availability.note}` : ""}</li>}
    </ul>
  );
}
