"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { ChevronDownIcon, LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { organization, useSession } from "@/lib/auth-client";
import { COUNTRIES } from "@/lib/constants";
import { slugify } from "@/lib/utils";
import { checkOrganizationLimit } from "@/server/subscription";
import { Card, CardContent } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Spinner } from "../ui/spinner";
import { Textarea } from "../ui/textarea";

const formSchema = z
  .object({
    name: z.string().min(2).max(50),
    slug: z.string().min(2).max(50),
    description: z.string().min(2).max(100),
    countryCodeForNotifications: z.string(),
    phoneNumberForNotifications: z
      .string()
      .min(6, "Phone number must be at least 6 digits")
      .max(15, "Phone number must be at most 15 digits")
      .regex(/^[0-9]+$/, "Phone number must contain only digits"),
    paymentPhoneSameAsContact: z.boolean(),
    countryCodeForPayments: z.string().optional(),
    phoneNumberForPayments: z.string().optional(),
  })
  .refine(
    data => {
      if (data.paymentPhoneSameAsContact) return true;

      return (
        !!data.phoneNumberForPayments &&
        /^[0-9]+$/.test(data.phoneNumberForPayments) &&
        data.phoneNumberForPayments.length >= 6 &&
        data.phoneNumberForPayments.length <= 15 &&
        !!data.countryCodeForPayments
      );
    },
    {
      path: ["phoneNumberForPayments"],
      message:
        "Payment phone number must contain only digits and be between 6-15 digits",
    },
  );

interface RegisterStoreFormProps {
  onSuccess?: () => void;
  onCloseDialog?: () => void;
}

export function RegisterStoreForm({
  onSuccess,
  onCloseDialog,
}: RegisterStoreFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { data: session } = useSession();
  const ownerId = session?.user?.id;

  const handleUpgradeClick = () => {
    onCloseDialog?.();
    router.push("/usage/pricing");
  };

  const { data: orgLimit, isLoading } = useQuery({
    queryKey: ["orgLimit", ownerId],
    queryFn: () =>
      ownerId ? checkOrganizationLimit(ownerId) : Promise.resolve(null),
    enabled: !!ownerId,
    gcTime: 0,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      countryCodeForNotifications: "+250",
      phoneNumberForNotifications: "",
      paymentPhoneSameAsContact: false,
      countryCodeForPayments: "+250",
      phoneNumberForPayments: "",
    },
  });

  const watchedName = form.watch("name");
  const paymentPhoneSameAsContact = form.watch("paymentPhoneSameAsContact");

  useEffect(() => {
    if (watchedName) {
      const slugValue = slugify(watchedName);
      form.setValue("slug", slugValue, { shouldValidate: true });
    } else {
      form.setValue("slug", "", { shouldValidate: false });
    }
  }, [watchedName, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    startTransition(async () => {
      try {
        if (!ownerId) {
          toast.message("Please sign in first", {
            description: "You must be signed in to register a store.",
          });
          router.push("/sign-in");
          return;
        }

        const phoneForNotifications = `${values.countryCodeForNotifications} ${values.phoneNumberForNotifications}`;

        const phoneForPayments = values.paymentPhoneSameAsContact
          ? phoneForNotifications
          : `${values.countryCodeForPayments} ${values.phoneNumberForPayments}`;

        const browserTimezone =
          Intl.DateTimeFormat().resolvedOptions().timeZone;

        await organization.create({
          name: values.name,
          slug: values.slug,
          metadata: {
            description: values.description,
            phoneForNotifications,
            phoneForPayments,
            timezone: browserTimezone ?? "Africa/Kigali",
          },
        });
        toast.success("Success", {
          description: "A new store has successfully been registered ",
        });
        onSuccess?.();
        router.refresh();
      } catch (error: unknown) {
        const e = error as Error;
        console.error(e.message);
        toast.error("Failure", {
          description: e.message || "Failed to register store",
        });
      }
    });
  }

  if (isLoading) {
    return (
      <Card className="border border-dashed bg-sidebar">
        <CardContent className="flex flex-col items-center justify-center gap-2 py-8">
          <Spinner />
          <p className="text-sm text-muted-foreground font-mono tracking-tighter">
            Checking your store limits...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Form {...form}>
      {!ownerId ? (
        <Card className="border border-dashed bg-sidebar">
          <CardContent className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground text-center font-mono tracking-tighter">
              First, you need to sign in to register your store
            </p>
            <Button
              asChild
              className="w-full bg-primary text-primary-foreground"
            >
              <Link href="/sign-in" className="flex items-center gap-2">
                <LogIn />
                <span>Sign in</span>
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : !orgLimit?.canCreate ? (
        <Card className="border border-dashed bg-sidebar">
          <CardContent className="flex flex-col gap-4 py-6">
            <div className="text-center space-y-2">
              <h3 className="font-medium">
                {orgLimit?.noSubscription
                  ? "Subscription Required"
                  : "Store Limit Reached"}
              </h3>
              <p className="text-xs text-muted-foreground font-mono tracking-tighter">
                {orgLimit?.noSubscription
                  ? "You need an active subscription to create stores. Start your 14-day free trial today!"
                  : `You've reached your limit of ${orgLimit?.maxOrgs} stores on the ${orgLimit?.planName} plan.`}
              </p>
              {!orgLimit?.noSubscription && (
                <p className="text-xs text-muted-foreground font-mono tracking-tighter">
                  Current stores: {orgLimit?.currentOrgs}/{orgLimit?.maxOrgs}
                </p>
              )}
            </div>
            <Button
              onClick={handleUpgradeClick}
              className="w-full"
              variant="outline"
            >
              <span>
                {orgLimit?.noSubscription ? "View Plans" : "Upgrade Plan"}
              </span>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="My store"
                    className="placeholder:text-sm"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Slug</FormLabel>
                <FormControl>
                  <Input
                    placeholder="my-store"
                    readOnly
                    className="bg-muted cursor-not-allowed text-muted-foreground placeholder:text-sm"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Could simply be the slogan of your store."
                    className="placeholder:text-sm"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phoneNumberForNotifications"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Phone Number 1{" "}
                  <span className="text-muted-foreground text-xs font-mono tracking-tighter">
                    (for WhatsApp notifications)
                  </span>
                </FormLabel>

                <div className="flex">
                  <div className="relative">
                    <select
                      {...form.register("countryCodeForNotifications")}
                      disabled={isPending}
                      className="border-input data-placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex h-9 w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 min-w-[100px] rounded-r-none appearance-none pr-10"
                    >
                      {COUNTRIES.map(country => (
                        <option key={country.code} value={country.code}>
                          {`${country.flag} ${country.code}`}
                        </option>
                      ))}
                    </select>
                    <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 opacity-50" />
                  </div>

                  <FormControl>
                    <Input
                      className="rounded-l-none placeholder:text-sm"
                      placeholder="123456789"
                      type="tel"
                      {...field}
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="paymentPhoneSameAsContact"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <FormLabel className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isPending}
                    />
                    <span>Use this same phone number for payments</span>
                  </FormLabel>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Activity mode={paymentPhoneSameAsContact ? "hidden" : "visible"}>
            <FormField
              control={form.control}
              name="phoneNumberForPayments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Phone Number 2{" "}
                    <span className="text-muted-foreground text-xs font-mono tracking-tighter">
                      (for payments)
                    </span>
                  </FormLabel>

                  <div className="flex">
                    <div className="relative">
                      <select
                        {...form.register("countryCodeForPayments")}
                        disabled={isPending}
                        className="border-input data-placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex h-9 w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 min-w-[100px] rounded-r-none appearance-none pr-10"
                      >
                        {COUNTRIES.map(country => (
                          <option key={country.code} value={country.code}>
                            {`${country.flag} ${country.code}`}
                          </option>
                        ))}
                      </select>
                      <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 opacity-50" />
                    </div>

                    <FormControl>
                      <Input
                        className="rounded-l-none placeholder:text-sm"
                        placeholder="123456789"
                        type="tel"
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Activity>

          <Button disabled={isPending} type="submit" className="w-full mt-2">
            {isPending ? (
              <div className="flex items-center gap-2">
                <Spinner />
                <p>Registering Store...</p>
              </div>
            ) : (
              "Register Store"
            )}
          </Button>
        </form>
      )}
    </Form>
  );
}
