"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VerificationActions } from "@/components/admin/verification-actions";
import { formatDate } from "@/lib/utils";
import { ShieldCheck, History, Lock, UserCheck, AlertTriangle } from "lucide-react";
import { getVerificationHistoryAction } from "@/lib/admin/actions";

interface VerificationClientProps {
  pendingShops: any[];
  isSuper: boolean;
  initialHistoryShops: any[];
}

export function VerificationClient({
  pendingShops,
  isSuper,
  initialHistoryShops,
}: VerificationClientProps) {
  const [tab, setTab] = useState<"pending" | "history">("pending");
  const [historyShops, setHistoryShops] = useState<any[]>(initialHistoryShops);
  const [selectedShop, setSelectedShop] = useState<any | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleRefreshHistory = () => {
    startTransition(async () => {
      const res = await getVerificationHistoryAction();
      setHistoryShops(res);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Shop Verification Center</h2>
          <p className="text-muted-foreground text-sm">
            Review pharmacy credentials, drug licenses, and verify registrations.
          </p>
        </div>

        <div className="flex bg-muted/65 p-1.5 rounded-xl border w-fit">
          <Button
            variant={tab === "pending" ? "default" : "ghost"}
            size="sm"
            className="rounded-lg text-xs"
            onClick={() => setTab("pending")}
          >
            <ShieldCheck className="h-3.5 w-3.5 mr-1" />
            Pending Queue ({pendingShops.length})
          </Button>
          <Button
            variant={tab === "history" ? "default" : "ghost"}
            size="sm"
            className="rounded-lg text-xs"
            onClick={() => {
              setTab("history");
              handleRefreshHistory();
            }}
          >
            <History className="h-3.5 w-3.5 mr-1" />
            Review Logs
          </Button>
        </div>
      </div>

      {tab === "pending" && (
        <div className="space-y-4">
          {!pendingShops.length ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground text-sm">
                🎉 No pending verifications. All pharmacy sign-ups have been reviewed.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pendingShops.map((shop) => (
                <Card key={shop.id} className="border shadow-sm overflow-hidden hover:shadow transition-shadow">
                  <CardHeader
                    className="bg-muted/30 cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => setSelectedShop(shop)}
                  >
                    <CardTitle className="text-base font-semibold text-primary hover:underline flex items-center justify-between">
                      <span>{shop.name}</span>
                      <span className="text-[11px] font-normal text-muted-foreground">Click to view details</span>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Owner: {shop.owner_name} · Locality: {shop.city}, {shop.state} · Registered {formatDate(shop.created_at)}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4 text-xs sm:text-sm">
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      <p>
                        <span className="text-muted-foreground font-medium">Contact Phone:</span> {shop.phone || "—"}
                      </p>
                      <p>
                        <span className="text-muted-foreground font-medium">Drug License No:</span> {shop.drug_license_no || "—"}
                      </p>
                      <p>
                        <span className="text-muted-foreground font-medium">PAN ID:</span> {shop.pan_no || "—"}
                      </p>
                      <p>
                        <span className="text-muted-foreground font-medium">GSTIN:</span> {shop.gst_no || "—"}
                      </p>
                      <p className="sm:col-span-2">
                        <span className="text-muted-foreground font-medium">Full Address:</span> {shop.address || "—"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-4 pt-2 border-t text-xs font-semibold text-primary">
                      {shop.drug_license_url && (
                        <a href={shop.drug_license_url} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                          📄 Drug License Document
                        </a>
                      )}
                      {shop.pan_url && (
                        <a href={shop.pan_url} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                          📄 PAN Document
                        </a>
                      )}
                      {shop.gst_url && (
                        <a href={shop.gst_url} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                          📄 GST Document
                        </a>
                      )}
                    </div>

                    <div className="pt-4 border-t flex justify-between items-center">
                      <Button variant="outline" size="sm" onClick={() => setSelectedShop(shop)} className="text-xs">
                        View Details
                      </Button>
                      <VerificationActions shopId={shop.id} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-4">
          {!isSuper ? (
            <Card className="border">
              <CardContent className="py-12 text-center text-muted-foreground text-sm flex flex-col items-center justify-center gap-2">
                <Lock className="h-8 w-8 text-rose-500" />
                <p className="font-semibold text-foreground">Review Logs Restricted</p>
                <p className="max-w-md text-xs text-muted-foreground">
                  Your regular administrator role cannot inspect verification history logs. Please contact a Super Admin to view audits.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={handleRefreshHistory} disabled={isPending} className="text-xs">
                  Refresh Review Log
                </Button>
              </div>

              {!historyShops.length ? (
                <Card>
                  <CardContent className="py-16 text-center text-muted-foreground text-sm">
                    No reviewed shops found in history.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {historyShops.map((shop) => (
                    <Card key={shop.id} className="border shadow-sm hover:shadow transition-shadow">
                      <CardContent
                        className="p-4 text-xs sm:text-sm cursor-pointer hover:bg-muted/5 transition-colors"
                        onClick={() => setSelectedShop(shop)}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-3 gap-2">
                          <div>
                            <h4 className="font-bold text-sm text-primary hover:underline">{shop.name}</h4>
                            <p className="text-[11px] text-muted-foreground">
                              Owner: {shop.owner_name} · {shop.city}, {shop.state}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={shop.verification_status === "approved" ? "success" : "destructive"}>
                              {shop.verification_status.toUpperCase()}
                            </Badge>
                          </div>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2 mt-3 text-xs">
                          <div className="space-y-1">
                            <p className="flex items-center gap-1.5 text-muted-foreground">
                              <UserCheck className="h-3.5 w-3.5 text-primary" />
                              Reviewed by: <strong className="text-foreground">{shop.verifier?.name || "System"}</strong> ({shop.verifier?.email || "—"})
                            </p>
                            <p className="text-muted-foreground">
                              Review timestamp: <span className="text-foreground">{formatDate(shop.verified_at || shop.updated_at)}</span>
                            </p>
                          </div>
                          {shop.verification_status === "rejected" && (
                            <div className="bg-rose-50/10 dark:bg-rose-950/5 border border-rose-100 dark:border-rose-950/20 p-2.5 rounded-lg">
                              <p className="font-medium text-rose-700 dark:text-rose-400 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" /> Rejection Notes:
                              </p>
                              <p className="text-muted-foreground mt-0.5">{shop.verification_notes || "No reason specified."}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Detailed Shop View Modal */}
      {selectedShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-background border rounded-xl shadow-2xl p-6 m-4 animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-start border-b pb-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">{selectedShop.name}</h3>
                <div className="flex gap-1.5 mt-1">
                  <Badge variant={selectedShop.verification_status === "approved" ? "success" : selectedShop.verification_status === "pending" ? "warning" : "destructive"}>
                    {selectedShop.verification_status.toUpperCase()}
                  </Badge>
                  <Badge variant={selectedShop.subscription_status === "active" ? "outline" : "secondary"}>
                    Subscription: {selectedShop.subscription_status?.toUpperCase() || "TRIAL"}
                  </Badge>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedShop(null)} className="h-8 w-8 p-0 rounded-full hover:bg-muted">
                ✕
              </Button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Owner Account Name</span>
                  <p className="font-medium text-foreground mt-0.5">{selectedShop.owner_name}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Contact Phone</span>
                  <p className="font-medium text-foreground mt-0.5">{selectedShop.phone || "—"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Drug License Number</span>
                  <p className="font-medium text-foreground mt-0.5">{selectedShop.drug_license_no || "—"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">GSTIN Number</span>
                  <p className="font-medium text-foreground mt-0.5">{selectedShop.gst_no || "—"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">PAN ID</span>
                  <p className="font-medium text-foreground mt-0.5">{selectedShop.pan_no || "—"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Pincode</span>
                  <p className="font-medium text-foreground mt-0.5">{selectedShop.pincode || "—"}</p>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">City & State</span>
                  <p className="font-medium text-foreground mt-0.5">{selectedShop.city}, {selectedShop.state}</p>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Full Business Address</span>
                  <p className="font-medium text-foreground mt-0.5">{selectedShop.address || "—"}</p>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Uploaded Documents</span>
                <div className="grid gap-2 sm:grid-cols-3 text-xs font-semibold">
                  {selectedShop.drug_license_url && (
                    <a href={selectedShop.drug_license_url} target="_blank" rel="noopener noreferrer" className="p-2 border rounded-lg bg-muted/40 hover:bg-muted transition flex items-center justify-center gap-1.5 text-primary">
                      📄 Drug License PDF
                    </a>
                  )}
                  {selectedShop.pan_url && (
                    <a href={selectedShop.pan_url} target="_blank" rel="noopener noreferrer" className="p-2 border rounded-lg bg-muted/40 hover:bg-muted transition flex items-center justify-center gap-1.5 text-primary">
                      📄 PAN ID Document
                    </a>
                  )}
                  {selectedShop.gst_url && (
                    <a href={selectedShop.gst_url} target="_blank" rel="noopener noreferrer" className="p-2 border rounded-lg bg-muted/40 hover:bg-muted transition flex items-center justify-center gap-1.5 text-primary">
                      📄 GST Certificate
                    </a>
                  )}
                  {selectedShop.shop_photo_url && (
                    <a href={selectedShop.shop_photo_url} target="_blank" rel="noopener noreferrer" className="p-2 border rounded-lg bg-muted/40 hover:bg-muted transition flex items-center justify-center gap-1.5 text-primary sm:col-span-3">
                      🖼️ Shop Frontage Photo
                    </a>
                  )}
                </div>
              </div>

              {selectedShop.verification_status !== "pending" && (
                <div className="border-t pt-4 bg-muted/20 p-3 rounded-lg border text-xs">
                  <p className="font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Verification Audit Logs</p>
                  <p className="mt-1">
                    Reviewed by: <strong className="text-foreground">{selectedShop.verifier?.name || "System Admin"}</strong> ({selectedShop.verifier?.email || "—"})
                  </p>
                  <p className="text-muted-foreground mt-0.5">
                    Review Timestamp: {formatDate(selectedShop.verified_at || selectedShop.updated_at)}
                  </p>
                  {selectedShop.verification_status === "rejected" && (
                    <p className="mt-2 text-rose-600 font-medium bg-rose-500/10 p-2 rounded border border-rose-500/20">
                      Reason: {selectedShop.verification_notes || "No notes provided."}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-3 border-t">
              {selectedShop.verification_status === "pending" && (
                <VerificationActions shopId={selectedShop.id} />
              )}
              <Button variant="outline" onClick={() => setSelectedShop(null)}>
                Close Details
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
