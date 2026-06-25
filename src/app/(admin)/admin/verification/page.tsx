import { getDb } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VerificationActions } from "@/components/admin/verification-actions";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Shop Verification" };
export const dynamic = "force-dynamic";

export default async function VerificationPage() {
  const db = getDb();
  const { data: pendingShops } = await db
    .from("shops")
    .select("*")
    .eq("verification_status", "pending")
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Verification Queue</h2>
        <p className="text-muted-foreground">
          Review and approve pharmacy registrations
        </p>
      </div>

      {!pendingShops?.length ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            No pending verifications. All shops are reviewed.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pendingShops.map((shop) => (
            <Card key={shop.id}>
              <CardHeader>
                <CardTitle className="text-lg">{shop.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {shop.owner_name} · {shop.city}, {shop.state} · Registered{" "}
                  {formatDate(shop.created_at)}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <p>
                    <span className="text-muted-foreground">Phone:</span>{" "}
                    {shop.phone}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Drug License:</span>{" "}
                    {shop.drug_license_no}
                  </p>
                  <p>
                    <span className="text-muted-foreground">PAN:</span>{" "}
                    {shop.pan_no}
                  </p>
                  <p>
                    <span className="text-muted-foreground">GST:</span>{" "}
                    {shop.gst_no}
                  </p>
                  <p className="sm:col-span-2">
                    <span className="text-muted-foreground">Address:</span>{" "}
                    {shop.address}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  {shop.drug_license_url && (
                    <a
                      href={shop.drug_license_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Drug License
                    </a>
                  )}
                  {shop.pan_url && (
                    <a
                      href={shop.pan_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      PAN
                    </a>
                  )}
                  {shop.gst_url && (
                    <a
                      href={shop.gst_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      GST
                    </a>
                  )}
                  {shop.shop_photo_url && (
                    <a
                      href={shop.shop_photo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Shop Photo
                    </a>
                  )}
                </div>
                <VerificationActions shopId={shop.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
