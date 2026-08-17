"use client";

import { AlertCircle, ArrowUpRight, Phone } from "lucide-react";
import { Activity, useActionState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPriceInRWF } from "@/lib/utils";
import { initiateMerchantWithdrawal } from "@/server/payments";
import { Spinner } from "../ui/spinner";

const MINIMUM_WITHDRAWAL = 10_000;

type WalletBalance = {
  totalCashin: number;
  totalCashout: number;
  pendingCashout: number;
  available: number;
};

type OrganizationInfo = {
  id: string;
  name: string;
  slug: string;
  phoneForPayments: string | null;
};

interface WithdrawalFormProps {
  balance: WalletBalance;
  organization: OrganizationInfo;
}

type WithdrawalState = {
  error?: string;
  success?: boolean;
  message?: string;
};

async function withdrawAction(
  _prevState: WithdrawalState,
  formData: FormData,
): Promise<WithdrawalState> {
  const organizationId = formData.get("organizationId") as string;
  const amount = parseFloat(formData.get("amount") as string);

  if (!amount || amount < MINIMUM_WITHDRAWAL)
    return {
      error: `Minimum withdrawal is ${formatPriceInRWF(MINIMUM_WITHDRAWAL)}`,
    };

  const result = await initiateMerchantWithdrawal({
    organizationId,
    amount,
  });

  if (result.error) return { error: result.error };

  return {
    success: true,
    message: result.message || "Withdrawal initiated successfully",
  };
}

export function WithdrawalForm({ balance, organization }: WithdrawalFormProps) {
  const [state, formAction, isPending] = useActionState(withdrawAction, {});

  const canWithdraw =
    balance.available >= MINIMUM_WITHDRAWAL && !!organization.phoneForPayments;

  if (!organization.phoneForPayments) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="size-5" />
            Payment Phone Required
          </CardTitle>
          <CardDescription className="font-mono tracking-tighter">
            Configure your payment phone number to receive withdrawals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="size-4" />
            <AlertTitle>No payment phone configured</AlertTitle>
            <AlertDescription className="font-mono tracking-tighter">
              Go to your store settings and add a phone number for payments.
              This is where your withdrawals will be sent.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowUpRight className="size-5" />
          Request Withdrawal
        </CardTitle>
        <CardDescription className="font-mono tracking-tighter">
          Withdraw your available balance to {organization.phoneForPayments}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-6">
          <input type="hidden" name="organizationId" value={organization.id} />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="amount">Amount (RWF)</Label>
              <span className="text-sm text-muted-foreground font-mono tracking-tighter">
                Available: {formatPriceInRWF(balance.available)}
              </span>
            </div>
            <Input
              id="amount"
              name="amount"
              type="number"
              min={MINIMUM_WITHDRAWAL}
              max={balance.available}
              step={100}
              placeholder={`Min ${formatPriceInRWF(MINIMUM_WITHDRAWAL)}`}
              className="placeholder:text-sm text-sm"
              disabled={!canWithdraw || isPending}
              required
            />
            <p className="text-xs text-muted-foreground font-mono tracking-tighter">
              Minimum withdrawal: {formatPriceInRWF(MINIMUM_WITHDRAWAL)}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Destination</Label>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
              <Phone className="size-4 text-muted-foreground" />
              <span className="font-mono tracking-tighter">
                {organization.phoneForPayments}
              </span>
            </div>
          </div>

          {state.error && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {state.success && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <AlertCircle className="size-4" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={!canWithdraw || isPending}
          >
            {isPending ? (
              <>
                <Spinner />
                Processing...
              </>
            ) : (
              <>
                <ArrowUpRight className="size-4" />
                Request Withdrawal
              </>
            )}
          </Button>

          <Activity
            mode={balance.available < MINIMUM_WITHDRAWAL ? "visible" : "hidden"}
          >
            <p className="text-center text-sm text-muted-foreground font-mono tracking-tighter">
              You need at least {formatPriceInRWF(MINIMUM_WITHDRAWAL)} to
              withdraw
            </p>
          </Activity>
        </form>
      </CardContent>
    </Card>
  );
}
