import type { Metadata } from "next";
import { Block, InfoPage } from "@/components/layout/info-page";

export const metadata: Metadata = { title: "Safety tips" };

export default function SafetyPage() {
  return (
    <InfoPage title="Stay safe when renting" intro="Most landlords are honest. These habits protect you from the few who are not.">
      <Block title="Before you pay anything">
        <ul className="list-disc space-y-2 pl-5"><li><b className="text-foreground">Never pay before you view in person.</b> No deposit, no booking fee, no &ldquo;reservation&rdquo;.</li><li>Go to the house, and ask to see the landlord or caretaker and the compound.</li><li>Check for the blue Verified badge, and ask for proof the person can let the house.</li><li>Be careful when the price looks too good or you are rushed.</li></ul>
      </Block>
      <Block title="In chat" d={1}>
        <ul className="list-disc space-y-2 pl-5"><li>Keep conversations on E.Rent where you can. Share your phone number only when you are comfortable.</li><li>Never share your PIN, M-Pesa codes or ID photos in chat.</li><li>Use <b className="text-foreground">Report</b> on any listing or chat that feels wrong, and <b className="text-foreground">Block</b> anyone who bothers you.</li></ul>
      </Block>
      <Block title="Viewing and signing" d={2}>
        <ul className="list-disc space-y-2 pl-5"><li>Tell a friend where you are going, and view in daylight when you can.</li><li>Read the tenancy agreement fully before signing and keep a copy.</li><li>Pay by a traceable method and keep receipts for the deposit and rent.</li></ul>
      </Block>
    </InfoPage>
  );
}
