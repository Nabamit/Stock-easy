import { Clock, Mail } from "lucide-react";
import { requireSession } from "@/lib/auth/actions";
import { logoutAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Verification Pending" };

export default async function PendingPage() {
  const session = await requireSession();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardContent className="p-8">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold">Verification Pending</h1>
          <p className="mt-3 text-muted-foreground">
            Hi <strong>{session.name}</strong>, your shop{" "}
            <strong>{session.shopName}</strong> is under review by our central
            team.
          </p>
          <div className="mt-6 space-y-3 rounded-lg bg-muted p-4 text-left text-sm">
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              We&apos;ll notify you at <strong>{session.email}</strong> once
              approved.
            </p>
            <p>
              This usually takes 24–48 hours. Please ensure all documents are
              valid.
            </p>
          </div>
          <form action={logoutAction} className="mt-8">
            <Button variant="outline" type="submit">
              Sign Out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
